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
        temp_rag_chain = RAGChain(top_k=request.top_k)

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
                # 尝试直接在当前目录的data/pdfs中查找
                fallback_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "pdfs", filename)
                if not os.path.exists(fallback_path) or not os.path.isfile(fallback_path):
                    # 尝试匹配部分文件名
                    import glob
                    pdf_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "pdfs")
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

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")


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
