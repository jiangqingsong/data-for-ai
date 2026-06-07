# RAG 知识库问答系统 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3 周内从零搭建 RAG 知识库问答系统，覆盖全链路（数据Pipeline→检索→生成→评估→产品化）

**Architecture:** Python + LangChain + Chroma + 火山引擎 API (LLM + Embedding)，7 个核心源文件，4 个测试文件，1 个 Gradio 入口

**Tech Stack:** LangChain, ChromaDB, 火山引擎 (DeepSeek V4 + Doubao Embedding), Unstructured, RAGAS, Gradio

**关联设计文档:** [2026-06-03-rag-knowledge-qa-design.md](../specs/2026-06-03-rag-knowledge-qa-design.md)

---

## ⚠️ 执行偏差记录（2026-06-07 更新）

> 以下记录了实际实现与原始计划的差异。Task 5+ 的代码模板需按实际实现调整，不能直接复制计划中的代码。

### 配置方式变更

| 维度 | 原始计划 | 实际实现 |
|------|---------|---------|
| 配置存储 | `.env` 文件 + `python-dotenv` | `~/.ai-env/llm/config.json` (JSON 文件，项目外，多项目共享) |
| 配置读取 | `os.getenv("DEEPSEEK_API_KEY")` | `Config.DEEPSEEK_API_KEY` (从 JSON 解析) |
| API 来源 | DeepSeek 官方 (`api.deepseek.com`) | 火山引擎 (`ark.cn-beijing.volces.com`) |
| LLM 模型 | `deepseek-chat` | `deepseek-v4-pro-260425` |
| Embedding 模型 | `text-embedding-3-small` / BGE-M3 fallback | `doubao-embedding-text-240715` (2560维, 无 fallback) |

### API 调用模式

- **计划:** `os.getenv()` 直接读环境变量，每次调用传 `openai_api_key` / `openai_api_base`
- **实际:** 统一通过 `Config` 类，Embedding 调用需 `tiktoken_enabled=False`（火山引擎兼容性要求）

### 接口差异

| 函数/类 | 计划参数 | 实际参数 |
|---------|---------|---------|
| `Retriever.__init__` | `use_deepseek_embedding=True`, `embedding_model` | 无这两个参数，直接从 Config 读 |
| `build_vectorstore` | `use_deepseek_embedding=True`, `embedding_model` | 只保留 `embedding_model=None`（None=读 Config） |
| `run_pipeline` | `use_deepseek_embedding=True` | 去掉该参数 |

### 新增文件（计划外）

- `explore.py` — Chroma 向量库交互式探索工具 (search/mmr/stats/sample/page)

### 对 Task 5+ 的影响

- `Generator` 中 LLM 调用必须使用 `ChatOpenAI` + 火山引擎 base_url，从 `Config` 读取参数
- 测试中 mock 方式不变（mock `ChatOpenAI`），但需注意实际调用链走 Config
- `rag_chain.py` 中 `RAGChain` 初始化不需要传 `use_deepseek_embedding`

---

## 文件结构

```
rag-knowledge-qa/
├── .env.example              # API Key 配置模板
├── .gitignore
├── requirements.txt
├── README.md
├── data/
│   ├── pdfs/                 # 用户提供 PDF (gitignore)
│   └── chroma_db/            # Chroma 持久化 (gitignore)
├── src/
│   ├── __init__.py
│   ├── config.py             # 配置管理
│   ├── pipeline.py           # PDF加载→清洗→分块→向量化
│   ├── retriever.py          # 检索器 (相似度/MMR/混合)
│   ├── generator.py          # 生成器 (Prompt模板+LLM)
│   ├── rag_chain.py          # RAG 完整链路
│   └── evaluator.py          # RAGAS 评估
├── app.py                    # Gradio Web UI
├── tests/
│   ├── test_pipeline.py
│   ├── test_retriever.py
│   ├── test_generator.py
│   └── test_evaluator.py
└── docs/knowledge/           # 7篇知识点文档
```

---

## 第1周：最简 RAG 跑通 (MVP)

### Task 1: 项目初始化与环境搭建 ✅

> **状态:** 已完成 (2026-06-03) | **提交:** `446eb7a` feat: 项目初始化

**Files:**
- Create: `rag-knowledge-qa/.env.example`
- Create: `rag-knowledge-qa/.gitignore`
- Create: `rag-knowledge-qa/requirements.txt`
- Create: `rag-knowledge-qa/src/__init__.py`
- Create: `rag-knowledge-qa/src/config.py`

- [x] **Step 1: 创建项目目录结构**

```bash
mkdir -p rag-knowledge-qa/{src,tests,data/pdfs,data/chroma_db,docs/knowledge,notebooks}
touch rag-knowledge-qa/src/__init__.py
touch rag-knowledge-qa/tests/__init__.py
```

- [x] **Step 2: 编写 .gitignore**

```bash
cat > rag-knowledge-qa/.gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*.egg-info/
dist/
.venv/
venv/
env/

# Data
data/pdfs/
data/chroma_db/

# Environment
.env

# IDE
.vscode/
.idea/
.DS_Store

# Notebooks
notebooks/.ipynb_checkpoints/
EOF
```

- [x] **Step 3: 编写 requirements.txt**

```txt
langchain>=0.3.0
langchain-community>=0.3.0
chromadb>=0.5.0
unstructured>=0.15.0
pypdf>=4.0.0
python-dotenv>=1.0.0
ragas>=0.2.0
gradio>=4.0.0
pandas>=2.0.0
openai>=1.0.0
sentence-transformers>=2.7.0
```

- [x] **Step 4: 编写 .env.example**

