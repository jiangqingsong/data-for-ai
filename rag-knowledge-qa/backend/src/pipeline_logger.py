"""Pipeline 日志模块 — 统一日志管理

使用方式:
    from src.pipeline_logger import get_pipeline_logger

    logger = get_pipeline_logger(kb_name)
    logger.info("正在加载文档...")
    logger.error("加载失败: xxx")

日志输出:
    - 控制台 (stdout): INFO 级别，实时可见
    - 文件 (logs/{kb_name}_{timestamp}.log): DEBUG 级别，完整记录
"""

import logging
import os
import sys
from datetime import datetime


# 日志目录（相对于 backend/）
def _get_log_dir():
    """获取日志目录绝对路径"""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_dir = os.path.join(backend_dir, "logs")
    os.makedirs(log_dir, exist_ok=True)
    return log_dir


def _sanitize_kb_name(name: str) -> str:
    """清理 KB 名称，用于文件名"""
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in name)


# 全局日志收集器：存放最近 N 行日志文本
_log_buffers: dict[str, list[str]] = {}


def get_log_buffer(kb_name: str) -> list[str]:
    """获取指定 KB 的日志缓冲区（用于 API 返回给前端）"""
    return _log_buffers.get(kb_name, [])


def clear_log_buffer(kb_name: str):
    """清除指定 KB 的日志缓冲区"""
    _log_buffers.pop(kb_name, None)


class PipelineLogHandler(logging.Handler):
    """同时写入文件 + 内存缓冲区 + 控制台的日志处理器"""

    def __init__(self, kb_name: str, log_filepath: str):
        super().__init__()
        self.kb_name = kb_name
        self.log_filepath = log_filepath
        self.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%H:%M:%S",
        ))

    def emit(self, record):
        msg = self.format(record)
        # 写入内存缓冲区
        if self.kb_name not in _log_buffers:
            _log_buffers[self.kb_name] = []
        _log_buffers[self.kb_name].append(msg)
        # 保持缓冲区不超过 500 行
        if len(_log_buffers[self.kb_name]) > 500:
            _log_buffers[self.kb_name] = _log_buffers[self.kb_name][-500:]
        # 写入文件
        try:
            with open(self.log_filepath, "a", encoding="utf-8") as f:
                f.write(msg + "\n")
        except Exception:
            pass  # 文件写入失败不阻塞程序


def get_pipeline_logger(kb_name: str = "default") -> logging.Logger:
    """获取 Pipeline 专用 logger

    Args:
        kb_name: 知识库名称，用于区分日志文件

    Returns:
        配置好的 Logger 实例（同时输出到控制台、文件和内存缓冲区）
    """
    logger_name = f"pipeline.{kb_name}"
    logger = logging.getLogger(logger_name)

    # 避免重复添加 handler
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    safe_name = _sanitize_kb_name(kb_name)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_dir = _get_log_dir()
    log_filepath = os.path.join(log_dir, f"{safe_name}_{timestamp}.log")

    # 文件 + 内存 handler
    pipeline_handler = PipelineLogHandler(kb_name, log_filepath)
    pipeline_handler.setLevel(logging.DEBUG)
    logger.addHandler(pipeline_handler)

    # 控制台 handler（INFO 级别，简洁格式）
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(
        "[%(name)s] %(levelname)s: %(message)s"
    ))
    logger.addHandler(console_handler)

    logger.info(f"日志文件: {log_filepath}")
    return logger
