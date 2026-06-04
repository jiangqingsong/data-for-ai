"""Chroma 向量库交互式探索工具

用法: python explore.py

支持的命令:
  search <query>      — 相似度检索 (默认 top_k=5)
  mmr <query>         — MMR 检索 (多样性优先)
  top_k <N>           — 设置返回数量 (默认 5)
  stats               — 查看向量库统计信息
  sample [N]          — 随机查看 N 条数据 (默认 5)
  page <N>            — 查看指定页码的所有 chunk
  help                — 显示帮助
  quit / exit / q     — 退出
"""

import os
import sys

# Ensure project root is on path (needed when running from any directory)
_project_root = os.path.dirname(os.path.abspath(__file__))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Fix Windows GBK console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main():
    from src.retriever import Retriever

    retriever = Retriever()
    top_k = 5

    # 获取 collection 信息
    collection = retriever.vectorstore._collection
    total = collection.count()

    print("=" * 55)
    print("  Chroma Vectorstore Explorer")
    print(f"  Collection: {collection.name}")
    print(f"  Total vectors: {total}")
    print(f"  Embedding: doubao-embedding-text-240715 (2560d)")
    print("=" * 55)
    print("  Commands: search | mmr | top_k | stats | sample | page | help")
    print("  Type 'quit' to exit")
    print("=" * 55)
    print()

    while True:
        try:
            cmd = input(">> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break

        if not cmd:
            continue

        parts = cmd.split(maxsplit=1)
        action = parts[0].lower()
        arg = parts[1] if len(parts) > 1 else ""

        # --- quit ---
        if action in ("quit", "exit", "q"):
            print("Bye!")
            break

        # --- help ---
        elif action == "help":
            print(__doc__)

        # --- top_k ---
        elif action == "top_k":
            try:
                top_k = int(arg)
                print(f"top_k set to {top_k}")
            except ValueError:
                print(f"Invalid number: {arg}")

        # --- stats ---
        elif action == "stats":
            print(f"Collection: {collection.name}")
            print(f"Total vectors: {total}")
            print(f"Top-K default: {top_k}")
            # 统计页面分布
            sample_all = collection.get(limit=total, include=["metadatas"])
            pages = set()
            sources = set()
            for m in sample_all["metadatas"]:
                pages.add(m.get("page", "?"))
                sources.add(m.get("source", "?"))
            print(f"Unique pages: {len(pages)}")
            print(f"Sources: {', '.join(sources)}")
            print()

        # --- sample ---
        elif action == "sample":
            n = int(arg) if arg.isdigit() else 5
            n = min(n, total)
            import random
            sample = collection.get(
                limit=total, include=["metadatas", "documents"]
            )
            indices = random.sample(range(total), n)
            for i, idx in enumerate(indices, 1):
                doc = sample["documents"][idx]
                meta = sample["metadatas"][idx]
                src = meta.get("source", "?")
                page = meta.get("page", "?")
                text = doc[:100].replace("\n", " ")
                print(f"[{i}] {src} | page {page}")
                print(f"    {text}...")
                print()

        # --- page ---
        elif action == "page":
            if not arg.isdigit():
                print("Usage: page <page_number>")
                continue
            page_num = int(arg)
            sample_all = collection.get(
                limit=total, include=["metadatas", "documents"]
            )
            found = []
            for doc, meta in zip(
                sample_all["documents"], sample_all["metadatas"]
            ):
                if meta.get("page") == page_num:
                    found.append((doc, meta))
            if not found:
                print(f"No chunks found on page {page_num}")
            else:
                print(f"Page {page_num}: {len(found)} chunk(s)")
                for j, (doc, meta) in enumerate(found, 1):
                    text = doc[:150].replace("\n", " ")
                    print(f"  [{j}] {text}...")
            print()

        # --- search ---
        elif action == "search":
            if not arg:
                print("Usage: search <query>")
                continue
            results = retriever.similarity_search(arg, top_k=top_k)
            _print_results(results, "Similarity Search", arg)

        # --- mmr ---
        elif action == "mmr":
            if not arg:
                print("Usage: mmr <query>")
                continue
            results = retriever.mmr_search(arg, top_k=top_k)
            _print_results(results, "MMR Search", arg)

        else:
            # 默认当作 search
            results = retriever.similarity_search(cmd, top_k=top_k)
            _print_results(results, "Similarity Search", cmd)


def _print_results(results, method, query):
    print(f"--- {method}: '{query}' ({len(results)} results) ---")
    if not results:
        print("  No results found.")
        print()
        return
    for i, doc in enumerate(results, 1):
        src = doc.metadata.get("source", "?")
        page = doc.metadata.get("page", "?")
        text = doc.page_content[:150].replace("\n", " ")
        print(f"  [{i}] {src}  p.{page}")
        print(f"      {text}...")
        print()


if __name__ == "__main__":
    main()
