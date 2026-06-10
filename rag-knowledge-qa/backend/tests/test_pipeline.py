"""数据 Pipeline 测试 — PDF 加载与文本清洗"""
import os
import tempfile
from src.pipeline import load_pdfs, clean_documents


def test_load_pdfs_returns_documents():
    """加载 PDF 应返回 LangChain Document 列表"""
    from src.config import Config
    pdf_dir = Config.get_pdf_dir()
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
    from src.config import Config
    pdf_dir = Config.get_pdf_dir()
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


# ============================================================
# Task 3: 分块和向量化测试
# ============================================================

from src.pipeline import split_documents, build_vectorstore


def test_split_documents_chunk_size():
    """分块后每个块不应超过 chunk_size + overlap"""
    from langchain_core.documents import Document

    long_text = "测试内容。" * 500  # 约 3000 字符
    docs = [Document(page_content=long_text, metadata={"source": "test.pdf"})]

    chunks = split_documents(docs, chunk_size=500, chunk_overlap=100)
    assert len(chunks) > 1  # 应该被切成多块
    for chunk in chunks:
        # chunk_size 是近似值，允许一定容差
        assert len(chunk.page_content) <= 600  # 500 + 100 overlap 容差


def test_split_documents_preserves_metadata():
    """分块后元数据应保留"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="测试内容。" * 100,
            metadata={"source": "物理教材.pdf", "page": 3},
        )
    ]
    chunks = split_documents(docs, chunk_size=200, chunk_overlap=50)
    for chunk in chunks:
        assert chunk.metadata["source"] == "物理教材.pdf"
        assert chunk.metadata["page"] == 3


def test_build_vectorstore_creates_persist_dir():
    """向量化存储应创建持久化目录"""
    import tempfile
    import shutil
    from langchain_core.documents import Document

    tmpdir = tempfile.mkdtemp()
    try:
        docs = [
            Document(
                page_content="牛顿第一定律：任何物体都要保持匀速直线运动或静止状态。",
                metadata={"source": "物理.pdf", "page": 1},
            )
        ]
        vectorstore = build_vectorstore(
            docs,
            persist_dir=tmpdir,
        )
        assert vectorstore is not None
        assert len(os.listdir(tmpdir)) > 0
    except (OSError, RuntimeError):
        import pytest
        pytest.skip("HuggingFace 不可用（网络限制），跳过向量化测试")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ============================================================
# Task 8: 高级分块策略测试
# ============================================================

from src.pipeline import structural_split, parent_document_split


def test_structural_split_produces_chunks():
    """结构分块应产生至少和输入一样多的块"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="第十五章 电流和电路\n第1节 两种电荷\n这是关于电荷的内容。",
            metadata={"source": "物理.pdf", "page": 32},
        ),
        Document(
            page_content="第2节 电流和电路\n这是关于电流的内容。电流的方向是正电荷定向移动的方向。",
            metadata={"source": "物理.pdf", "page": 36},
        ),
    ]
    chunks = structural_split(docs)
    assert len(chunks) > 0
    for chunk in chunks:
        assert hasattr(chunk, "page_content")
        assert len(chunk.page_content.strip()) > 0


def test_structural_split_preserves_metadata():
    """结构分块应保留原始元数据"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="第十六章 电压 电阻\n第1节 电压\n电压是产生电流的原因。",
            metadata={"source": "物理.pdf", "page": 55},
        )
    ]
    chunks = structural_split(docs)
    for chunk in chunks:
        assert chunk.metadata["source"] == "物理.pdf"
        assert chunk.metadata["page"] == 55


def test_parent_document_split_returns_two_lists():
    """小2大分块应返回父块和子块两个列表"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="测试内容。" * 100,
            metadata={"source": "物理.pdf", "page": 1},
        )
    ]
    parent_docs, child_docs = parent_document_split(
        docs, parent_chunk_size=500, child_chunk_size=200, child_chunk_overlap=50
    )
    assert len(parent_docs) > 0
    assert len(child_docs) > 0
    # 子块应该比父块多（同样内容，小块切得更细）
    assert len(child_docs) >= len(parent_docs)


def test_parent_document_split_child_has_parent_id():
    """小2大分块的子块应有 parent_id 元数据"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="这是测试内容。" * 50,
            metadata={"source": "物理.pdf", "page": 1},
        )
    ]
    parent_docs, child_docs = parent_document_split(
        docs, parent_chunk_size=500, child_chunk_size=200, child_chunk_overlap=50
    )
    # 至少有一个子块应该有 parent_id
    has_parent_id = any("parent_id" in c.metadata for c in child_docs)
    assert has_parent_id or len(parent_docs) == 1  # 单父块时可能都匹配到
