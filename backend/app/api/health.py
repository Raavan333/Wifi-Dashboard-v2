import logging

from fastapi import APIRouter, Depends

from app.api.deps import SettingsDep
from app.db.database import Database
from app.db.session import get_db
from app.schemas.common import HealthCheckResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", response_model=HealthCheckResponse)
async def health_check(
    settings: SettingsDep,
    database: Database = Depends(get_db),
) -> HealthCheckResponse:
    database_status = "connected"
    status = "healthy"
    pool_size = None
    pool_free = None

    try:
        await database.fetchval("SELECT 1")
        if database.pool is not None:
            pool_size = database.pool.get_size()
            pool_free = database.pool.get_idle_size()
    except Exception as exc:
        logger.warning("Health check database probe failed: %s", exc)
        database_status = "disconnected"
        status = "degraded"

    return HealthCheckResponse(
        service=settings.APP_NAME,
        version=settings.APP_VERSION,
        status=status,
        database=database_status,
        pool_size=pool_size,
        pool_free=pool_free,
    )
