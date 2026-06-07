"""Gradio Web UI — RAG 知识库问答系统前端

用法: python app.py
浏览器打开 http://localhost:7860
"""
import gradio as gr
from src.rag_chain import RAGChain
from src.config import Config

# 全局 RAG Chain 实例（延迟初始化）
_rag_chain: RAGChain | None = None


def get_chain() -> RAGChain:
    """延迟初始化 RAG Chain"""
    global _rag_chain
    if _rag_chain is None:
        _rag_chain = RAGChain()
    return _rag_chain


def ask_question(
    message: str,
    history: list,
    top_k: int = 4,
    search_type: str = "similarity",
):
    """处理用户提问，返回 Gradio ChatInterface 格式的响应

    Args:
        message: 用户输入
        history: Gradio 对话历史 [{"role": "user", "content": ...}, ...]
        top_k: 检索数量
        search_type: "similarity" 或 "mmr"
    """
    if not message.strip():
        return "请输入问题"

    chain = get_chain()
    chain.top_k = top_k

    # 检索
    context_docs = chain.retriever.similarity_search(message, top_k=top_k)

    # 多轮对话模式
    if history:
        result = chain.generator.generate_with_history(
            question=message,
            context_docs=context_docs,
            chat_history=history,
        )
    else:
        result = chain.ask(message, search_type=search_type)

    # 构建回答文本
    answer = result["answer"]

    # 追加引用来源（可点击展开查看原文）
    if result["context_docs"]:
        answer += "\n\n---\n📚 **参考来源（点击展开查看原文）:**\n"
        for i, doc in enumerate(result["context_docs"], 1):
            source = doc.metadata.get("source", "未知")
            page = doc.metadata.get("page", "?")
            content = doc.page_content.replace("\n", "<br>")
            answer += (
                f'\n<details><summary><b>[{i}] {source} (第{page}页)</b></summary>\n\n'
                f'{content}\n'
                f'</details>\n'
            )

    return answer


def rebuild_knowledge_base(pdf_dir: str = "./data/pdfs"):
    """重新构建知识库"""
    from src.pipeline import run_pipeline

    global _rag_chain

    try:
        run_pipeline(
            pdf_dir=pdf_dir,
            chunk_size=Config.CHUNK_SIZE,
            chunk_overlap=Config.CHUNK_OVERLAP,
        )
        _rag_chain = None  # 重置 chain，下次使用时会重新加载
        return "✅ 知识库重建完成!"
    except Exception as e:
        return f"❌ 重建失败: {str(e)}"


# === Gradio 界面 ===

with gr.Blocks(title="RAG 知识库问答系统") as demo:
    gr.Markdown("""
    # 📚 RAG 知识库问答系统

    基于初中物理知识库的智能问答助手。
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
        | Embedding | {Config.EMBEDDING_API_MODEL} (2560维) |
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
