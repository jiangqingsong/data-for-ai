"""RAG 完整链路 — 串联检索器 + 生成器，提供统一问答接口

用法:
    chain = RAGChain()
    result = chain.ask("牛顿第一定律是什么？")
    print(result["answer"])
    for src in result["sources"]:
        print(f"  - {src['source']} (第{src['page']}页)")

命令行: python -m src.rag_chain
"""
from typing import Dict, Any

from src.config import Config
from src.retriever import Retriever
from src.generator import Generator


class RAGChain:
    """RAG 问答链路 — 检索 → 生成 → 返回答案+来源"""

    def __init__(
        self,
        persist_dir: str | None = None,
        top_k: int | None = None,
    ):
        self.persist_dir = persist_dir or Config.CHROMA_PERSIST_DIR
        self.top_k = top_k or Config.RETRIEVER_TOP_K

        self.retriever = Retriever(persist_dir=self.persist_dir)
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
    import sys
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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
