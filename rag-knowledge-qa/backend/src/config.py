"""配置管理模块 — 从外部配置文件读取敏感信息

所有 API Key、URL 等敏感配置统一管理在项目外部的配置文件中，
不随代码入库，多项目共享。

配置文件查找顺序:
  1. ~/.ai-env/llm/config.json   (跨平台推荐)
  2. E:/AI-env/llm/config.json   (Windows 旧路径兼容)
"""
import json
import os
from pathlib import Path


def _find_config_file() -> Path | None:
    """按优先级查找配置文件，返回第一个存在的路径"""
    candidates = [
        Path.home() / ".ai-env" / "llm" / "config.json",   # ~/.ai-env/llm/config.json
        Path("E:/AI-env/llm/config.json"),                  # Windows 旧路径
    ]
    for p in candidates:
        if p.exists():
            return p
    # 都不存在时返回推荐路径（方便后续创建）
    return candidates[0]


_CONFIG_FILE = _find_config_file()


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

    # --- Embedding (火山引擎 API) ---
    EMBEDDING_API_MODEL: str = _embedding.get("api_model", "")

    # --- Chroma ---
    CHROMA_PERSIST_DIR: str = os.getenv(
        "CHROMA_PERSIST_DIR", "../data/chroma_db"
    )

    # --- Retriever ---
    RETRIEVER_TOP_K: int = int(os.getenv("RETRIEVER_TOP_K", "4"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))

    # --- PDF 数据目录 ---
    PDF_BASE_DIR: str = os.getenv(
        "PDF_BASE_DIR", os.getenv("PDF_DIR", "../data/pdfs")
    )
    # PDF_DIR 保留为别名，兼容旧代码
    PDF_DIR: str = PDF_BASE_DIR

    @classmethod
    def get_pdf_dir(cls, subdir: str | None = None) -> str:
        """返回 PDF 目录路径，支持子目录

        Args:
            subdir: PDF_BASE_DIR 下的子目录名，None 则返回 PDF_BASE_DIR

        Returns:
            PDF 目录完整路径
        """
        if subdir:
            return os.path.join(cls.PDF_BASE_DIR, subdir)
        return cls.PDF_BASE_DIR

    @classmethod
    def get_chroma_dir(cls, subdir: str | None = None) -> str:
        """返回 Chroma 持久化目录路径，按子目录分存

        subdir=None → chroma_db/（兼容旧行为）
        subdir="math" → chroma_db/math/

        Args:
            subdir: 子目录名，None 则返回根 chroma_db

        Returns:
            Chroma 持久化目录完整路径
        """
        if subdir:
            return os.path.join(cls.CHROMA_PERSIST_DIR, subdir)
        return cls.CHROMA_PERSIST_DIR

    @classmethod
    def validate(cls) -> list[str]:
        """校验必要配置是否齐全"""
        errors = []
        if not cls.DEEPSEEK_API_KEY:
            errors.append(
                f"DEEPSEEK_API_KEY 未设置 — 请在 {_CONFIG_FILE} 中配置 api_key"
            )
        return errors
