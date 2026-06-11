"""RAG 知识库问答系统 - FastAPI 后端 API

提供 RESTful API 接口，供前端界面调用
"""
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import os
import shutil
import glob
import re
import fitz
from datetime import datetime
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor

# 导入优化配置
from fast_api_optimizations import create_optimized_app, async_cached_function

from src.rag_chain import RAGChain
from src.retriever import Retriever
from src.config import Config


# 创建优化后的 FastAPI 应用
app = create_optimized_app("RAG 知识库问答系统 API", "1.0.0")

# 全局 RAG 链实例
rag_chain: Optional[RAGChain] = None

# 响应缓存
from functools import lru_cache
import hashlib

# 缓存配置
CACHE_SIZE = 100
CACHE_TTL = 3600  # 1小时


class QuestionRequest(BaseModel):
    """提问请求模型"""
    question: str
    top_k: Optional[int] = 4
    search_type: str = "similarity"
    subdir: Optional[str] = None  # PDF_BASE_DIR 下的子目录，选择对应的向量库


class AnswerResponse(BaseModel):
    """回答响应模型"""
    question: str
    answer: str
    sources: list[Dict[str, Any]]
    context_docs: list[Dict[str, Any]]


class SystemStatusResponse(BaseModel):
    """系统状态响应模型"""
    status: str
    version: str
    vector_count: int
    document_count: int
    ragas_scores: Dict[str, float]


class KnowledgeBaseInfo(BaseModel):
    """知识库信息"""
    name: str
    doc_count: int
    vector_count: int
    created_at: str


class CreateKBRequest(BaseModel):
    """创建知识库请求"""
    name: str


# Pipeline 运行状态追踪
_running_pipelines: Dict[str, bool] = {}
_pipeline_progress: Dict[str, dict] = {}
_pipeline_executor = ThreadPoolExecutor(max_workers=2)


@app.on_event("startup")
async def startup_event():
    """启动时初始化 RAG 链"""
    global rag_chain

    try:
        print("正在初始化 RAG 链...")

        # 检查配置
        errors = Config.validate()
        if errors:
            raise RuntimeError(f"配置错误: {'; '.join(errors)}")

        rag_chain = RAGChain()
        print("RAG 链初始化完成!")

    except Exception as e:
        print(f"初始化失败: {e}")
        raise


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


@app.get("/api/system/status", response_model=SystemStatusResponse)
@async_cached_function(cache_size=10)
async def get_system_status():
    """获取系统状态"""
    try:
        # 获取向量库统计信息
        vector_count = rag_chain.retriever.get_vector_count() if rag_chain else 0

        # 模拟文档数量
        document_count = 2  # 来自 9年级物理和8年级物理 PDF

        # RAGAS 基线分数
        ragas_scores = {
            "faithfulness": 0.9375,
            "answer_relevancy": 0.9083,
            "context_recall": 0.2375,
            "context_precision": 0.7875
        }

        return SystemStatusResponse(
            status="running" if rag_chain else "unavailable",
            version="1.0.0",
            vector_count=vector_count,
            document_count=document_count,
            ragas_scores=ragas_scores
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取系统状态失败: {str(e)}")


@app.post("/api/chat", response_model=AnswerResponse)
async def chat(request: QuestionRequest):
    """提问并获取回答"""
    try:
        if not rag_chain:
            raise HTTPException(status_code=503, detail="RAG 链未初始化")

        if not request.question.strip():
            raise HTTPException(status_code=400, detail="问题不能为空")

        # 使用指定的参数创建临时 RAG 链
        temp_rag_chain = RAGChain(top_k=request.top_k, subdir=request.subdir)

        # 调用 RAG 链
        result = temp_rag_chain.ask(
            question=request.question,
            search_type=request.search_type
        )

        # 将 Document 对象转换为字典
        if 'context_docs' in result and result['context_docs']:
            result['context_docs'] = [
                {
                    'page_content': doc.page_content,
                    'metadata': doc.metadata,
                    'id': doc.id
                } for doc in result['context_docs']
            ]

        return AnswerResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"问答失败: {str(e)}")


