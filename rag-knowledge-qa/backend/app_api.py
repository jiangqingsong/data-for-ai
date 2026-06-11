"""RAG 知识库问答系统 - FastAPI 后端 API

提供 RESTful API 接口，供前端界面调用
"""
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from functools import lru_cache

# 导入优化配置
from fast_api_optimizations import create_optimized_app, async_cached_function

from src.rag_chain import RAGChain
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