```bash
# DeepSeek API
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com

# Chroma
CHROMA_PERSIST_DIR=./data/chroma_db

# Model
LLM_MODEL=deepseek-chat
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=1024

# Retriever
RETRIEVER_TOP_K=4
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

- [x] **Step 5: 编写 src/config.py**

```python
"""配置管理模块 — 统一管理所有环境变量和参数"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """应用配置，所有参数从环境变量读取，提供合理默认值"""

    # --- DeepSeek API ---
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = os.getenv(
        "DEEPSEEK_BASE_URL", "https://api.deepseek.com"
    )

    # --- LLM ---
    LLM_MODEL: str = os.getenv("LLM_MODEL", "deepseek-chat")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.1"))
    LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "1024"))

    # --- Chroma ---
    CHROMA_PERSIST_DIR: str = os.getenv(
        "CHROMA_PERSIST_DIR", "./data/chroma_db"
    )

    # --- Retriever ---
    RETRIEVER_TOP_K: int = int(os.getenv("RETRIEVER_TOP_K", "4"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))

    # --- PDF 数据目录 ---
    PDF_DIR: str = os.getenv("PDF_DIR", "./data/pdfs")

    @classmethod
    def validate(cls) -> list[str]:
        """校验必要配置是否齐全，返回缺失项列表"""
        errors = []
        if not cls.DEEPSEEK_API_KEY:
            errors.append("DEEPSEEK_API_KEY 未设置")
        return errors
```

- [x] **Step 6: 创建 .env 并填入 API Key**

```bash
cp rag-knowledge-qa/.env.example rag-knowledge-qa/.env
echo "⚠️ 请手动编辑 rag-knowledge-qa/.env 填入 DEEPSEEK_API_KEY"
```

- [x] **Step 7: 创建虚拟环境并安装依赖**

```bash
cd rag-knowledge-qa
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- [x] **Step 8: 验证 DeepSeek API 连通性**

```bash
python3 -c "
from openai import OpenAI
import os
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(
    api_key=os.getenv('DEEPSEEK_API_KEY'),
    base_url=os.getenv('DEEPSEEK_BASE_URL')
)
r = client.chat.completions.create(
    model='deepseek-chat',
    messages=[{'role': 'user', 'content': '你好，请回复：API连通成功'}]
)
print(r.choices[0].message.content)
"
```

预期输出: `API连通成功`

- [x] **Step 9: 验证 DeepSeek Embedding API 是否可用**

```bash
python3 -c "
from openai import OpenAI
import os
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(
    api_key=os.getenv('DEEPSEEK_API_KEY'),
    base_url=os.getenv('DEEPSEEK_BASE_URL')
)
try:
    r = client.embeddings.create(
        model='text-embedding-3-small',
        input='测试文本'
    )
    print(f'Embedding API 可用, 维度={len(r.data[0].embedding)}')
except Exception as e:
    print(f'Embedding API 不可用: {e}')
    print('将使用 BGE-M3 本地 Embedding 作为 fallback')
"
```

- [x] **Step 10: 提交**

```bash
cd rag-knowledge-qa
git init
git add .
git commit -m "feat: 项目初始化 — 目录结构、配置、依赖"
```

---

### Task 2: 数据 Pipeline — PDF 加载与文本清洗 ✅

> **状态:** 已完成 (2026-06-03) | **提交:** `446eb7a` feat: PDF 加载与文本清洗

**Files:**
- Create: `rag-knowledge-qa/src/pipeline.py`
- Create: `rag-knowledge-qa/tests/test_pipeline.py`

- [ ] **Step 1: 编写测试 — 加载 PDF**

```python
# tests/test_pipeline.py
import os
import tempfile
from src.pipeline import load_pdfs, clean_documents


def test_load_pdfs_returns_documents():
    """加载 PDF 应返回 LangChain Document 列表"""
    # 需要一个真实的 PDF 文件来测试
    # 如果没有 PDF，先用 skip 标记，等有了 PDF 再跑
    pdf_dir = "./data/pdfs"
    if not os.path.exists(pdf_dir) or not os.listdir(pdf_dir):
        import pytest
        pytest.skip("PDF 目录为空，跳过测试")

    docs = load_pdfs(pdf_dir)
    assert len(docs) > 0
    # 每个 Document 必须有 page_content 和 metadata
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
    # 多余空格合并，多余换行合并
    content = cleaned[0].page_content
    assert "  " not in content  # 无连续空格
    assert "\n\n\n" not in content  # 无连续换行


def test_clean_documents_preserves_metadata():
    """文本清洗不应修改元数据"""
    from langchain_core.documents import Document

    docs = [
        Document(
            page_content="测试内容",
            metadata={"source": "test.pdf", "page": 1},
        )
    ]
    cleaned = clean_documents(docs)
    assert cleaned[0].metadata["source"] == "test.pdf"
    assert cleaned[0].metadata["page"] == 1
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd rag-knowledge-qa
python3 -m pytest tests/test_pipeline.py -v
```

预期: 全部 FAIL (模块不存在)

- [ ] **Step 3: 实现 src/pipeline.py — load_pdfs 和 clean_documents**

```python
"""数据 Pipeline — PDF 加载、清洗、分块、向量化"""
import os
import re
from typing import List

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document


def load_pdfs(pdf_dir: str) -> List[Document]:
    """加载目录下所有 PDF 文件，返回 Document 列表

    每个 Document 包含:
      - page_content: 页面文本内容
      - metadata: {"source": 文件名, "page": 页码}
    """
    all_docs = []
    pdf_files = [
        f for f in os.listdir(pdf_dir) if f.lower().endswith(".pdf")
    ]

    if not pdf_files:
        print(f"警告: {pdf_dir} 目录下没有找到 PDF 文件")
        return all_docs

    for pdf_file in pdf_files:
        filepath = os.path.join(pdf_dir, pdf_file)
        try:
            loader = PyPDFLoader(filepath)
            docs = loader.load()
            # 补充文件名元数据
            for doc in docs:
                doc.metadata["source"] = pdf_file
            all_docs.extend(docs)
            print(f"  ✓ 加载: {pdf_file} ({len(docs)} 页)")
        except Exception as e:
            print(f"  ✗ 加载失败: {pdf_file}, 错误: {e}")

    print(f"共加载 {len(pdf_files)} 个 PDF, {len(all_docs)} 个页面")
    return all_docs


def clean_documents(docs: List[Document]) -> List[Document]:
    """清洗文档文本：去除多余空白、规范化中文

    - 合并连续空格
    - 合并连续换行（最多保留1个）
    - 去除页眉页脚类短行（可选）
    """
    for doc in docs:
        text = doc.page_content
        # 合并连续空格
        text = re.sub(r"[ \t]+", " ", text)
        # 合并连续换行（保留最多1个换行）
        text = re.sub(r"\n{3,}", "\n\n", text)
        # 去除首尾空白
        text = text.strip()
        doc.page_content = text

    # 过滤掉清洗后为空的文档
    docs = [doc for doc in docs if len(doc.page_content) > 10]
    return docs
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd rag-knowledge-qa
python3 -m pytest tests/test_pipeline.py -v
```

- [ ] **Step 5: 提交**

```bash
git add src/pipeline.py tests/test_pipeline.py
git commit -m "feat: PDF 加载与文本清洗 (pipeline.py)"
```

---

### Task 3: 数据 Pipeline — 文档分块与向量化存储 ✅

> **状态:** 已完成 (2026-06-04) | **提交:** `050b4b5` feat: Chroma 向量库交互式探索工具

**Files:**
- Modify: `rag-knowledge-qa/src/pipeline.py` (追加函数)
- Modify: `rag-knowledge-qa/tests/test_pipeline.py` (追加测试)

- [ ] **Step 1: 追加测试 — 分块和向量化**

在 `tests/test_pipeline.py` 末尾追加：

```python
from src.pipeline import split_documents, build_vectorstore


def test_split_documents_chunk_size():
    """分块后每个块不应超过 chunk_size + overlap"""
    from langchain_core.documents import Document

    # 构造一个长文本
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
        # 使用 DeepSeek Embedding
        vectorstore = build_vectorstore(
            docs,
            persist_dir=tmpdir,
            use_deepseek_embedding=True,
        )
        assert vectorstore is not None
        # 检查持久化目录是否有文件
        assert len(os.listdir(tmpdir)) > 0
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
```

- [ ] **Step 2: 运行测试确认失败**

```bash
python3 -m pytest tests/test_pipeline.py::test_split_documents_chunk_size -v
```

- [ ] **Step 3: 实现 split_documents 和 build_vectorstore**

在 `src/pipeline.py` 末尾追加：

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_chroma import Chroma


def split_documents(
    docs: List[Document],
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[Document]:
    """将文档按指定大小分块

    Args:
        docs: 原始文档列表
        chunk_size: 每块最大字符数
        chunk_overlap: 块间重叠字符数

    Returns:
        分块后的文档列表，保留原始元数据
    """
    # 中文友好的分隔符：段落 → 换行 → 句号 → 空格
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", ".", " ", ""],
        length_function=len,
    )
    chunks = text_splitter.split_documents(docs)
    print(f"分块完成: {len(docs)} 页面 → {len(chunks)} 个块")
    return chunks


def build_vectorstore(
    docs: List[Document],
    persist_dir: str = "./data/chroma_db",
    use_deepseek_embedding: bool = True,
    embedding_model: str = "text-embedding-3-small",
) -> Chroma:
    """将文档向量化并存入 Chroma

    Args:
        docs: 待向量化的文档列表
        persist_dir: Chroma 持久化目录
        use_deepseek_embedding: True=DeepSeek API, False=BGE-M3 本地
        embedding_model: DeepSeek Embedding 模型名（仅 API 模式）

    Returns:
        Chroma vectorstore 实例
    """
    if use_deepseek_embedding:
        embeddings = OpenAIEmbeddings(
            model=embedding_model,
            openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
            openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
        )
    else:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(
            model_name="BAAI/bge-m3",
            model_kwargs={"device": "cpu"},
        )

    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=persist_dir,
    )
    print(f"向量化完成: {len(docs)} 个块 → Chroma ({persist_dir})")
    return vectorstore


def run_pipeline(
    pdf_dir: str = "./data/pdfs",
    persist_dir: str = "./data/chroma_db",
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    use_deepseek_embedding: bool = True,
) -> Chroma:
    """一键执行完整的数据 Pipeline

    PDF → 加载 → 清洗 → 分块 → 向量化 → Chroma
    """
    print("=" * 50)
    print("数据 Pipeline 开始执行")
    print("=" * 50)

    # 1. 加载
    print("\n[1/4] 加载 PDF...")
    docs = load_pdfs(pdf_dir)
    if not docs:
        raise ValueError(f"未找到 PDF 文件: {pdf_dir}")

    # 2. 清洗
    print("\n[2/4] 文本清洗...")
    docs = clean_documents(docs)

    # 3. 分块
    print(f"\n[3/4] 文档分块 (chunk_size={chunk_size}, overlap={chunk_overlap})...")
    chunks = split_documents(docs, chunk_size, chunk_overlap)

    # 4. 向量化
    print(f"\n[4/4] 向量化存储...")
    vectorstore = build_vectorstore(
        chunks, persist_dir, use_deepseek_embedding
    )

    print("\n" + "=" * 50)
    print("Pipeline 执行完成!")
    print(f"  输入: {len(docs)} 个页面")
    print(f"  输出: {len(chunks)} 个向量块")
    print(f"  存储: {persist_dir}")
    print("=" * 50)
    return vectorstore


if __name__ == "__main__":
    run_pipeline()
```

- [ ] **Step 4: 运行测试确认通过**

```bash
python3 -m pytest tests/test_pipeline.py -v
```

- [ ] **Step 5: 提交**

```bash
git add src/pipeline.py tests/test_pipeline.py
git commit -m "feat: 文档分块与 Chroma 向量化存储"
```

---

### Task 4: 检索器 — 相似度检索 ✅

> **状态:** 已完成 (2026-06-05) | **提交:** `446eb7a` feat: 检索器 + 火山引擎 Embedding API 切换

**Files:**
- Create: `rag-knowledge-qa/src/retriever.py`
- Create: `rag-knowledge-qa/tests/test_retriever.py`

- [ ] **Step 1: 编写测试**

```python
# tests/test_retriever.py
from src.retriever import Retriever


def test_retriever_creation_with_persist_dir():
    """从已有 Chroma 目录创建 Retriever"""
    import os
    persist_dir = "./data/chroma_db"
    if not os.path.exists(persist_dir) or not os.listdir(persist_dir):
        import pytest
        pytest.skip("Chroma 数据目录为空，请先运行 pipeline")

    retriever = Retriever(
        persist_dir=persist_dir,
        use_deepseek_embedding=True,
    )
    assert retriever is not None
    assert retriever.vectorstore is not None


def test_similarity_search_returns_documents():
    """相似度检索应返回文档列表"""
    import os
    persist_dir = "./data/chroma_db"
    if not os.path.exists(persist_dir) or not os.listdir(persist_dir):
        import pytest
        pytest.skip("Chroma 数据目录为空，请先运行 pipeline")

    retriever = Retriever(persist_dir=persist_dir, use_deepseek_embedding=True)
    results = retriever.similarity_search("牛顿第一定律", top_k=3)
    assert len(results) > 0
    assert len(results) <= 3
    for doc in results:
        assert hasattr(doc, "page_content")
        assert hasattr(doc, "metadata")


def test_similarity_search_respects_top_k():
    """检索结果数量应不超过 top_k"""
    import os
    persist_dir = "./data/chroma_db"
    if not os.path.exists(persist_dir) or not os.listdir(persist_dir):
        import pytest
        pytest.skip("Chroma 数据目录为空，请先运行 pipeline")

    retriever = Retriever(persist_dir=persist_dir, use_deepseek_embedding=True)
    for k in [1, 2, 4]:
        results = retriever.similarity_search("物理", top_k=k)
        assert len(results) <= k
```

- [ ] **Step 2: 运行测试确认失败**

```bash
python3 -m pytest tests/test_retriever.py -v
```

- [ ] **Step 3: 实现 src/retriever.py**

```python
"""检索器模块 — 支持多种检索策略"""
import os
from typing import List

from langchain_chroma import Chroma
from langchain_community.embeddings import OpenAIEmbeddings
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
        persist_dir: str = "./data/chroma_db",
        use_deepseek_embedding: bool = True,
        embedding_model: str = "text-embedding-3-small",
    ):
        if use_deepseek_embedding:
            embeddings = OpenAIEmbeddings(
                model=embedding_model,
                openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
                openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
            )
        else:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            embeddings = HuggingFaceEmbeddings(
                model_name="BAAI/bge-m3",
                model_kwargs={"device": "cpu"},
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
```

- [ ] **Step 4: 运行测试确认通过**

```bash
python3 -m pytest tests/test_retriever.py -v
```

- [ ] **Step 5: 提交**

```bash
git add src/retriever.py tests/test_retriever.py
git commit -m "feat: 检索器 — 相似度检索 + MMR 检索"
```

---

### Task 5: 生成器 — Prompt 模板与 LLM 调用

**Files:**
- Create: `rag-knowledge-qa/src/generator.py`
- Create: `rag-knowledge-qa/tests/test_generator.py`

- [ ] **Step 1: 编写测试**

```python
# tests/test_generator.py
from unittest.mock import patch, MagicMock
from src.generator import Generator, format_docs, SYSTEM_PROMPT, USER_PROMPT


def test_format_docs_concatenates_content():
    """format_docs 应将多个文档内容拼接"""
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


def test_generator_builds_prompt_correctly():
    """生成器应正确组装 Prompt"""
    from langchain_core.documents import Document

    gen = Generator(model="deepseek-v4-pro-260425", temperature=0.1, max_tokens=1024)
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
    """generate 应返回答案和引用来源"""
    from langchain_core.documents import Document

    # Mock LLM 响应
    mock_instance = MagicMock()
    mock_instance.invoke.return_value.content = "牛顿第一定律，又称惯性定律..."
    mock_chat.return_value = mock_instance

    gen = Generator(model="deepseek-chat")
    docs = [
        Document(
            page_content="牛顿第一定律内容",
            metadata={"source": "物理.pdf", "page": 5},
        )
    ]
    result = gen.generate(question="牛顿第一定律是什么？", context_docs=docs)

    assert "answer" in result
    assert "sources" in result
    assert len(result["sources"]) == 1
    assert result["sources"][0]["source"] == "物理.pdf"
    assert result["sources"][0]["page"] == 5
```

- [ ] **Step 2: 运行测试确认失败**

```bash
python3 -m pytest tests/test_generator.py -v
```

- [ ] **Step 3: 实现 src/generator.py**

> ⚠️ 代码已适配实际 Config 模式（从 `~/.ai-env/llm/config.json` 读取，非 `.env`）。

```python
"""生成器模块 — Prompt 模板 + LLM 调用"""
from typing import List, Dict, Any

from langchain_core.documents import Document
from langchain_openai import ChatOpenAI


# === Prompt 模板 ===

SYSTEM_PROMPT = """你是初中学科知识问答助手。请严格基于以下参考资料回答问题。

