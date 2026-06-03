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
