from __future__ import annotations

import asyncio
from functools import wraps
from typing import Any, Awaitable, Callable, TypeVar

from cachetools import TTLCache

from app.config import get_settings

T = TypeVar("T")

_settings = get_settings()

dashboard_cache: TTLCache[str, Any] = TTLCache(
    maxsize=_settings.CACHE_MAX_SIZE,
    ttl=_settings.CACHE_TTL_SECONDS,
)

_key_locks: dict[str, asyncio.Lock] = {}


def _get_lock(key: str) -> asyncio.Lock:
    lock = _key_locks.get(key)
    if lock is None:
        lock = asyncio.Lock()
        _key_locks[key] = lock
    return lock


def get_cached(key: str) -> Any | None:
    return dashboard_cache.get(key)


def set_cached(key: str, value: Any) -> None:
    dashboard_cache[key] = value


def delete_cached(key: str) -> None:
    dashboard_cache.pop(key, None)


def clear_cache() -> None:
    dashboard_cache.clear()


async def get_or_set_cached(
    key: str,
    loader: Callable[[], Awaitable[T]],
) -> T:
    """Fetch from TTL cache with per-key async lock to prevent stampedes."""
    cached = dashboard_cache.get(key)
    if cached is not None:
        return cached

    lock = _get_lock(key)
    async with lock:
        cached = dashboard_cache.get(key)
        if cached is not None:
            return cached

        result = await loader()
        dashboard_cache[key] = result
        return result


def cache_result(ttl_cache: TTLCache[str, Any] = dashboard_cache):
    def decorator(func: Callable[..., Awaitable[Any]]):
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            cache_key = (
                f"{func.__module__}:{func.__name__}:{args}:{sorted(kwargs.items())}"
            )
            cached = ttl_cache.get(cache_key)
            if cached is not None:
                return cached

            result = await func(*args, **kwargs)
            ttl_cache[cache_key] = result
            return result

        return wrapper

    return decorator