规则：
1. 如果资料中包含答案，准确引用并注明来源
2. 如果资料中不包含答案，请明确说"参考资料中未找到相关信息"
3. 回答要简洁清晰，适合初中生理解
4. 涉及公式、定理时，给出完整表述

参考资料：
{context}"""

USER_PROMPT = """问题：{question}

请回答："""


def format_docs(docs: List[Document]) -> str:
    """将检索到的文档块格式化为 Prompt 可用的上下文字符串

    每个文档块标注来源文件名和页码。
    """
    parts = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "未知来源")
        page = doc.metadata.get("page", "?")
        parts.append(f"[{i}] 来源: {source} (第{page}页)\n{doc.page_content}")
    return "\n\n".join(parts)


class Generator:
    """RAG 生成器，负责 Prompt 组装和 LLM 调用"""

    def __init__(
        self,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        from src.config import Config

        self.llm = ChatOpenAI(
            model=model or Config.LLM_MODEL,
            temperature=temperature if temperature is not None else Config.LLM_TEMPERATURE,
            max_tokens=max_tokens or Config.LLM_MAX_TOKENS,
            openai_api_key=Config.DEEPSEEK_API_KEY,
            openai_api_base=Config.DEEPSEEK_BASE_URL,
        )

    def _build_prompt(
        self, question: str, context_docs: List[Document]
    ) -> str:
        """组装完整的 Prompt"""
        context = format_docs(context_docs)
        system_part = SYSTEM_PROMPT.format(context=context)
        user_part = USER_PROMPT.format(question=question)
        return system_part + "\n\n" + user_part

    def _extract_sources(
        self, context_docs: List[Document]
    ) -> List[Dict[str, Any]]:
        """从检索文档中提取引用来源"""
        seen = set()
        sources = []
        for doc in context_docs:
            source = doc.metadata.get("source", "未知来源")
            page = doc.metadata.get("page", "?")
            key = f"{source}:{page}"
            if key not in seen:
                seen.add(key)
                sources.append({
                    "source": source,
                    "page": page,
                    "snippet": doc.page_content[:100] + "...",
                })
        return sources

    def generate(
        self,
        question: str,
        context_docs: List[Document],
    ) -> Dict[str, Any]:
        """执行 RAG 生成

        Args:
            question: 用户问题
            context_docs: 检索到的文档块

        Returns:
            {"answer": str, "sources": [...], "prompt": str}
        """
        prompt = self._build_prompt(question, context_docs)
        response = self.llm.invoke(prompt)
        sources = self._extract_sources(context_docs)

        return {
            "answer": response.content,
            "sources": sources,
            "prompt": prompt,
        }
```


- [ ] **Step 4: 运行测试确认通过**

```bash
python3 -m pytest tests/test_generator.py -v
```

- [ ] **Step 5: 提交**

```bash
git add src/generator.py tests/test_generator.py
git commit -m "feat: 生成器 — Prompt 模板 + DeepSeek LLM 调用"
```

---

### Task 6: RAG Chain — 串联检索 + 生成

**Files:**
- Create: `rag-knowledge-qa/src/rag_chain.py`

- [ ] **Step 1: 实现 src/rag_chain.py**

```python
"""RAG 完整链路 — 串联检索器 + 生成器，提供统一问答接口"""
from typing import Dict, Any

from src.config import Config
from src.retriever import Retriever
from src.generator import Generator


class RAGChain:
    """RAG 问答链路

    用法:
        chain = RAGChain()
        result = chain.ask("牛顿第一定律是什么？")
        print(result["answer"])
        for src in result["sources"]:
            print(f"  - {src['source']} (第{src['page']}页)")
    """

    def __init__(
        self,
        persist_dir: str | None = None,
        top_k: int | None = None,
    ):
        self.persist_dir = persist_dir or Config.CHROMA_PERSIST_DIR
        self.top_k = top_k or Config.RETRIEVER_TOP_K

        self.retriever = Retriever(
            persist_dir=self.persist_dir,
        )
        self.generator = Generator()

    def ask(
        self,
        question: str,
        search_type: str = "similarity",
    ) -> Dict[str, Any]:
        """提问并获取回答

        Args:
            question: 用户问题
            search_type: 检索类型 "similarity" 或 "mmr"

        Returns:
            {"question": str, "answer": str, "sources": [...],
             "context_docs": [...]}
        """
        # 1. 检索
        if search_type == "mmr":
            context_docs = self.retriever.mmr_search(
                question, top_k=self.top_k
            )
        else:
            context_docs = self.retriever.similarity_search(
                question, top_k=self.top_k
            )

        # 2. 生成
        result = self.generator.generate(
            question=question, context_docs=context_docs
        )

        return {
            "question": question,
            "answer": result["answer"],
            "sources": result["sources"],
            "context_docs": context_docs,
        }


def main():
    """命令行入口 — 交互式问答"""
    print("=" * 50)
    print("RAG 知识库问答系统")
    print("=" * 50)

    # 检查配置
    errors = Config.validate()
    if errors:
        print("配置错误:")
        for e in errors:
            print(f"  ✗ {e}")
        return

    # 初始化
    print("正在初始化 RAG Chain...")
    chain = RAGChain()
    print("初始化完成! 输入问题开始问答，输入 'quit' 退出\n")

    # 交互循环
    while True:
        try:
            question = input("\n🤔 你的问题: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n再见!")
            break

        if not question:
            continue
        if question.lower() in ("quit", "exit", "q"):
            print("再见!")
            break

        print("🔍 正在检索...")
        result = chain.ask(question)

        print(f"\n📝 回答:\n{result['answer']}")
        print(f"\n📚 参考来源:")
        for i, src in enumerate(result["sources"], 1):
            print(f"  [{i}] {src['source']} (第{src['page']}页)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 手动测试 — 放入 PDF 后运行**

```bash
# 先确保 data/pdfs/ 下有 PDF 文件
# 然后运行 Pipeline
cd rag-knowledge-qa
python3 -m src.pipeline

# 再运行交互式问答
python3 -m src.rag_chain
```

- [ ] **Step 3: 提交**

```bash
git add src/rag_chain.py
git commit -m "feat: RAG Chain — 串联检索+生成的完整链路"
```

---

### Task 7: 第1周收尾 — 知识点文档 + 基线评估准备

**Files:**
- Create: `rag-knowledge-qa/docs/knowledge/01-rag-architecture.md`
- Create: `rag-knowledge-qa/docs/knowledge/02-data-pipeline.md`
- Create: `rag-knowledge-qa/docs/knowledge/03-embedding-vectorstore.md`
- Create: `rag-knowledge-qa/docs/knowledge/05-prompt-engineering.md`

- [ ] **Step 1: 编写 01-rag-architecture.md**

```markdown
# RAG 整体架构

> 学习时间: 2026-06-0X | 所属阶段: 第1周

## 一、核心概念

RAG (Retrieval-Augmented Generation) = 检索增强生成。

**问题背景:** LLM 的知识截止于训练数据，无法回答最新/私有领域问题。RAG 在 LLM 生成前先检索外部知识库，把相关知识"喂"给 LLM。

**核心流程:**
- 离线阶段: 文档 → 分块 → Embedding 向量化 → 存入向量数据库
- 在线阶段: 用户问题 → 向量检索 → 拼接 Prompt → LLM 生成

**为什么叫"增强生成"？** LLM 本身是生成模型，RAG 用检索结果增强了它的生成能力——让 LLM 基于真实资料回答，而不是凭记忆编造。

## 二、关键代码/用法

```python
# RAG 的最简实现（伪代码）
question = "牛顿第一定律是什么？"

# 1. 检索
query_vector = embedding_model.encode(question)
docs = vectorstore.similarity_search(query_vector, top_k=4)

# 2. 拼接 Prompt
context = "\n".join([doc.content for doc in docs])
prompt = f"参考资料：{context}\n\n问题：{question}"

# 3. 生成
answer = llm.generate(prompt)
```

## 三、实验记录 & 踩坑

_（边做边补充）_

## 四、面试可能会问

**Q: RAG 和微调的区别？**
A: RAG 是外挂知识库，不改模型权重，知识可随时更新。微调是改变模型参数，适合学习模式/风格。两者可以互补。

**Q: RAG 的核心挑战是什么？**
A: 检索质量（检索到不相关的文档会导致生成质量差）、分块策略、延迟（检索+生成两段延迟）。
```

- [ ] **Step 2: 编写 02-data-pipeline.md**（核心概念框架，实验记录边做边填）

```markdown
# 非结构化数据处理 & 分块策略

> 学习时间: 2026-06-0X | 所属阶段: 第1-2周

## 一、核心概念

**非结构化数据:** PDF、Word、网页、图片等没有固定 Schema 的数据。RAG 的第一步就是把这些数据"结构化"为可检索的文本块。

**分块 (Chunking) 为什么重要？**
- LLM 的 Context Window 有限，不能一次塞入整本书
- Embedding 模型对短文本效果更好
- 分块粒度直接影响检索精准度和生成完整性

**四种分块策略:**

| 策略 | 原理 | 优点 | 缺点 |
|------|------|------|------|
| 固定大小 | 按字符数切分 + overlap | 简单、可控 | 可能切断语义 |
| 语义分块 | Embedding 相似度骤降处切分 | 语义连贯 | 计算成本高 |
| 结构分块 | 按标题层级切分 | 保留文档结构 | 依赖文档格式 |
| 小2大 | 小块检索 + 大块生成 | 精准+完整 | 实现复杂 |

## 二、关键代码/用法

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", "。", ".", " ", ""],
)
chunks = splitter.split_documents(documents)
```

## 三、实验记录 & 踩坑

_（边做边补充）_

## 四、面试可能会问

**Q: chunk_overlap 为什么要设置？**
A: 防止关键信息刚好落在分块边界上被切断。overlap 让相邻块有重叠内容，提高检索召回率。

**Q: 分块太大/太小各有什么问题？**
A: 太大 → 检索不精准、Embedding 信号被稀释。太小 → 上下文不完整、生成答案碎片化。
```

- [ ] **Step 3: 编写 03-embedding-vectorstore.md**（框架）

```markdown
# Embedding 与向量数据库

> 学习时间: 2026-06-0X | 所属阶段: 第1周

## 一、核心概念

**Embedding (向量化):** 将文本映射到高维向量空间，语义相似的文本向量距离近。

**向量数据库:** 专门存储和检索向量的数据库。核心能力是 ANN (近似最近邻) 搜索。

**Chroma 的特点:**
- 轻量级，Python 原生，零配置
- 支持内存模式和持久化模式
- 底层使用 HNSW 索引（一种高效的 ANN 算法）
- 不适合生产大规模场景（那时该用 Milvus）

## 二、关键代码/用法

_（边做边补充）_

## 三、实验记录 & 踩坑

_（边做边补充）_

## 四、面试可能会问

**Q: 为什么不用传统数据库做向量检索？**
A: 传统数据库的 B-Tree 索引在高维向量上效率极低（维度灾难）。向量数据库使用 HNSW/IVF 等 ANN 算法。

**Q: Chroma 和 Milvus 怎么选？**
A: Chroma 适合开发和小规模，Milvus 适合生产大规模。两者 API 相似，迁移成本低。
```

- [ ] **Step 4: 编写 05-prompt-engineering.md**（框架）

```markdown
# Prompt 模板设计

> 学习时间: 2026-06-0X | 所属阶段: 第1周

## 一、核心概念

RAG 场景的 Prompt 设计核心原则:
1. **角色设定:** 明确告诉 LLM 它是谁
2. **约束条件:** 限定基于参考资料回答
3. **诚实机制:** 不知道就说不知道，防止幻觉
4. **格式要求:** 引用来源、适合目标受众

## 二、关键代码/用法

_（边做边补充）_

## 三、实验记录 & 踩坑

_（边做边补充）_

## 四、面试可能会问

**Q: temperature 参数在 RAG 场景应该怎么设？**
A: RAG 是知识问答，要确定性不要创造性，temperature 应设低（0~0.3）。设为 1.0 会导致答案不稳定甚至编造。

**Q: 什么是 RAG 中的幻觉 (Hallucination)？**
A: LLM 在检索不到相关信息时仍然"编造"了一个看起来合理的答案。对抗方法: Prompt 中明确"不知道就说不知道"。
```

- [ ] **Step 5: 提交**

```bash
git add docs/knowledge/
git commit -m "docs: 第1周知识点文档 (01/02/03/05)"
```

---

## 第2周：检索质量优化

### Task 8: 高级分块策略实现

**Files:**
- Modify: `rag-knowledge-qa/src/pipeline.py` (追加高级分块函数)

- [ ] **Step 1: 在 pipeline.py 追加语义分块函数**

```python
def semantic_split(
    docs: List[Document],
    embedding_model: str = "text-embedding-3-small",
    threshold_percentile: float = 90,
) -> List[Document]:
    """语义分块 — 基于 Embedding 相似度骤降点切分

    原理:
      1. 将文档拆成句子
      2. 计算相邻句子的 Embedding 余弦相似度
      3. 相似度低于阈值（分位点）的位置 = 切分点

    Args:
        docs: 原始文档列表
        embedding_model: Embedding 模型名
        threshold_percentile: 相似度阈值分位点，越大切得越细

    Returns:
        语义分块后的文档列表
    """
    from langchain_experimental.text_splitter import SemanticChunker

    embeddings = OpenAIEmbeddings(
        model=embedding_model,
        openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
        openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
    )

    splitter = SemanticChunker(
        embeddings=embeddings,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount=threshold_percentile,
    )
    chunks = splitter.split_documents(docs)
    print(f"语义分块完成: {len(docs)} 页面 → {len(chunks)} 个块")
    return chunks
```

- [ ] **Step 2: 在 pipeline.py 追加结构分块函数**

```python
def structural_split(
    docs: List[Document],
) -> List[Document]:
    """按文档结构分块 — 利用标题层级切分

    使用 Unstructured 的 title 检测能力，按标题边界切分。
    保留父标题信息作为 metadata。

    Args:
        docs: 原始文档列表（需包含标题信息）

    Returns:
        结构分块后的文档列表
    """
    from langchain.text_splitter import MarkdownHeaderTextSplitter

    # 按标题层级切分
    headers_to_split_on = [
        ("#", "h1"),
        ("##", "h2"),
        ("###", "h3"),
    ]

    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=False,
    )

    all_chunks = []
    for doc in docs:
        try:
            chunks = splitter.split_text(doc.page_content)
            for chunk in chunks:
                # 合并原始元数据和标题元数据
                chunk.metadata.update(doc.metadata)
            all_chunks.extend(chunks)
        except Exception:
            # 如果文档没有 Markdown 标题结构，回退为整页作为一个块
            all_chunks.append(doc)

    print(f"结构分块完成: {len(docs)} 页面 → {len(all_chunks)} 个块")
    return all_chunks
```

- [ ] **Step 3: 在 pipeline.py 追加小2大分块函数**

```python
def parent_document_split(
    docs: List[Document],
    parent_chunk_size: int = 2000,
    child_chunk_size: int = 500,
    child_chunk_overlap: int = 100,
) -> tuple[List[Document], List[Document]]:
    """小2大分块 — 父块用于生成, 子块用于检索

    Args:
        docs: 原始文档列表
        parent_chunk_size: 父块大小（用于生成 context）
        child_chunk_size: 子块大小（用于向量检索）

    Returns:
        (parent_docs, child_docs) 元组
    """
    # 父块切分器（大块）
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=int(parent_chunk_size * 0.1),
        separators=["\n\n", "\n", "。", ".", " ", ""],
    )

    # 子块切分器（小块）
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=child_chunk_overlap,
        separators=["\n\n", "\n", "。", ".", " ", ""],
    )

    parent_docs = parent_splitter.split_documents(docs)
    child_docs = child_splitter.split_documents(docs)

    # 为子块建立到父块的映射关系（通过内容包含关系）
    # 简化实现：使用相同的 doc_id 标记
    for i, parent in enumerate(parent_docs):
        parent.metadata["parent_id"] = f"parent_{i}"

    for child in child_docs:
        # 找到包含此子块的父块
        for i, parent in enumerate(parent_docs):
            if child.page_content[:50] in parent.page_content:
                child.metadata["parent_id"] = f"parent_{i}"
                break

    print(
        f"小2大分块: {len(docs)} 页面"
        f" → {len(parent_docs)} 父块 + {len(child_docs)} 子块"
    )
    return parent_docs, child_docs
```

- [ ] **Step 4: 在 pipeline.py 追加分块对比实验函数**

```python
def run_chunking_experiment(
    docs: List[Document],
    persist_dir: str = "./data/chroma_db",
) -> Dict[str, Any]:
    """分块策略对比实验 — 一次运行，多次分块，记录统计信息

    Returns:
        {
            "fixed": {"chunks": int, "avg_size": float},
            "semantic": {"chunks": int, "avg_size": float},
            "structural": {"chunks": int, "avg_size": float},
            "parent_child": {"parents": int, "children": int},
        }
    """
    results = {}

    # 策略1: 固定大小分块
    print("\n--- 策略1: 固定大小分块 ---")
    fixed_chunks = split_documents(docs, chunk_size=1000, chunk_overlap=200)
    results["fixed"] = {
        "chunks": len(fixed_chunks),
        "avg_size": sum(len(c.page_content) for c in fixed_chunks)
        / max(len(fixed_chunks), 1),
    }

    # 策略2: 语义分块
    print("\n--- 策略2: 语义分块 ---")
    try:
        semantic_chunks = semantic_split(docs)
        results["semantic"] = {
            "chunks": len(semantic_chunks),
            "avg_size": sum(len(c.page_content) for c in semantic_chunks)
            / max(len(semantic_chunks), 1),
        }
    except Exception as e:
        print(f"语义分块失败: {e}")
        results["semantic"] = {"error": str(e)}

    # 策略3: 结构分块
    print("\n--- 策略3: 结构分块 ---")
    try:
        structural_chunks = structural_split(docs)
        results["structural"] = {
            "chunks": len(structural_chunks),
            "avg_size": sum(len(c.page_content) for c in structural_chunks)
            / max(len(structural_chunks), 1),
        }
    except Exception as e:
        print(f"结构分块失败: {e}")
        results["structural"] = {"error": str(e)}

    # 策略4: 小2大分块
    print("\n--- 策略4: 小2大分块 ---")
    parent_docs, child_docs = parent_document_split(docs)
    results["parent_child"] = {
        "parents": len(parent_docs),
        "children": len(child_docs),
        "parent_avg_size": sum(len(p.page_content) for p in parent_docs)
        / max(len(parent_docs), 1),
        "child_avg_size": sum(len(c.page_content) for c in child_docs)
        / max(len(child_docs), 1),
    }

    # 打印对比结果
    print("\n" + "=" * 50)
    print("分块策略对比结果")
    print("=" * 50)
    for strategy, stats in results.items():
        print(f"\n{strategy}: {stats}")

    return results
```

- [ ] **Step 5: 提交**

```bash
git add src/pipeline.py
git commit -m "feat: 高级分块策略 — 语义/结构/小2大 + 对比实验"
```

---

### Task 9: 检索策略扩展 — MMR + 对比实验

**Files:**
- Modify: `rag-knowledge-qa/src/retriever.py` (retriever.py 已在 Task 4 包含了 MMR，此 Task 加对比实验函数)

- [ ] **Step 1: 在 retriever.py 追加对比实验函数**

```python
def run_retrieval_comparison(
    retriever: "Retriever",
    queries: List[str],
    top_k: int = 4,
) -> List[Dict[str, Any]]:
    """检索策略对比实验 — 同一批查询用不同策略，记录结果

    Args:
        retriever: Retriever 实例
        queries: 测试问题列表
        top_k: 检索数量

    Returns:
        [{"query": str, "similarity": [...], "mmr": [...]}, ...]
    """
    results = []
    for query in queries:
        sim_results = retriever.similarity_search(query, top_k=top_k)
        mmr_results = retriever.mmr_search(query, top_k=top_k)
        results.append({
            "query": query,
            "similarity": [
                {"content": doc.page_content[:80], "source": doc.metadata.get("source")}
                for doc in sim_results
            ],
            "mmr": [
                {"content": doc.page_content[:80], "source": doc.metadata.get("source")}
                for doc in mmr_results
            ],
        })
        print(f"查询: {query}")
        print(f"  相似度检索: {len(sim_results)} 结果")
        print(f"  MMR 检索:   {len(mmr_results)} 结果")
    return results
```

- [ ] **Step 2: 提交**

```bash
git add src/retriever.py
git commit -m "feat: 检索策略对比实验函数"
```

---

### Task 10: RAGAS 评估体系

**Files:**
- Create: `rag-knowledge-qa/src/evaluator.py`
- Create: `rag-knowledge-qa/tests/test_evaluator.py`
- Create: `rag-knowledge-qa/data/test_questions.json`

- [ ] **Step 1: 创建测试问题集**

```json
[
  {
    "question": "牛顿第一定律的内容是什么？",
    "ground_truth": "任何物体都要保持匀速直线运动或静止状态，直到外力迫使它改变运动状态为止。",
    "type": "简单事实型"
  },
  {
    "question": "什么是惯性？",
    "ground_truth": "惯性是物体保持原有运动状态不变的性质，质量越大惯性越大。",
    "type": "概念解释型"
  },
  {
    "question": "牛顿第二定律的公式是什么？",
    "ground_truth": "F=ma，物体加速度的大小与合外力成正比，与质量成反比。",
    "type": "简单事实型"
  },
  {
    "question": "力的作用效果有哪些？",
    "ground_truth": "力可以改变物体的运动状态（速度大小或方向），也可以使物体发生形变。",
    "type": "概念解释型"
  },
  {
    "question": "什么是重力？",
    "ground_truth": "重力是由于地球的吸引而使物体受到的力，方向竖直向下，大小G=mg。",
    "type": "简单事实型"
  },
  {
    "question": "摩擦力产生的条件是什么？",
    "ground_truth": "两个物体相互接触且有压力、接触面粗糙、有相对运动或相对运动趋势。",
    "type": "概念解释型"
  },
  {
    "question": "二力平衡的条件是什么？",
    "ground_truth": "作用在同一物体上的两个力，大小相等、方向相反、作用在同一直线上。",
    "type": "简单事实型"
  },
  {
    "question": "压强和压力有什么区别？",
    "ground_truth": "压力是垂直作用在物体表面上的力，压强是单位面积上受到的压力，P=F/S。",
    "type": "概念解释型"
  },
  {
    "question": "阿基米德原理的内容是什么？",
    "ground_truth": "浸在液体中的物体受到向上的浮力，浮力大小等于物体排开液体的重力，F浮=G排=ρ液gV排。",
    "type": "简单事实型"
  },
  {
    "question": "功的两个必要因素是什么？",
    "ground_truth": "一是作用在物体上的力，二是物体在力的方向上通过的距离，W=Fs。",
    "type": "简单事实型"
  },
  {
    "question": "动能和势能如何相互转化？",
    "ground_truth": "动能和势能可以相互转化，如滚摆下降时重力势能转化为动能，上升时动能转化为重力势能。",
    "type": "概念解释型"
  },
  {
    "question": "什么是杠杆的平衡条件？",
    "ground_truth": "动力×动力臂=阻力×阻力臂，即F1×L1=F2×L2。",
    "type": "简单事实型"
  },
  {
    "question": "光的反射定律是什么？",
    "ground_truth": "反射光线、入射光线和法线在同一平面内，反射光线和入射光线分居法线两侧，反射角等于入射角。",
    "type": "简单事实型"
  },
  {
    "question": "凸透镜成像的规律是什么？",
    "ground_truth": "物距大于2倍焦距时成倒立缩小实像，物距在1-2倍焦距时成倒立放大实像，物距小于焦距时成正立放大虚像。",
    "type": "概念解释型"
  },
  {
    "question": "什么是串联电路和并联电路？",
    "ground_truth": "串联电路各元件首尾顺次连接，电流只有一条路径；并联电路各元件并列连接，电流有多条路径。",
    "type": "概念解释型"
  },
  {
    "question": "欧姆定律的内容是什么？",
    "ground_truth": "导体中的电流与导体两端的电压成正比，与导体的电阻成反比，I=U/R。",
    "type": "简单事实型"
  },
  {
    "question": "电功率的计算公式有哪些？",
    "ground_truth": "P=W/t=UI=I²R=U²/R，其中P=UI是最基本的公式。",
    "type": "概念解释型"
  },
  {
    "question": "为什么运动的物体最终会停下来？",
    "ground_truth": "因为摩擦力的作用，力是改变物体运动状态的原因，不是维持运动的原因。",
    "type": "概念解释型"
  },
  {
    "question": "牛顿第一定律和第三定律有什么关系和区别？",
    "ground_truth": "第一定律描述物体在不受外力时的运动状态（惯性定律），第三定律描述物体间相互作用的规律（作用力与反作用力）。两者从不同角度描述力的作用规律。",
    "type": "跨文档综合型"
  },
  {
    "question": "比较动能和重力势能的影响因素，并说明为什么从高处落下的物体速度越来越快？",
    "ground_truth": "动能取决于质量和速度，重力势能取决于质量和高度。物体下落时高度减小，重力势能转化为动能，速度增大。这是机械能守恒的体现。",
    "type": "跨文档综合型"
  }
]
```

- [ ] **Step 2: 编写 evaluator.py**

```python
"""RAGAS 评估模块 — 4 指标量化 RAG 系统质量"""
import json
from typing import List, Dict, Any

from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_recall,
    context_precision,
)
from datasets import Dataset
import os

from src.rag_chain import RAGChain


class RAGEvaluator:
    """RAGAS 评估器

    用法:
        evaluator = RAGEvaluator()
        results = evaluator.evaluate_from_file("data/test_questions.json")
        evaluator.print_report(results)
    """

    def __init__(self):
        self.llm = ChatOpenAI(
            model=os.getenv("LLM_MODEL", "deepseek-chat"),
            openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
            openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
        )
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=os.getenv("DEEPSEEK_API_KEY"),
            openai_api_base=os.getenv("DEEPSEEK_BASE_URL"),
        )
        self.metrics = [
            faithfulness,
            answer_relevancy,
            context_recall,
            context_precision,
        ]

    def _build_dataset(
        self, eval_data: List[Dict[str, Any]]
    ) -> Dataset:
        """将评估数据转换为 RAGAS Dataset 格式"""
        records = {
            "question": [],
            "answer": [],
            "contexts": [],
            "ground_truth": [],
        }
        for item in eval_data:
            records["question"].append(item["question"])
            records["answer"].append(item["answer"])
            records["contexts"].append(item["contexts"])
            records["ground_truth"].append(item["ground_truth"])
        return Dataset.from_dict(records)

    def evaluate_from_file(
        self,
        test_file: str = "data/test_questions.json",
        rag_chain: RAGChain | None = None,
    ) -> Dict[str, Any]:
        """从测试文件读取问题，跑 RAG 系统，用 RAGAS 评估

        Args:
            test_file: 测试问题 JSON 文件路径
            rag_chain: RAGChain 实例，不传则自动创建

        Returns:
            评估结果字典，包含每个指标分数和详细数据
        """
        if rag_chain is None:
            rag_chain = RAGChain()

        # 读取测试问题
        with open(test_file, "r", encoding="utf-8") as f:
            test_data = json.load(f)

        # 逐题跑 RAG
        eval_data = []
        print(f"正在评估 {len(test_data)} 个问题...\n")
        for i, item in enumerate(test_data):
            print(f"[{i+1}/{len(test_data)}] {item['question'][:40]}...")
            result = rag_chain.ask(item["question"])

            # 提取 context 文本列表（RAGAS 需要字符串列表）
            contexts = [
                doc.page_content for doc in result["context_docs"]
            ]

            eval_data.append({
                "question": item["question"],
                "answer": result["answer"],
                "contexts": contexts,
                "ground_truth": item["ground_truth"],
            })

        # 构建 Dataset
        dataset = self._build_dataset(eval_data)

        # 运行 RAGAS 评估
        print(f"\n正在计算 RAGAS 指标...")
        scores = evaluate(
            dataset=dataset,
            metrics=self.metrics,
            llm=self.llm,
            embeddings=self.embeddings,
        )

        # 提取分数
        result = {}
        for metric_name in ["faithfulness", "answer_relevancy",
                            "context_recall", "context_precision"]:
            if metric_name in scores:
                result[metric_name] = round(
                    float(scores[metric_name]), 4
                )

        result["eval_data"] = eval_data
        return result

    def print_report(self, scores: Dict[str, Any]) -> None:
        """打印评估报告"""
        print("\n" + "=" * 60)
        print("RAGAS 评估报告")
        print("=" * 60)

        metric_labels = {
            "faithfulness": "忠实度 (Faithfulness)",
            "answer_relevancy": "答案相关性 (Answer Relevancy)",
            "context_recall": "上下文召回率 (Context Recall)",
            "context_precision": "上下文精确率 (Context Precision)",
        }

        for key, label in metric_labels.items():
            score = scores.get(key, "N/A")
            bar = self._score_bar(score) if isinstance(score, float) else "N/A"
            print(f"  {label:30s}: {score:<8} {bar}")

        print("=" * 60)

    def _score_bar(self, score: float, width: int = 20) -> str:
        """生成分数可视化条"""
        filled = int(score * width)
        return f"[{'█' * filled}{'░' * (width - filled)}]"

    def compare(
        self,
        baseline: Dict[str, Any],
        optimized: Dict[str, Any],
    ) -> Dict[str, Any]:
        """对比基线和优化后的评估结果"""
        comparison = {}
        for metric in ["faithfulness", "answer_relevancy",
                       "context_recall", "context_precision"]:
            base_score = baseline.get(metric, 0)
            opt_score = optimized.get(metric, 0)
            if base_score and opt_score:
                change = (opt_score - base_score) / base_score * 100
            else:
                change = 0
            comparison[metric] = {
                "baseline": base_score,
                "optimized": opt_score,
                "change_pct": round(change, 1),
            }
        return comparison


if __name__ == "__main__":
    evaluator = RAGEvaluator()
    scores = evaluator.evaluate_from_file("data/test_questions.json")
    evaluator.print_report(scores)
```

- [ ] **Step 3: 编写 evaluator 测试**

```python
# tests/test_evaluator.py
def test_evaluator_initialization():
    """评估器应能正常初始化"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    assert evaluator is not None
    assert len(evaluator.metrics) == 4