@app.get("/api/knowledge/stats")
@async_cached_function(cache_size=10)
async def get_knowledge_stats():
    """获取知识库统计信息"""
    try:
        vector_count = rag_chain.retriever.get_vector_count() if rag_chain else 0

        return {
            "vector_count": vector_count,
            "document_count": 2,
            "chunk_count": vector_count  # 每个向量对应一个 chunk
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@app.get("/api/download-pdf")
async def download_pdf(filename: str):
    """下载PDF文件"""
    try:
        from src.config import Config
        import os
        import re
        from fastapi.responses import FileResponse

        # 确保文件名安全，防止路径遍历
        if ".." in filename or os.path.isabs(filename):
            raise HTTPException(status_code=400, detail="非法的文件名")

        # 处理可能的编码问题
        # 文件名编码处理
        try:
            filename = filename.encode('latin1').decode('utf-8')
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass

        # 替换文件名中的特殊字符
        filename = re.sub(r'[^一-龥a-zA-Z0-9.-_]', '', filename)

        # 构建完整路径
        file_path = os.path.join(Config.PDF_DIR, filename)

        # 检查文件是否存在
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            # 尝试相对路径
            file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), Config.PDF_DIR, filename)
            if not os.path.exists(file_path) or not os.path.isfile(file_path):
                # 尝试使用 PDF_BASE_DIR 相对路径查找
                fallback_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), Config.PDF_BASE_DIR, filename)
                if not os.path.exists(fallback_path) or not os.path.isfile(fallback_path):
                    # 尝试匹配部分文件名
                    import glob
                    pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), Config.PDF_BASE_DIR)
                    matching_files = glob.glob(os.path.join(pdf_dir, f"*{filename}*"))
                    if not matching_files:
                        # 尝试移除扩展名匹配
                        filename_no_ext = os.path.splitext(filename)[0]
                        matching_files = glob.glob(os.path.join(pdf_dir, f"*{filename_no_ext}*.pdf"))
                    if matching_files:
                        file_path = matching_files[0]
                    else:
                        raise HTTPException(status_code=404, detail=f"文件 {filename} 不存在")
                else:
                    file_path = fallback_path

        # 检查文件扩展名
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="只允许下载PDF文件")

        # 返回文件下载响应
        return FileResponse(
            path=file_path,
            filename=os.path.basename(file_path),
            media_type="application/pdf"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下载文件失败: {str(e)}")


@app.get("/api/test-pdf-path")
async def test_pdf_path(filename: str):
    """测试PDF文件路径调试端点"""
    try:
        from src.config import Config
        import os

        # 构建各种可能的路径
        paths = {
            "config_path": Config.PDF_DIR,
            "filename": filename,
            "os_abs_config": os.path.abspath(Config.PDF_DIR),
            "join_config": os.path.join(Config.PDF_DIR, filename),
            "join_abs_config": os.path.abspath(os.path.join(Config.PDF_DIR, filename)),
            "join_cwd": os.path.join(os.getcwd(), filename),
            "join_data_pdfs": os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "pdfs", filename),
        }

        # 检查每个路径是否存在
        for key, path in paths.items():
            paths[key] = f"{path} — {'存在' if os.path.exists(path) else '不存在'}"

        return paths

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"路径测试失败: {str(e)}")


@app.get("/api/documents")
async def list_documents():
    """列出所有已绑定的 PDF 文档及其页数"""
    try:
        from src.config import Config
        import os
        import glob
        import fitz

        pdf_dir = Config.PDF_DIR
        if not os.path.isabs(pdf_dir):
            pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_dir)

        pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
        documents = []

        for filepath in pdf_files:
            filename = os.path.basename(filepath)
            try:
                doc = fitz.open(filepath)
                page_count = len(doc)
                size_bytes = os.path.getsize(filepath)
                doc.close()
                documents.append({
                    "filename": filename,
                    "page_count": page_count,
                    "size_bytes": size_bytes,
                })
            except Exception as e:
                documents.append({
                    "filename": filename,
                    "page_count": 0,
                    "size_bytes": os.path.getsize(filepath),
                    "error": str(e),
                })

        return {"documents": documents}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文档列表失败: {str(e)}")


