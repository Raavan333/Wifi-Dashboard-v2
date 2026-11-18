from typing import Optional, Union

from fastapi import APIRouter, Query

from app.api.deps import InvestigateServiceDep
from app.constants.dashboard import MAX_PAGE_SIZE
from app.schemas.investigate import (
    APEntityResponse,
    APMacEntityResponse,
    DeviceDetail,
    EmployeeOverviewResponse,
    FilterOptionsResponse,
    GlobalSearchResponse,
    GroupedInvestigationResponse,
    InvestigationRequest,
    InvestigationSummary,
    LocationEntityResponse,
    RawEventsResponse,
    SSIDEntityResponse,
    TimelineResponse,
)

router = APIRouter(prefix="/investigate", tags=["Investigation"])


@router.get("/search", response_model=GlobalSearchResponse)
async def global_search(
    service: InvestigateServiceDep,
    query: str = Query(
        ...,
        min_length=1,
        max_length=255,
        description="Global search query across employee, MAC, SSID, location, AP, facility, mnemonic",
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=MAX_PAGE_SIZE),
) -> GlobalSearchResponse:
    return await service.global_search(
        query=query,
        page=page,
        page_size=page_size,
    )


@router.get("/options", response_model=FilterOptionsResponse)
async def get_filter_options(
    service: InvestigateServiceDep,
) -> FilterOptionsResponse:
    return await service.get_filter_options()


@router.post(
    "/events",
    response_model=Union[RawEventsResponse, GroupedInvestigationResponse],
)
async def search_events(
    filters: InvestigationRequest,
    service: InvestigateServiceDep,
) -> Union[RawEventsResponse, GroupedInvestigationResponse]:
    return await service.search_events(filters)


@router.post("/timeline", response_model=TimelineResponse)
async def timeline(
    filters: InvestigationRequest,
    service: InvestigateServiceDep,
) -> TimelineResponse:
    return await service.get_timeline(filters)


@router.post("/summary", response_model=InvestigationSummary)
async def summary(
    filters: InvestigationRequest,
    service: InvestigateServiceDep,
) -> InvestigationSummary:
    return await service.get_summary(filters)


@router.get("/user/{employee_id}", response_model=EmployeeOverviewResponse)
async def employee_details(
    employee_id: int,
    service: InvestigateServiceDep,
) -> EmployeeOverviewResponse:
    return await service.get_employee_overview(employee_id)


@router.get("/mac/{user_mac}", response_model=Optional[DeviceDetail])
async def mac_details(
    user_mac: str,
    service: InvestigateServiceDep,
) -> Optional[DeviceDetail]:
    return await service.get_mac_details(user_mac)


@router.get("/location/{location}", response_model=LocationEntityResponse)
async def location_details(
    location: str,
    service: InvestigateServiceDep,
) -> LocationEntityResponse:
    return await service.get_location_details(location)


@router.get("/ssid/{ssid}", response_model=SSIDEntityResponse)
async def ssid_details(
    ssid: str,
    service: InvestigateServiceDep,
) -> SSIDEntityResponse:
    return await service.get_ssid_details(ssid)


@router.get("/ap/{ap_hostname}", response_model=APEntityResponse)
async def ap_details(
    ap_hostname: str,
    service: InvestigateServiceDep,
) -> APEntityResponse:
    return await service.get_ap_details(ap_hostname)


@router.get("/ap-mac/{ap_mac}", response_model=APMacEntityResponse)
async def ap_mac_details(
    ap_mac: str,
    service: InvestigateServiceDep,
) -> APMacEntityResponse:
    return await service.get_ap_mac_details(ap_mac)