def test_score_bar():
    """分数可视化条应正确生成"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    bar = evaluator._score_bar(0.75, width=10)
    assert len(bar) >= 10
    assert "█" in bar


def test_compare_returns_change_pct():
    """对比函数应计算变化百分比"""
    from src.evaluator import RAGEvaluator
    evaluator = RAGEvaluator()
    baseline = {"faithfulness": 0.6, "answer_relevancy": 0.7}
    optimized = {"faithfulness": 0.8, "answer_relevancy": 0.8}
    comparison = evaluator.compare(baseline, optimized)
    assert comparison["faithfulness"]["change_pct"] > 0
    assert comparison["answer_relevancy"]["change_pct"] > 0
```

- [ ] **Step 4: 运行测试**

```bash
python3 -m pytest tests/test_evaluator.py -v
```

- [ ] **Step 5: 提交**

```bash
git add src/evaluator.py tests/test_evaluator.py data/test_questions.json
git commit -m "feat: RAGAS 评估体系 — 4指标 + 20题测试集"
```

---

### Task 11: 第2周优化迭代

**Files:**
- Create: `rag-knowledge-qa/notebooks/experiments.ipynb`

- [ ] **Step 1: 运行基线评估（第1周配置）**

```bash
cd rag-knowledge-qa
python3 -m src.evaluator
```

记录基线分数。

- [ ] **Step 2: 分块策略对比实验**

```bash
python3 -c "
from src.pipeline import load_pdfs, clean_documents, run_chunking_experiment
docs = load_pdfs('./data/pdfs')
docs = clean_documents(docs)
results = run_chunking_experiment(docs)
"
```

- [ ] **Step 3: 用最优分块参数重建向量库**

```bash
python3 -c "
from src.pipeline import run_pipeline
# 根据实验结果调整参数
run_pipeline(chunk_size=1000, chunk_overlap=200)
"
```

- [ ] **Step 4: 重新评估，输出对比报告**

```bash
python3 -c "
from src.evaluator import RAGEvaluator
evaluator = RAGEvaluator()
# 加载基线分数
import json
with open('data/baseline_scores.json') as f:
    baseline = json.load(f)
optimized = evaluator.evaluate_from_file('data/test_questions.json')
comparison = evaluator.compare(baseline, optimized)
print(json.dumps(comparison, indent=2, ensure_ascii=False))
"
```

- [ ] **Step 5: 提交**

```bash
git add data/baseline_scores.json notebooks/
git commit -m "feat: 第2周优化迭代 — 基线评估 + 对比实验"
```

---

### Task 12: 第2周收尾 — 知识点文档

**Files:**
- Create: `rag-knowledge-qa/docs/knowledge/04-retrieval-strategies.md`
- Create: `rag-knowledge-qa/docs/knowledge/06-rag-evaluation.md`

- [ ] **Step 1: 编写 04-retrieval-strategies.md**

```markdown
# 检索策略

> 学习时间: 2026-06-0X | 所属阶段: 第2周

## 一、核心概念

**检索是 RAG 的质量瓶颈** — 检索到的文档不对，生成就不可能对。

**三种检索策略对比:**

| 策略 | 原理 | 适用场景 |
|------|------|---------|
| 余弦相似度 | 向量夹角余弦值，越接近1越相似 | 基准策略 |
| MMR | 在相关性和多样性间平衡 | 避免检索到重复内容 |
| 混合检索 | 向量(语义) + BM25(关键词) | 精确术语 + 语义理解 |

**MMR 的 λ 参数:**
- λ=1: 纯相似度排序
- λ=0: 纯多样性排序
- λ=0.5: 平衡（推荐起点）

## 二、关键代码/用法

_（边做边补充）_

## 三、实验记录 & 踩坑

_（边做边补充）_

## 四、面试可能会问

**Q: 向量检索和关键词检索各有什么优缺点？**
A: 向量检索擅长语义匹配（"汽车"能匹配"轿车"），但可能漏掉精确关键词。关键词检索精确但不懂同义词。混合检索取两者之长。

**Q: 为什么要用 Rerank？**
A: 第一轮检索（粗排）速度快但精度一般，Rerank（精排）用更强的模型对 Top-K 结果重新排序，提升精准度。是性价比最高的优化手段之一。
```

- [ ] **Step 2: 编写 06-rag-evaluation.md**

```markdown
# RAGAS 评估体系

> 学习时间: 2026-06-0X | 所属阶段: 第2周

## 一、核心概念

**RAGAS (RAG Assessment)** — RAG 系统的标准评估框架。

**四个指标:**
1. Faithfulness: 答案是否忠于检索上下文？（反幻觉）
2. Answer Relevancy: 答案是否切题？（反跑题）
3. Context Recall: 检索是否找全了相关信息？（反遗漏）
4. Context Precision: 检索结果是否噪声少？（反干扰）

**评估流程:** 测试集 → 跑 RAG → 收集问答对 → RAGAS 打分

## 二、关键代码/用法

_（边做边补充）_

## 三、实验记录 & 踩坑

_（边做边补充）_

## 四、面试可能会问

**Q: 你的 RAG 系统质量如何度量？**
A: 使用 RAGAS 四个指标：Faithfulness 衡量是否编造，Answer Relevancy 衡量是否答非所问，Context Recall/Precision 衡量检索质量。从基线出发，通过实验驱动优化。

**Q: 评估指标和用户满意度一致吗？**
A: 不一定。自动指标是必要的但不是充分的，最终还需要人工评估。但自动指标可以快速迭代，成本低。
```

- [ ] **Step 3: 提交**

```bash
git add docs/knowledge/
git commit -m "docs: 第2周知识点文档 (04/06)"
```

---

## 第3周：产品化

### Task 13: Gradio Web UI

**Files:**
- Create: `rag-knowledge-qa/app.py`

- [ ] **Step 1: 实现 app.py**

```python
"""Gradio Web UI — RAG 知识库问答系统前端"""
import gradio as gr
from src.rag_chain import RAGChain
from src.config import Config

# 全局 RAG Chain 实例
rag_chain: RAGChain | None = None


def get_chain() -> RAGChain:
    """延迟初始化 RAG Chain"""
    global rag_chain
    if rag_chain is None:
        rag_chain = RAGChain()
    return rag_chain


def ask_question(
    question: str,
    history: list,
    top_k: int = 4,
    search_type: str = "similarity",
):
    """处理用户提问，返回 Gradio ChatInterface 格式的响应"""
    if not question.strip():
        return "请输入问题"

    chain = get_chain()
    chain.top_k = top_k
    result = chain.ask(question, search_type=search_type)

    # 构建回答文本
    answer = result["answer"]

    # 追加引用来源
    if result["sources"]:
        answer += "\n\n---\n📚 **参考来源:**\n"
        for i, src in enumerate(result["sources"], 1):
            answer += (
                f"\n[{i}] **{src['source']}**"
                f" (第{src['page']}页)"
            )

    return answer


def rebuild_knowledge_base(pdf_dir: str = "./data/pdfs"):
    """重新构建知识库"""
    from src.pipeline import run_pipeline
    global rag_chain

    try:
        run_pipeline(
            pdf_dir=pdf_dir,
            chunk_size=Config.CHUNK_SIZE,
            chunk_overlap=Config.CHUNK_OVERLAP,
        )
        rag_chain = None  # 重置 chain, 下次使用时会重新加载
        return "✅ 知识库重建完成!"
    except Exception as e:
        return f"❌ 重建失败: {str(e)}"


# === Gradio 界面 ===

with gr.Blocks(title="RAG 知识库问答系统", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 📚 RAG 知识库问答系统

    基于初中学科知识库的智能问答助手。
    上传 PDF 教材后，即可通过自然语言提问获取答案。
    """)

    with gr.Tab("💬 问答"):
        gr.ChatInterface(
            fn=ask_question,
            additional_inputs=[
                gr.Slider(
                    minimum=1, maximum=10, value=4, step=1,
                    label="检索数量 (Top-K)",
                ),
                gr.Radio(
                    choices=["similarity", "mmr"],
                    value="similarity",
                    label="检索策略",
                ),
            ],
            title="",
            description="输入你的问题，系统将从知识库中检索相关文档并生成回答",
        )

    with gr.Tab("⚙️ 知识库管理"):
        gr.Markdown("### 管理知识库")
        pdf_dir_input = gr.Textbox(
            value="./data/pdfs",
            label="PDF 文件目录",
        )
        rebuild_btn = gr.Button("🔄 重新构建知识库", variant="primary")
        rebuild_output = gr.Textbox(label="操作结果")

        rebuild_btn.click(
            fn=rebuild_knowledge_base,
            inputs=[pdf_dir_input],
            outputs=[rebuild_output],
        )

        gr.Markdown("""
        ---
        ### 使用说明
        1. 将 PDF 文件放入 `data/pdfs/` 目录
        2. 点击"重新构建知识库"
        3. 切换到"问答"标签页开始提问
        """)

    with gr.Tab("📊 系统信息"):
        gr.Markdown(f"""
        ### 当前配置

        | 参数 | 值 |
        |------|-----|
        | LLM 模型 | {Config.LLM_MODEL} |
        | Temperature | {Config.LLM_TEMPERATURE} |
        | Chunk Size | {Config.CHUNK_SIZE} |
        | Chunk Overlap | {Config.CHUNK_OVERLAP} |
        | 检索 Top-K | {Config.RETRIEVER_TOP_K} |
        | 向量库路径 | {Config.CHROMA_PERSIST_DIR} |
        """)

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
    )