def _clean_page_text(text: str) -> str:
    """清洗PDF提取文本：移除乱码字符，保留教材原有分段和标题层级"""
    import re

    # 移除连续的特殊字符（2个以上连续的非中英文/数字/标点符号）
    text = re.sub(r'[!#$%&*@^~{}|\\<>?/\'"]{2,}', '', text)
    # 移除孤立的特殊字符（前后无中英文的单个特殊字符）
    text = re.sub(r'(?<![一-龥a-zA-Z0-9])([!#$%&*])(?![一-龥a-zA-Z0-9])', '', text)
    # 合并3个以上连续空行为双空行（保留段落间距）
    text = re.sub(r'\n{4,}', '\n\n\n', text)
    # 移除行首尾多余空格但保留缩进
    text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)
    # 压缩多个空格为单个（保留中文间无空格特性）
    text = re.sub(r' {2,}', ' ', text)

    return text.strip()


@app.get("/api/document/page")
async def get_document_page(filename: str, page: int = 0):
    """获取指定文档指定页的原文内容"""
    try:
        from src.config import Config
        import os
        import re
        import glob
        import fitz

        # 安全检查
        if ".." in filename or os.path.isabs(filename):
            raise HTTPException(status_code=400, detail="非法的文件名")

        # 文件名解码
        try:
            filename = filename.encode('latin1').decode('utf-8')
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass

        filename = re.sub(r'[^一-龥a-zA-Z0-9.\-_（）()]', '', filename)

        # 路径解析（复用 download-pdf 的逻辑）
        pdf_dir = Config.PDF_DIR
        if not os.path.isabs(pdf_dir):
            pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_dir)

        file_path = os.path.join(pdf_dir, filename)

        if not os.path.exists(file_path):
            # 尝试模糊匹配
            matching = glob.glob(os.path.join(pdf_dir, f"*{filename}*"))
            if not matching:
                filename_no_ext = os.path.splitext(filename)[0]
                matching = glob.glob(os.path.join(pdf_dir, f"*{filename_no_ext}*.pdf"))
            if matching:
                file_path = matching[0]
            else:
                raise HTTPException(status_code=404, detail=f"文件 {filename} 不存在")

        # 打开 PDF 读取指定页
        doc = fitz.open(file_path)
        total_pages = len(doc)

        if page < 0 or page >= total_pages:
            doc.close()
            raise HTTPException(status_code=400, detail=f"页码超出范围: {page} (共 {total_pages} 页)")

        page_text = _clean_page_text(doc[page].get_text())
        doc.close()

        return {
            "filename": os.path.basename(file_path),
            "page": page,
            "page_text": page_text,
            "total_pages": total_pages,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取页面内容失败: {str(e)}")


@app.get("/api/knowledge/suggested-questions")
async def get_suggested_questions():
    """从已索引的PDF教材中提取章节标题，生成推荐问题列表

    实现逻辑：
      1. 遍历 PDF 目录下的所有 PDF 文件
      2. 用 pymupdf 提取 TOC（目录）中的章节标题
      3. 过滤噪音（水印、前言、目录页等）
      4. 将章节标题转化为自然语言问句
      5. TOC 质量差时回退到文本模式：匹配 "第X章" 等标题行
    """
    try:
        from src.config import Config
        import os
        import glob
        import fitz
        import re

        pdf_dir = Config.PDF_DIR
        if not os.path.isabs(pdf_dir):
            pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_dir)

        pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
        if not pdf_files:
            return {"questions": [], "source": "无已索引文档"}

        # 噪音关键词（水印、出版信息、非教学内容）
        NOISE_PATTERNS = [
            r'微信', r'公众号', r'电子课本', r'大全',
            r'主编', r'出版', r'ISBN', r'版权', r'前言',
            r'目录', r'索引', r'附录', r'参考',
            r'同学们', r'欢迎',
            r'^\d+$',  # 纯数字
            r'^[·\s]+$',  # 纯标点/空格
        ]
        noise_re = re.compile('|'.join(NOISE_PATTERNS))

        # 控制字符/PDF 内嵌字体垃圾
        GARBAGE_RE = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')

        # 章节标题特征模式
        CHAPTER_PATTERNS = [
            re.compile(r'^第[一二三四五六七八九十\d]+章\s*'),
            re.compile(r'^第[一二三四五六七八九十\d]+节\s*'),
            re.compile(r'^\d+[\.\s、]+\d+[\.\s、]+'),  # 1.1 1.2
            re.compile(r'^\d+[\.\s、]+'),  # 1. 2.
        ]

        def is_noise(text):
            if bool(noise_re.search(text)):
                return True
            # 过滤含控制字符的行（PDF字体编码垃圾）
            if GARBAGE_RE.search(text):
                return True
            # 过滤汉字占比过低的（内嵌字体乱码）
            chinese = len(re.findall(r'[一-鿿]', text))
            total = len(text.replace(' ', ''))
            if total > 10 and chinese / max(total, 1) < 0.2:
                return True
            return False

        def is_chapter_title(text):
            clean = text.strip()
            if len(clean) < 4 or len(clean) > 50:
                return False
            if is_noise(clean):
                return False
            # 至少匹配一种章节模式
            for pat in CHAPTER_PATTERNS:
                if pat.match(clean):
                    return True
            return False

        titles = []

        for filepath in pdf_files:
            doc = fitz.open(filepath)
            toc = doc.get_toc()
            toc_quality = 0

            if toc and len(toc) > 0:
                for item in toc:
                    level, title, page = item[0], item[1], item[2]
                    if level > 2:
                        continue
                    clean = title.strip()
                    if is_chapter_title(clean):
                        # 去掉编号前缀保留标题文字
                        for pat in CHAPTER_PATTERNS:
                            clean = pat.sub('', clean)
                        clean = clean.strip()
                        if clean and clean not in titles and not is_noise(clean):
                            titles.append(clean)
                            toc_quality += 1

            # TOC 质量不够 → 回退到文本扫描
            if toc_quality < 3:
                for page_num in range(min(20, len(doc))):
                    text = doc[page_num].get_text()
                    lines = [l.strip() for l in text.split('\n') if l.strip()]
                    for line in lines:
                        if is_chapter_title(line):
                            clean = line.strip()
                            for pat in CHAPTER_PATTERNS:
                                clean = pat.sub('', clean)
                            clean = clean.strip()
                            if clean and clean not in titles and not is_noise(clean):
                                titles.append(clean)

            doc.close()

        # 去重
        seen = set()
        unique_titles = []
        for t in titles:
            if t not in seen:
                seen.add(t)
                unique_titles.append(t)

        # 转为问句形式，取前8个
        questions = []
        question_prefixes = ["什么是", "如何理解", "怎样计算", "简述", "请解释"]
        for i, title in enumerate(unique_titles[:8]):
            prefix = question_prefixes[i % len(question_prefixes)]
            if title.endswith('？') or title.endswith('?'):
                questions.append(title)
            elif len(title) > 15:
                questions.append(f"请介绍：{title}")
            else:
                questions.append(f"{prefix}{title}？")

        return {
            "questions": questions,
            "source": f"来自 {len(pdf_files)} 本教材目录",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取推荐问题失败: {str(e)}")


# ============================================================
# 知识库管理 API
# ============================================================

def _validate_kb_name(name: str) -> str:
    """校验知识库名称，返回错误信息或空字符串"""
    if not name or not name.strip():
        return "知识库名称不能为空"
    name = name.strip()
    if any(c in name for c in ['/', '\\', '..']):
        return "知识库名称包含非法字符"
    if len(name) > 50:
        return "知识库名称不能超过50个字符"
    return ""


def _get_kb_stats(name: str) -> dict:
    """获取单个知识库的文档数和向量数"""
    pdf_dir = Config.get_pdf_dir(name)
    documents = []
    doc_count = 0
    if os.path.isdir(pdf_dir):
        pdf_files = sorted(glob.glob(os.path.join(pdf_dir, "*.pdf")))
        doc_count = len(pdf_files)
        for fp in pdf_files:
            fname = os.path.basename(fp)
            fsize = os.path.getsize(fp)
            pages = 0
            try:
                doc = fitz.open(fp)
                pages = len(doc)
                doc.close()
            except Exception:
                pass
            documents.append({
                "filename": fname,
                "size_bytes": fsize,
                "page_count": pages,
            })

    vector_count = 0
    chunks = []
    try:
        r = Retriever(subdir=name)
        vector_count = r.get_vector_count()
        collection_data = r.vectorstore._collection.get(include=["metadatas", "documents"])
        if collection_data and collection_data.get("ids"):
            for i, cid in enumerate(collection_data["ids"]):
                meta = (collection_data["metadatas"] or [{}])[i] if collection_data.get("metadatas") else {}
                text = (collection_data["documents"] or [""])[i] if collection_data.get("documents") else ""
                chunks.append({
                    "id": cid,
                    "content": (text or "")[:200],
                    "source": meta.get("source", ""),
                    "page": meta.get("page", ""),
                })
    except Exception:
        pass

    return {
        "doc_count": doc_count,
        "vector_count": vector_count,
        "documents": documents,
        "chunks": chunks,
    }


@app.get("/api/knowledge-bases")
async def list_knowledge_bases():
    """列出所有知识库"""
    try:
        pdf_base = Config.PDF_BASE_DIR
        if not os.path.isabs(pdf_base):
            pdf_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_base)

        if not os.path.isdir(pdf_base):
            return {"knowledge_bases": []}

        kbs = []
        for entry in sorted(os.listdir(pdf_base)):
            entry_path = os.path.join(pdf_base, entry)
            if not os.path.isdir(entry_path):
                continue
            # 跳过隐藏目录和非知识库目录
            if entry.startswith('.'):
                continue

            stats = _get_kb_stats(entry)
            kbs.append(KnowledgeBaseInfo(
                name=entry,
                doc_count=stats["doc_count"],
                vector_count=stats["vector_count"],
                created_at=datetime.fromtimestamp(os.path.getctime(entry_path)).isoformat(),
            ))

        return {"knowledge_bases": [kb.model_dump() for kb in kbs]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库列表失败: {str(e)}")


@app.post("/api/knowledge-bases")
async def create_knowledge_base(request: CreateKBRequest):
    """创建新知识库"""
    try:
        name = request.name.strip()
        err = _validate_kb_name(name)
        if err:
            raise HTTPException(status_code=400, detail=err)

        pdf_base = Config.PDF_BASE_DIR
        if not os.path.isabs(pdf_base):
            pdf_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_base)

        pdf_dir = os.path.join(pdf_base, name)
        chroma_dir = Config.get_chroma_dir(name)
        if not os.path.isabs(chroma_dir):
            chroma_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), chroma_dir)

        if os.path.exists(pdf_dir):
            raise HTTPException(status_code=409, detail=f"知识库 '{name}' 已存在")

        os.makedirs(pdf_dir, exist_ok=True)
        os.makedirs(chroma_dir, exist_ok=True)

        return {"name": name, "status": "created"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建知识库失败: {str(e)}")


@app.delete("/api/knowledge-bases/{name}")
async def delete_knowledge_base(name: str):
    """删除知识库及其所有数据"""
    try:
        err = _validate_kb_name(name)
        if err:
            raise HTTPException(status_code=400, detail=err)

        pdf_base = Config.PDF_BASE_DIR
        if not os.path.isabs(pdf_base):
            pdf_base = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_base)

        pdf_dir = os.path.join(pdf_base, name)
        chroma_dir = Config.get_chroma_dir(name)
        if not os.path.isabs(chroma_dir):
            chroma_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), chroma_dir)

        if not os.path.exists(pdf_dir):
            raise HTTPException(status_code=404, detail=f"知识库 '{name}' 不存在")

        shutil.rmtree(pdf_dir)
        if os.path.exists(chroma_dir):
            shutil.rmtree(chroma_dir, ignore_errors=True)

        return {"name": name, "status": "deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除知识库失败: {str(e)}")


