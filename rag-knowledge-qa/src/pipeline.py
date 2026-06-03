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
            print(f"  OK 加载: {pdf_file} ({len(docs)} 页)")
        except Exception as e:
            print(f"  FAIL 加载失败: {pdf_file}, 错误: {e}")

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


# ============================================================
# Task 3: 文档分块 + 向量化存储
# ============================================================

from langchain_text_splitters import RecursiveCharacterTextSplitter
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
    use_deepseek_embedding: bool = False,
    embedding_model: str = "text-embedding-3-small",
) -> Chroma:
    """将文档向量化并存入 Chroma

    Args:
        docs: 待向量化的文档列表
        persist_dir: Chroma 持久化目录
        use_deepseek_embedding: True=API Embedding, False=BGE-M3 本地
        embedding_model: API Embedding 模型名（仅 API 模式）

    Returns:
        Chroma vectorstore 实例
    """
    if use_deepseek_embedding:
        from langchain_openai import OpenAIEmbeddings
        from src.config import Config
        embeddings = OpenAIEmbeddings(
            model=embedding_model,
            openai_api_key=Config.DEEPSEEK_API_KEY,
            openai_api_base=Config.DEEPSEEK_BASE_URL,
        )
    else:
        from langchain_huggingface import HuggingFaceEmbeddings
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
    use_deepseek_embedding: bool = False,
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