```

- [ ] **Step 2: 启动测试**

```bash
cd rag-knowledge-qa
python3 app.py
# 浏览器打开 http://localhost:7860
# 测试: 输入问题 → 验证返回答案+引用来源
```

- [ ] **Step 3: 提交**

```bash
git add app.py
git commit -m "feat: Gradio Web UI — ChatInterface + 知识库管理"
```

---

### Task 14: 多轮对话支持

**Files:**
- Modify: `rag-knowledge-qa/src/generator.py`
- Modify: `rag-knowledge-qa/app.py`

- [ ] **Step 1: 在 generator.py 追加多轮对话 Prompt**

```python
CONVERSATION_SYSTEM_PROMPT = """你是初中学科知识问答助手。请严格基于以下参考资料回答问题。

规则：
1. 如果资料中包含答案，准确引用并注明来源
2. 如果资料中不包含答案，请明确说"参考资料中未找到相关信息"
3. 回答要简洁清晰，适合初中生理解
4. 注意结合对话历史理解用户意图（如追问、指代等）

参考资料：
{context}"""

CONVERSATION_USER_PROMPT = """对话历史：
{chat_history}

当前问题：{question}

请基于对话上下文和参考资料回答。"""
```

- [ ] **Step 2: 在 Generator 类追加多轮对话方法**

```python
def generate_with_history(
    self,
    question: str,
    context_docs: List[Document],
    chat_history: List[Dict[str, str]],
    max_history_turns: int = 5,
) -> Dict[str, Any]:
    """多轮对话生成

    Args:
        question: 当前问题
        context_docs: 检索到的文档块
        chat_history: [{"role": "user", "content": "..."},
                        {"role": "assistant", "content": "..."}, ...]
        max_history_turns: 最多保留最近 N 轮对话

    Returns:
        同 generate()
    """
    # 只保留最近 N 轮
    recent_history = chat_history[-(max_history_turns * 2):]

    # 格式化对话历史
    history_text = ""
    for msg in recent_history:
        role = "👤 用户" if msg["role"] == "user" else "🤖 助手"
        history_text += f"{role}: {msg['content']}\n"

    if not history_text:
        history_text = "（无历史对话）"

    context = format_docs(context_docs)
    system_part = CONVERSATION_SYSTEM_PROMPT.format(context=context)
    user_part = CONVERSATION_USER_PROMPT.format(
        chat_history=history_text, question=question
    )
    prompt = system_part + "\n\n" + user_part

    response = self.llm.invoke(prompt)
    sources = self._extract_sources(context_docs)

    return {
        "answer": response.content,
        "sources": sources,
        "prompt": prompt,
    }
