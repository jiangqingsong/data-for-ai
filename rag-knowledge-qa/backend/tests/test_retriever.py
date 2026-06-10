"""检索器测试 — 相似度检索"""
import os
from src.retriever import Retriever


def test_retriever_creation_with_persist_dir():
    """从已有 Chroma 目录创建 Retriever"""
    persist_dir = "./data/chroma_db"
    if not os.path.exists(persist_dir) or not os.listdir(persist_dir):
        import pytest
        pytest.skip("Chroma 数据目录为空，请先运行 pipeline")

    retriever = Retriever(persist_dir=persist_dir)
    assert retriever is not None
    assert retriever.vectorstore is not None


def test_similarity_search_returns_documents():
    """相似度检索应返回文档列表"""
    persist_dir = "./data/chroma_db"
    if not os.path.exists(persist_dir) or not os.listdir(persist_dir):
        import pytest
        pytest.skip("Chroma 数据目录为空，请先运行 pipeline")

    retriever = Retriever(persist_dir=persist_dir)
    results = retriever.similarity_search("牛顿第一定律", top_k=3)
    assert len(results) > 0
    assert len(results) <= 3
    for doc in results:
        assert hasattr(doc, "page_content")
        assert hasattr(doc, "metadata")


def test_similarity_search_respects_top_k():
    """检索结果数量应不超过 top_k"""
    persist_dir = "./data/chroma_db"
    if not os.path.exists(persist_dir) or not os.listdir(persist_dir):
        import pytest
        pytest.skip("Chroma 数据目录为空，请先运行 pipeline")

    retriever = Retriever(persist_dir=persist_dir)
    for k in [1, 2, 4]:
        results = retriever.similarity_search("物理", top_k=k)
        assert len(results) <= k
