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
    embedding_model: str | None = None,
) -> Chroma:
    """将文档向量化并存入 Chroma

    Args:
        docs: 待向量化的文档列表
        persist_dir: Chroma 持久化目录
        embedding_model: None=自动读取 Config, 或手动指定模型名

    Returns:
        Chroma vectorstore 实例
    """
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
        chunks, persist_dir
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


# ============================================================
# Task 8: 高级分块策略
# ============================================================

def semantic_split(
    docs: List[Document],
    embedding_model: str | None = None,
    threshold_percentile: float = 90,
) -> List[Document]:
    """语义分块 — 基于 Embedding 相似度骤降点切分

    原理:
      1. 将文档拆成句子
      2. 计算相邻句子的 Embedding 余弦相似度
      3. 相似度低于阈值（分位点）的位置 = 切分点

    Args:
        docs: 原始文档列表
        embedding_model: Embedding 模型名 (None=读 Config)
        threshold_percentile: 相似度阈值分位点，越大切得越细

    Returns:
        语义分块后的文档列表
    """
    from langchain_experimental.text_splitter import SemanticChunker
    from src.config import Config
    from langchain_openai import OpenAIEmbeddings

    if embedding_model is None:
        embedding_model = Config.EMBEDDING_API_MODEL

    embeddings = OpenAIEmbeddings(
        model=embedding_model,
        openai_api_key=Config.DEEPSEEK_API_KEY,
        openai_api_base=Config.DEEPSEEK_BASE_URL,
        tiktoken_enabled=False,
        check_embedding_ctx_length=False,
    )

    splitter = SemanticChunker(
        embeddings=embeddings,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount=threshold_percentile,
    )
    chunks = splitter.split_documents(docs)
    print(f"语义分块完成: {len(docs)} 页面 → {len(chunks)} 个块")
    return chunks


