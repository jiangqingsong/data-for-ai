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