```

- [ ] **Step 3: 提交**

```bash
git add src/generator.py
git commit -m "feat: 多轮对话支持 — 对话历史记忆"
```

---

### Task 15: 第3周收尾 — README + v1.0

**Files:**
- Create: `rag-knowledge-qa/README.md`
- Create: `rag-knowledge-qa/docs/knowledge/07-productization.md`

- [ ] **Step 1: 编写 README.md**

```markdown
# RAG 知识库问答系统

基于 RAG (Retrieval-Augmented Generation) 的初中学科知识库问答系统。

## 架构

```
PDF → 非结构化处理 → 分块 → Embedding → Chroma 向量库
                                              ↓
用户问题 → 向量检索 → Prompt 组装 → DeepSeek LLM → 答案 + 引用
```

## 快速开始

### 1. 环境准备

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 配置 API Key

```bash
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY
```

### 3. 准备知识库数据

将 PDF 教材文件放入 `data/pdfs/` 目录。

### 4. 构建知识库

```bash
python3 -m src.pipeline
```

### 5. 启动问答

**命令行模式:**
```bash
python3 -m src.rag_chain
```

**Web 界面模式:**
```bash
python3 app.py
# 浏览器打开 http://localhost:7860
```

## 项目结构

```
├── src/
│   ├── config.py          # 配置管理
│   ├── pipeline.py        # 数据Pipeline + 分块策略
│   ├── retriever.py       # 检索器 (相似度/MMR)
│   ├── generator.py       # 生成器 (Prompt+LLM+多轮对话)
│   ├── rag_chain.py       # RAG 完整链路
│   └── evaluator.py       # RAGAS 评估
├── app.py                 # Gradio Web UI
├── tests/                 # 单元测试
├── data/
│   ├── pdfs/              # PDF 知识库
│   └── test_questions.json # 评估测试集
└── docs/knowledge/        # 知识点文档 (7篇)
```