def structural_split(
    docs: List[Document],
) -> List[Document]:
    """按文档结构分块 — 利用标题层级切分

    尝试检测 Markdown 标题结构来切分。对于纯文本 PDF，
    会尝试识别章节标题模式（如"第X章""第X节"）作为切分边界。

    Args:
        docs: 原始文档列表

    Returns:
        结构分块后的文档列表
    """
    import re
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    # 中文教材常见的章节标题模式
    chapter_patterns = [
        r"第[一二三四五六七八九十\d]+章",   # 第X章
        r"第\d+节",                          # 第X节
    ]

    all_chunks = []
    for doc in docs:
        text = doc.page_content
        # 尝试按章节标题切分
        combined_pattern = "(" + "|".join(chapter_patterns) + ")"
        sections = re.split(combined_pattern, text)

        if len(sections) <= 1:
            # 没有匹配到章节结构，整页作为一个块
            if len(text.strip()) > 10:
                all_chunks.append(doc)
            continue

        # 重新组装：标题 + 内容
        i = 0
        while i < len(sections):
            section_text = sections[i]
            if re.match(combined_pattern, section_text) and i + 1 < len(sections):
                # 标题 + 下一段内容
                chunk_text = section_text + sections[i + 1]
                i += 2
            else:
                chunk_text = section_text
                i += 1

            if len(chunk_text.strip()) > 10:
                from langchain_core.documents import Document as Doc
                new_doc = Doc(
                    page_content=chunk_text.strip(),
                    metadata=doc.metadata.copy(),
                )
                all_chunks.append(new_doc)

    # 对于过大的块，用 RecursiveCharacterTextSplitter 二次切分
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=200,
        separators=["\n\n", "\n", "。", ".", " ", ""],
        length_function=len,
    )
    final_chunks = splitter.split_documents(all_chunks)

    print(f"结构分块完成: {len(docs)} 页面 → {len(final_chunks)} 个块")
    return final_chunks


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
        child_chunk_overlap: 子块重叠大小

    Returns:
        (parent_docs, child_docs) 元组
    """
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    # 父块切分器（大块）
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=int(parent_chunk_size * 0.1),
        separators=["\n\n", "\n", "。", ".", " ", ""],
        length_function=len,
    )

    # 子块切分器（小块）
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=child_chunk_overlap,
        separators=["\n\n", "\n", "。", ".", " ", ""],
        length_function=len,
    )

    parent_docs = parent_splitter.split_documents(docs)
    child_docs = child_splitter.split_documents(docs)

    # 为子块建立到父块的映射关系
    for i, parent in enumerate(parent_docs):
        parent.metadata["parent_id"] = f"parent_{i}"

    for child in child_docs:
        # 找到包含此子块的父块（通过内容前50字符匹配）
        for i, parent in enumerate(parent_docs):
            if child.page_content[:50] in parent.page_content:
                child.metadata["parent_id"] = f"parent_{i}"
                break

    print(
        f"小2大分块: {len(docs)} 页面"
        f" → {len(parent_docs)} 父块 + {len(child_docs)} 子块"
    )
    return parent_docs, child_docs


def run_chunking_experiment(
    docs: List[Document],
) -> dict:
    """分块策略对比实验 — 一次运行，四种策略，记录统计信息

    Returns:
        {"fixed": {chunks, avg_size}, "semantic": {...},
         "structural": {...}, "parent_child": {...}}
    """
    results = {}

    # 策略1: 固定大小分块（基线）
    print("\n--- 策略1: 固定大小分块 ---")
    fixed_chunks = split_documents(docs, chunk_size=1000, chunk_overlap=200)
    results["fixed"] = {
        "chunks": len(fixed_chunks),
        "avg_size": round(
            sum(len(c.page_content) for c in fixed_chunks)
            / max(len(fixed_chunks), 1)
        ),
    }
    print(f"  → {len(fixed_chunks)} chunks, 平均 {results['fixed']['avg_size']} 字符")

    # 策略2: 语义分块
    print("\n--- 策略2: 语义分块 ---")
    try:
        semantic_chunks = semantic_split(docs)
        results["semantic"] = {
            "chunks": len(semantic_chunks),
            "avg_size": round(
                sum(len(c.page_content) for c in semantic_chunks)
                / max(len(semantic_chunks), 1)
            ),
        }
        print(f"  → {len(semantic_chunks)} chunks, 平均 {results['semantic']['avg_size']} 字符")
    except Exception as e:
        print(f"  语义分块失败: {e}")
        results["semantic"] = {"error": str(e)}

    # 策略3: 结构分块
    print("\n--- 策略3: 结构分块 ---")
    try:
        structural_chunks = structural_split(docs)
        results["structural"] = {
            "chunks": len(structural_chunks),
            "avg_size": round(
                sum(len(c.page_content) for c in structural_chunks)
                / max(len(structural_chunks), 1)
            ),
        }
        print(f"  → {len(structural_chunks)} chunks, 平均 {results['structural']['avg_size']} 字符")
    except Exception as e:
        print(f"  结构分块失败: {e}")
        results["structural"] = {"error": str(e)}

    # 策略4: 小2大分块
    print("\n--- 策略4: 小2大分块 ---")
    parent_docs, child_docs = parent_document_split(docs)
    results["parent_child"] = {
        "parents": len(parent_docs),
        "children": len(child_docs),
        "parent_avg_size": round(
            sum(len(p.page_content) for p in parent_docs)
            / max(len(parent_docs), 1)
        ),
        "child_avg_size": round(
            sum(len(c.page_content) for c in child_docs)
            / max(len(child_docs), 1)
        ),
    }
    print(
        f"  → {len(parent_docs)} 父块 (avg {results['parent_child']['parent_avg_size']} 字符)"
        f" + {len(child_docs)} 子块 (avg {results['parent_child']['child_avg_size']} 字符)"
    )

    # 打印汇总
    print("\n" + "=" * 55)
    print("分块策略对比汇总")
    print("=" * 55)
    print(f"  {'策略':<14} {'块数':<8} {'平均大小':<10}")
    print(f"  {'-'*32}")
    for name, label in [
        ("fixed", "固定大小"),
        ("semantic", "语义分块"),
        ("structural", "结构分块"),
    ]:
        info = results.get(name, {})
        if "error" in info:
            print(f"  {label:<14} {'ERROR':<8} {info['error'][:30]}")
        else:
            print(f"  {label:<14} {info.get('chunks', '?'):<8} {info.get('avg_size', '?'):<10}")
    pc = results.get("parent_child", {})
    print(f"  {'小2大(子)':<14} {pc.get('children', '?'):<8} {pc.get('child_avg_size', '?'):<10}")
    print(f"  {'小2大(父)':<14} {pc.get('parents', '?'):<8} {pc.get('parent_avg_size', '?'):<10}")
    print("=" * 55)

    return results
