from fastapi import APIRouter

from app.api.deps import DashboardServiceDep, PaginationDep
from app.schemas.dashboard import (
    APAnalyticsResponse,
    ConnectivityHealthResponse,
    DashboardResponse,
    DataQualityResponse,
    ExecutiveSummaryResponse,
    InactiveUsersResponse,
    LocationOverviewResponse,
    RareUsersResponse,
    SSIDIntelligenceResponse,
    UserActivityResponse,
    UserPopulationResponse,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    service: DashboardServiceDep,
) -> DashboardResponse:
    return await service.get_full_dashboard()


@router.get("/summary", response_model=ExecutiveSummaryResponse)
async def summary(
    service: DashboardServiceDep,
) -> ExecutiveSummaryResponse:
    return await service.get_executive_summary()


@router.get("/population", response_model=UserPopulationResponse)
async def population(
    service: DashboardServiceDep,
) -> UserPopulationResponse:
    return await service.get_user_population()


@router.get("/connectivity", response_model=ConnectivityHealthResponse)
async def connectivity(
    service: DashboardServiceDep,
) -> ConnectivityHealthResponse:
    return await service.get_connectivity_health()


@router.get("/ssid", response_model=SSIDIntelligenceResponse)
async def ssid(
    service: DashboardServiceDep,
) -> SSIDIntelligenceResponse:
    return await service.get_ssid_intelligence()


@router.get("/location", response_model=LocationOverviewResponse)
async def location(
    service: DashboardServiceDep,
) -> LocationOverviewResponse:
    return await service.get_location_overview()


@router.get("/activity", response_model=UserActivityResponse)
async def activity(
    service: DashboardServiceDep,
) -> UserActivityResponse:
    return await service.get_user_activity()


@router.get("/data-quality", response_model=DataQualityResponse)
async def data_quality(
    service: DashboardServiceDep,
) -> DataQualityResponse:
    return await service.get_data_quality()


@router.get("/ap", response_model=APAnalyticsResponse)
async def ap_analytics(
    service: DashboardServiceDep,
) -> APAnalyticsResponse:
    return await service.get_ap_analytics()


@router.get("/inactive-users", response_model=InactiveUsersResponse)
async def inactive_users(
    pagination: PaginationDep,
    service: DashboardServiceDep,
) -> InactiveUsersResponse:
    return await service.get_inactive_users(
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/rare-users", response_model=RareUsersResponse)
async def rare_users(
    pagination: PaginationDep,
    service: DashboardServiceDep,
) -> RareUsersResponse:
    return await service.get_rare_users(
        page=pagination.page,
        page_size=pagination.page_size,
    )
