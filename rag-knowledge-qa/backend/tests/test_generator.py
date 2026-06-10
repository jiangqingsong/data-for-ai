"""生成器测试 — Prompt 模板与 LLM 调用"""
from unittest.mock import patch, MagicMock
from src.generator import Generator, format_docs


def test_format_docs_concatenates_content():
    """format_docs 应将多个文档内容拼接，标注来源"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="文档块1内容",
            metadata={"source": "物理.pdf", "page": 1},
        ),
        Document(
            page_content="文档块2内容",
            metadata={"source": "物理.pdf", "page": 2},
        ),
    ]
    result = format_docs(docs)
    assert "文档块1内容" in result
    assert "文档块2内容" in result
    assert "来源: 物理.pdf (第1页)" in result
    assert "来源: 物理.pdf (第2页)" in result
    # 应有编号标记
    assert "[1]" in result
    assert "[2]" in result


def test_format_docs_handles_missing_metadata():
    """format_docs 对缺失元数据应有 fallback"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="无元数据的文档",
        )
    ]
    result = format_docs(docs)
    assert "无元数据的文档" in result
    assert "未知来源" in result


def test_generator_builds_prompt_correctly():
    """生成器应正确组装 Prompt — 包含问题、参考资料"""
    from langchain_core.documents import Document

    gen = Generator(model="test-model", temperature=0.1, max_tokens=1024)
    docs = [
        Document(
            page_content="牛顿第一定律：任何物体都要保持匀速直线运动或静止状态。",
            metadata={"source": "物理.pdf", "page": 5},
        )
    ]
    prompt = gen._build_prompt(
        question="牛顿第一定律是什么？", context_docs=docs
    )
    assert "牛顿第一定律是什么" in prompt
    assert "匀速直线运动" in prompt
    assert "参考资料" in prompt


@patch("src.generator.ChatOpenAI")
def test_generate_returns_answer_and_sources(mock_chat):
    """generate 应返回 answer + sources + prompt"""
    from langchain_core.documents import Document

    # Mock LLM 响应
    mock_instance = MagicMock()
    mock_instance.invoke.return_value.content = "牛顿第一定律，又称惯性定律..."
    mock_chat.return_value = mock_instance

    gen = Generator(model="test-model")
    docs = [
        Document(
            page_content="牛顿第一定律内容",
            metadata={"source": "物理.pdf", "page": 5},
        )
    ]
    result = gen.generate(question="牛顿第一定律是什么？", context_docs=docs)

    assert "answer" in result
    assert "sources" in result
    assert "prompt" in result
    assert result["answer"] == "牛顿第一定律，又称惯性定律..."
    assert len(result["sources"]) == 1
    assert result["sources"][0]["source"] == "物理.pdf"
    assert result["sources"][0]["page"] == 5


@patch("src.generator.ChatOpenAI")
def test_generate_deduplicates_sources(mock_chat):
    """同文件同页的来源应去重"""
    from langchain_core.documents import Document

    mock_instance = MagicMock()
    mock_instance.invoke.return_value.content = "测试答案"
    mock_chat.return_value = mock_instance

    gen = Generator(model="test-model")
    docs = [
        Document(
            page_content="第一块内容",
            metadata={"source": "物理.pdf", "page": 5},
        ),
        Document(
            page_content="第二块内容",
            metadata={"source": "物理.pdf", "page": 5},
        ),
    ]
    result = gen.generate(question="测试问题", context_docs=docs)
    # 同文件同页应合并为一条来源
    assert len(result["sources"]) == 1
    assert result["sources"][0]["source"] == "物理.pdf"
    assert result["sources"][0]["page"] == 5
