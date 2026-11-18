from typing import Annotated

from fastapi import Depends, Query

from app.config import Settings, get_settings
from app.constants.dashboard import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.schemas.common import PaginationParams
from app.services.dashboard_service import DashboardService, dashboard_service
from app.services.investigate_service import (
    InvestigateService,
    investigate_service,
)


def pagination_dependency(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(
        default=DEFAULT_PAGE_SIZE,
        ge=1,
        le=MAX_PAGE_SIZE,
        description="Records per page (max 500)",
    ),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


def get_dashboard_service() -> DashboardService:
    return dashboard_service


def get_investigate_service() -> InvestigateService:
    return investigate_service


SettingsDep = Annotated[Settings, Depends(get_settings)]
PaginationDep = Annotated[PaginationParams, Depends(pagination_dependency)]
DashboardServiceDep = Annotated[
    DashboardService, Depends(get_dashboard_service)
]
InvestigateServiceDep = Annotated[
    InvestigateService, Depends(get_investigate_service)
]
