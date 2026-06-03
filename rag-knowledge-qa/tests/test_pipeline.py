"""数据 Pipeline 测试 — PDF 加载与文本清洗"""
import os
import tempfile
from src.pipeline import load_pdfs, clean_documents


def test_load_pdfs_returns_documents():
    """加载 PDF 应返回 LangChain Document 列表"""
    pdf_dir = "./data/pdfs"
    if not os.path.exists(pdf_dir) or not os.listdir(pdf_dir):
        import pytest
        pytest.skip("PDF 目录为空，跳过测试")

    docs = load_pdfs(pdf_dir)
    assert len(docs) > 0
    for doc in docs:
        assert hasattr(doc, "page_content")
        assert hasattr(doc, "metadata")
        assert len(doc.page_content.strip()) > 0


def test_load_pdfs_preserves_metadata():
    """加载 PDF 应保留文件名和页码等元数据"""
    pdf_dir = "./data/pdfs"
    if not os.path.exists(pdf_dir) or not os.listdir(pdf_dir):
        import pytest
        pytest.skip("PDF 目录为空，跳过测试")

    docs = load_pdfs(pdf_dir)
    for doc in docs:
        assert "source" in doc.metadata, f"缺少 source 字段: {doc.metadata}"
        assert "page" in doc.metadata, f"缺少 page 字段: {doc.metadata}"


def test_clean_documents_removes_extra_whitespace():
    """文本清洗应去除多余空白"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="  这是  多余   空白  \n\n\n  的文本  ",
            metadata={"source": "test.pdf", "page": 1},
        )
    ]
    cleaned = clean_documents(docs)
    content = cleaned[0].page_content
    assert "  " not in content  # 无连续空格
    assert "\n\n\n" not in content  # 无连续换行


def test_clean_documents_preserves_metadata():
    """文本清洗不应修改元数据"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="测试内容文本长度足够通过过滤",
            metadata={"source": "test.pdf", "page": 1},
        )
    ]
    cleaned = clean_documents(docs)
    assert cleaned[0].metadata["source"] == "test.pdf"
    assert cleaned[0].metadata["page"] == 1