@app.get("/api/knowledge-bases/{name}/stats")
async def get_knowledge_base_stats(name: str):
    """获取单个知识库统计"""
    try:
        err = _validate_kb_name(name)
        if err:
            raise HTTPException(status_code=400, detail=err)

        stats = _get_kb_stats(name)
        return {"name": name, **stats}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取知识库统计失败: {str(e)}")


@app.post("/api/knowledge-bases/{name}/upload")
async def upload_document_to_kb(name: str, file: UploadFile = File(...)):
    """上传PDF到指定知识库"""
    try:
        err = _validate_kb_name(name)
        if err:
            raise HTTPException(status_code=400, detail=err)

        if not file.filename or not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="仅支持上传 PDF 文件")

        # 安全文件名
        safe_name = os.path.basename(file.filename)
        safe_name = re.sub(r'[^一-龥a-zA-Z0-9.\-_（）()]', '', safe_name)
        if not safe_name:
            raise HTTPException(status_code=400, detail="文件名无效")

        pdf_dir = Config.get_pdf_dir(name)
        if not os.path.isabs(pdf_dir):
            pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_dir)
        os.makedirs(pdf_dir, exist_ok=True)

        filepath = os.path.join(pdf_dir, safe_name)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)

        # 获取页数
        page_count = 0
        try:
            doc = fitz.open(filepath)
            page_count = len(doc)
            doc.close()
        except Exception:
            pass

        return {
            "filename": safe_name,
            "size_bytes": len(content),
            "page_count": page_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传文件失败: {str(e)}")


@app.post("/api/knowledge-bases/{name}/pipeline")
async def trigger_pipeline(name: str):
    """手动触发知识库 Pipeline"""
    try:
        err = _validate_kb_name(name)
        if err:
            raise HTTPException(status_code=400, detail=err)

        if _running_pipelines.get(name):
            raise HTTPException(status_code=409, detail=f"知识库 '{name}' 的 Pipeline 正在运行中")

        pdf_dir = Config.get_pdf_dir(name)
        if not os.path.isabs(pdf_dir):
            pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), pdf_dir)

        pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
        if not pdf_files:
            raise HTTPException(status_code=400, detail=f"知识库 '{name}' 中没有 PDF 文件")

        _running_pipelines[name] = True
        _pipeline_progress[name] = {"step": "starting", "message": "正在启动 Pipeline...", "progress_pct": 0}

        def _run():
            try:
                from src.pipeline import load_pdfs, clean_documents, split_documents, build_vectorstore

                _pipeline_progress[name] = {"step": "loading", "message": "正在加载 PDF...", "progress_pct": 5}
                docs = load_pdfs(pdf_dir)
                if not docs:
                    _pipeline_progress[name] = {"step": "error", "message": "未找到可处理的 PDF 文件", "progress_pct": 0}
                    return

                _pipeline_progress[name] = {"step": "cleaning", "message": "正在清洗文本...", "progress_pct": 25}
                docs = clean_documents(docs)

                _pipeline_progress[name] = {"step": "splitting", "message": "正在分块...", "progress_pct": 45}
                chunks = split_documents(docs)

                _pipeline_progress[name] = {"step": "embedding", "message": f"正在向量化（共 {len(chunks)} 个块，可能需要几分钟）...", "progress_pct": 60}
                chroma_dir = Config.get_chroma_dir(name)
                build_vectorstore(chunks, chroma_dir)

                _pipeline_progress[name] = {"step": "done", "message": f"Pipeline 完成 — {len(docs)} 页 → {len(chunks)} 个向量块", "progress_pct": 100}
            except Exception as e:
                _pipeline_progress[name] = {"step": "error", "message": f"Pipeline 失败: {str(e)}", "progress_pct": 0}
            finally:
                _running_pipelines[name] = False

        _pipeline_executor.submit(_run)

        return {"status": "started", "name": name}

    except HTTPException:
        raise
    except Exception as e:
        _running_pipelines.pop(name, None)
        raise HTTPException(status_code=500, detail=f"启动 Pipeline 失败: {str(e)}")


@app.get("/api/knowledge-bases/{name}/pipeline/status")
async def get_pipeline_status(name: str):
    """查询 Pipeline 运行状态和进度"""
    err = _validate_kb_name(name)
    if err:
        raise HTTPException(status_code=400, detail=err)

    is_running = _running_pipelines.get(name, False)
    progress = _pipeline_progress.get(name, {"step": "idle", "message": "", "progress_pct": 0})

    return {
        "name": name,
        "is_running": is_running,
        "step": progress.get("step", "idle"),
        "message": progress.get("message", ""),
        "progress_pct": progress.get("progress_pct", 0),
    }


if __name__ == "__main__":
    import uvicorn

    # 运行服务器
    uvicorn.run(
        "app_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["src", "."]
    )
