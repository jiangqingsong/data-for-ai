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
        """组装完整的 Prompt（System + Context + User）"""
        context = format_docs(context_docs)
        system_part = SYSTEM_PROMPT.format(context=context)
        user_part = USER_PROMPT.format(question=question)
        return system_part + "\n\n" + user_part

    def _extract_sources(
        self, context_docs: List[Document]
    ) -> List[Dict[str, Any]]:
        """从检索文档中提取引用来源，同文件同页去重"""
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
