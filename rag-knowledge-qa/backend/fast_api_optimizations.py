#!/usr/bin/env python3
"""FastAPI 性能优化配置"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import time
import logging
from functools import lru_cache


class TimingMiddleware(BaseHTTPMiddleware):
    """请求计时中间件"""
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        logging.info(f"{request.method} {request.url.path} - {process_time:.3f}s")
        return response


class CacheControlMiddleware(BaseHTTPMiddleware):
    """缓存控制中间件"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # 对于静态资源设置较长缓存
        if any(request.url.path.endswith(ext) for ext in ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg']):
            response.headers["Cache-Control"] = "public, max-age=31536000"

        # API 响应设置合理缓存
        elif request.url.path.startswith("/api/"):
            if request.method == "GET":
                response.headers["Cache-Control"] = "public, max-age=60, s-maxage=300"

        return response


def create_optimized_app(title: str, version: str) -> FastAPI:
    """创建优化后的 FastAPI 应用"""
    app = FastAPI(
        title=title,
        version=version,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # 添加中间件
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])
    app.add_middleware(TimingMiddleware)
    app.add_middleware(CacheControlMiddleware)

    # 配置日志
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("api.log"),
            logging.StreamHandler()
        ]
    )

    return app


@lru_cache(maxsize=100)
def cached_function_call(*args, **kwargs):
    """通用缓存函数"""
    function = kwargs.pop("function")
    return function(*args, **kwargs)


def async_cached_function(cache_size: int = 100):
    """异步函数装饰器 - 缓存"""
    def decorator(func):
        cache = {}  # 使用字典实现缓存
        max_size = cache_size

        async def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)

            if key in cache:
                return cache[key]

            result = await func(*args, **kwargs)

            # 限制缓存大小
            if len(cache) >= max_size:
                oldest_key = next(iter(cache.keys()))
                del cache[oldest_key]

            cache[key] = result
            return result

        return wrapper
    return decorator