## 技术栈

| 组件 | 技术 |
|------|------|
| LLM | DeepSeek Chat API |
| Embedding | DeepSeek Embedding / BGE-M3 |
| 向量数据库 | Chroma (本地持久化) |
| 框架 | LangChain |
| Web UI | Gradio |
| 评估 | RAGAS (4指标) |
| 非结构化处理 | Unstructured + PyPDF |

## 评估结果

| 指标 | 基线 (v0.1) | 优化后 (v1.0) | 提升 |
|------|------------|-------------|------|
| Faithfulness | - | - | - |
| Answer Relevancy | - | - | - |
| Context Recall | - | - | - |
| Context Precision | - | - | - |

## 知识点文档

| 序号 | 文档 | 内容 |
|------|------|------|
| 01 | RAG 整体架构 | 离线/在线流程、核心模块 |
| 02 | 数据Pipeline & 分块 | 4种分块策略对比 |
| 03 | Embedding & 向量数据库 | Chroma 使用、向量检索原理 |
| 04 | 检索策略 | 相似度/MMR/混合检索 |
| 05 | Prompt 模板设计 | 模板设计、防幻觉策略 |
| 06 | RAGAS 评估 | 4指标、评估方法论 |
| 07 | 产品化 | Gradio、多轮对话 |

