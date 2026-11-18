import logging
from typing import Any, Optional

import asyncpg

from app.config import get_settings

logger = logging.getLogger(__name__)


class Database:
    """AsyncPG connection pool manager with prepared-statement caching."""

    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None
        self.has_recovery_columns: bool = False
        self.has_daily_active_summary: bool = False

    async def connect(self) -> None:
        if self.pool is not None:
            return

        settings = get_settings()
        self.pool = await asyncpg.create_pool(
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            database=settings.POSTGRES_DB,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASS,
            min_size=settings.DB_MIN_CONNECTIONS,
            max_size=settings.DB_MAX_CONNECTIONS,
            command_timeout=settings.QUERY_TIMEOUT_SECONDS,
            statement_cache_size=settings.DB_STATEMENT_CACHE_SIZE,
        )
        logger.info(
            "PostgreSQL connection pool initialized "
            "(host=%s port=%s db=%s min=%s max=%s)",
            settings.POSTGRES_HOST,
            settings.POSTGRES_PORT,
            settings.POSTGRES_DB,
            settings.DB_MIN_CONNECTIONS,
            settings.DB_MAX_CONNECTIONS,
        )
        await self.detect_aggregation_layer()

    async def detect_aggregation_layer(self) -> None:
        """Detect pre-aggregated columns/tables to avoid 7.4M-row scans."""
        try:
            recovery_col = await self.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'wifi_user_summary'
                      AND column_name = 'recovered_after_failure'
                );
                """
            )
            daily_tbl = await self.fetchval(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'daily_active_user_summary'
                );
                """
            )
            self.has_recovery_columns = bool(recovery_col)
            self.has_daily_active_summary = bool(daily_tbl)
            logger.info(
                "Aggregation layer capabilities: has_recovery_columns=%s has_daily_active_summary=%s",
                self.has_recovery_columns,
                self.has_daily_active_summary,
            )
        except Exception as exc:
            logger.warning("Failed to detect aggregation layer: %s", exc)
            self.has_recovery_columns = False
            self.has_daily_active_summary = False

    async def disconnect(self) -> None:
        if self.pool is not None:
            await self.pool.close()
            self.pool = None
            logger.info("PostgreSQL connection pool closed")

    def _require_pool(self) -> asyncpg.Pool:
        if self.pool is None:
            raise RuntimeError("Database connection pool is not initialized.")
        return self.pool

    async def fetch(self, query: str, *args: Any) -> list[asyncpg.Record]:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            stmt = await conn.prepare(query)
            return await stmt.fetch(*args)

    async def fetchrow(self, query: str, *args: Any) -> Optional[asyncpg.Record]:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            stmt = await conn.prepare(query)
            return await stmt.fetchrow(*args)

    async def fetchval(self, query: str, *args: Any) -> Any:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            stmt = await conn.prepare(query)
            return await stmt.fetchval(*args)

    async def execute(self, query: str, *args: Any) -> str:
        pool = self._require_pool()
        async with pool.acquire() as conn:
            stmt = await conn.prepare(query)
            await stmt.fetch(*args)
            return "OK"

    async def fetchdict(self, query: str, *args: Any) -> list[dict[str, Any]]:
        rows = await self.fetch(query, *args)
        return [dict(row) for row in rows]

    async def fetchrowdict(
        self, query: str, *args: Any
    ) -> Optional[dict[str, Any]]:
        row = await self.fetchrow(query, *args)
        return dict(row) if row else None


db = Database()
