"""配置管理模块 — 从 E:/AI-env/llm/config.json 读取敏感信息

所有 API Key、URL 等敏感配置统一管理在项目外部的配置文件中，
不随代码入库，多项目共享。

配置文件位置: E:/AI-env/llm/config.json
"""
import json
import os
from pathlib import Path


# 统一配置文件路径（多项目共享）
_CONFIG_DIR = Path("E:/AI-env/llm")
_CONFIG_FILE = _CONFIG_DIR / "config.json"


def _load_secret_config() -> dict:
    """加载外部敏感配置文件"""
    if not _CONFIG_FILE.exists():
        return {}
    try:
        with open(_CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


_secret = _load_secret_config()
_deepseek = _secret.get("deepseek", {})
_embedding = _secret.get("embedding", {})


class Config:
    """应用配置 — 敏感信息从外部文件读取，普通参数有合理默认值"""

    # --- DeepSeek API (火山引擎) ---
    DEEPSEEK_API_KEY: str = _deepseek.get("api_key", "")
    DEEPSEEK_BASE_URL: str = _deepseek.get(
        "base_url", "https://ark.cn-beijing.volces.com/api/v3"
    )

    # --- LLM ---
    LLM_MODEL: str = _deepseek.get("model", "deepseek-chat")
    LLM_TEMPERATURE: float = float(_deepseek.get("temperature", 0.1))
    LLM_MAX_TOKENS: int = int(_deepseek.get("max_tokens", 1024))

    # --- Embedding ---
    # provider: "local" = 本地 BGE-M3 / "api" = 火山引擎 API
    EMBEDDING_PROVIDER: str = _embedding.get("provider", "local")
    EMBEDDING_MODEL: str = _embedding.get("model", "BAAI/bge-m3")
    EMBEDDING_API_MODEL: str = _embedding.get("api_model", "")

    @classmethod
    def use_api_embedding(cls) -> bool:
        """是否使用 API Embedding（provider=api 且 model 已配置）"""
        return (
            cls.EMBEDDING_PROVIDER == "api"
            and bool(cls.EMBEDDING_API_MODEL)
            and cls.EMBEDDING_API_MODEL != "待填入火山引擎 Embedding 模型名"
        )

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
        """校验必要配置是否齐全"""
        errors = []
        if not cls.DEEPSEEK_API_KEY:
            errors.append(
                f"DEEPSEEK_API_KEY 未设置 — 请在 {_CONFIG_FILE} 中配置 api_key"
            )
        return errors