## License

MIT
```

- [ ] **Step 2: 编写 07-productization.md**

```markdown
# Gradio 产品化

> 学习时间: 2026-06-0X | 所属阶段: 第3周

## 一、核心概念

**产品化的意义:** 从脚本到产品，让非技术人员也能使用你的 RAG 系统。

**Gradio 的选择理由:**
- ChatInterface 组件开箱即用
- 支持多轮对话历史管理
- 和 HuggingFace 生态无缝对接

## 二、关键代码/用法

_（边做边补充）_

## 三、实验记录 & 踩坑

_（边做边补充）_

## 四、面试可能会问

**Q: RAG 系统产品化需要注意什么？**
A: 响应延迟（检索+生成两段）、知识库更新机制、引用来源展示（增加可信度）、错误处理（API 超时/限流）。
```

- [ ] **Step 3: 最终 RAGAS 评估**

```bash
python3 -m src.evaluator
```

将分数填入 README.md 的评估结果表格。

- [ ] **Step 4: 打 v1.0 Tag**

```bash
git add README.md docs/knowledge/07-productization.md
git commit -m "docs: v1.0 发布 — README + 知识点文档全部完成"
git tag v1.0
```

---

## 验证清单

### 第1周验收
- [ ] `python src/rag_chain.py` 能交互式问答
- [ ] 回答包含引用来源（文件名+页码）
- [ ] 知识点文档 01/02/03/05 完成
- [ ] GitHub 有提交记录

### 第2周验收
- [ ] `retriever.mmr_search()` 可正常工作
- [ ] `python -m src.evaluator` 输出 4 指标分数
- [ ] 优化后至少 2 个指标比基线提升 10%+
- [ ] 知识点文档 04/06 完成

### 第3周验收
- [ ] `python app.py` 启动 Gradio，浏览器可访问
- [ ] 多轮对话正常（追问、指代理解）
- [ ] README 包含架构图、使用说明、评估结果
- [ ] `git tag v1.0` 存在
- [ ] 7 篇知识点文档全部完成

---

> **关联文档:** [技术方案](../specs/2026-06-03-rag-knowledge-qa-design.md)
