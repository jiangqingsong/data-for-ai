"""检索器模块 — 支持多种检索策略"""
import os
from typing import List

from langchain_chroma import Chroma
from langchain_core.documents import Document


class Retriever:
    """RAG 检索器，封装 Chroma 向量检索

    支持的检索策略:
      - similarity_search: 余弦相似度检索（第1周）
      - mmr_search: 最大边际相关性检索（第2周）
      - hybrid_search: 混合检索（第2周可选）
    """

    def __init__(
        self,
        persist_dir: str = "../data/chroma_db",
        embedding_model: str | None = None,
    ):
        from src.config import Config
        from langchain_openai import OpenAIEmbeddings

        if embedding_model is None:
            embedding_model = Config.EMBEDDING_API_MODEL

        embeddings = OpenAIEmbeddings(
            model=embedding_model,
            openai_api_key=Config.DEEPSEEK_API_KEY,
            openai_api_base=Config.DEEPSEEK_BASE_URL,
            tiktoken_enabled=False,  # 火山引擎 API 不接受 token IDs，传原始文本
            check_embedding_ctx_length=False,
        )

        self.vectorstore = Chroma(
            persist_directory=persist_dir,
            embedding_function=embeddings,
        )

    def similarity_search(
        self, query: str, top_k: int = 4
    ) -> List[Document]:
        """余弦相似度检索 — 最基础的向量检索方式

        Args:
            query: 用户问题
            top_k: 返回结果数量

        Returns:
            最相关的 top_k 个文档块
        """
        results = self.vectorstore.similarity_search(query, k=top_k)
        return results

    def mmr_search(
        self,
        query: str,
        top_k: int = 4,
        fetch_k: int = 10,
        lambda_mult: float = 0.5,
    ) -> List[Document]:
        """MMR (最大边际相关性) 检索 — 平衡相关性与多样性

        Args:
            query: 用户问题
            top_k: 最终返回数量
            fetch_k: 候选池大小（先检索这么多再 MMR 筛选）
            lambda_mult: 0~1, 越大越看重相关性, 越小越看重多样性

        Returns:
            多样性更好的 top_k 个文档块
        """
        results = self.vectorstore.max_marginal_relevance_search(
            query, k=top_k, fetch_k=fetch_k, lambda_mult=lambda_mult
        )
        return results

    def get_retriever(self, search_type: str = "similarity", top_k: int = 4):
        """获取 LangChain Retriever 接口，用于 Chain 中

        Args:
            search_type: "similarity" 或 "mmr"
            top_k: 检索数量

        Returns:
            LangChain BaseRetriever 实例
        """
        search_kwargs = {"k": top_k}
        if search_type == "mmr":
            search_kwargs["fetch_k"] = top_k * 3
            search_kwargs["lambda_mult"] = 0.5

        return self.vectorstore.as_retriever(
            search_type=search_type,
            search_kwargs=search_kwargs,
        )

    def get_vector_count(self) -> int:
        """获取向量库中的向量数量

        Returns:
            向量数量
        """
        try:
            # 获取向量库中的所有文档
            count = self.vectorstore._collection.count()
            return count
        except Exception as e:
            print(f"获取向量数量失败: {e}")
            return 0


# ============================================================
# Task 9: 检索策略对比实验
# ============================================================

def run_retrieval_comparison(
    retriever: "Retriever",
    queries: List[str],
    top_k: int = 4,
) -> list[dict]:
    """检索策略对比实验 — 同一批查询用相似度 vs MMR，记录结果

    Args:
        retriever: Retriever 实例
        queries: 测试问题列表
        top_k: 检索数量

    Returns:
        [{"query": str, "similarity": [...], "mmr": [...], "overlap": int}, ...]
    """
    results = []
    for query in queries:
        sim_results = retriever.similarity_search(query, top_k=top_k)
        mmr_results = retriever.mmr_search(query, top_k=top_k)

        # 计算两个策略的页面重叠数
        sim_pages = {doc.metadata.get("page") for doc in sim_results}
        mmr_pages = {doc.metadata.get("page") for doc in mmr_results}
        overlap = len(sim_pages & mmr_pages)

        results.append({
            "query": query,
            "similarity": [
                {
                    "content": doc.page_content[:100],
                    "source": doc.metadata.get("source"),
                    "page": doc.metadata.get("page"),
                }
                for doc in sim_results
            ],
            "mmr": [
                {
                    "content": doc.page_content[:100],
                    "source": doc.metadata.get("source"),
                    "page": doc.metadata.get("page"),
                }
                for doc in mmr_results
            ],
            "overlap_pages": overlap,
        })

    # 打印对比汇总
    print("\n" + "=" * 55)
    print("检索策略对比: Similarity vs MMR")
    print("=" * 55)
    for r in results:
        sim_pages = [s["page"] for s in r["similarity"]]
        mmr_pages = [s["page"] for s in r["mmr"]]
        print(f"\n  查询: {r['query'][:40]}")
        print(f"  Similarity 页面: {sim_pages}")
        print(f"  MMR 页面:        {mmr_pages}")
        print(f"  重叠页面数:      {r['overlap_pages']}/{top_k}")
    print("=" * 55)

    return results
