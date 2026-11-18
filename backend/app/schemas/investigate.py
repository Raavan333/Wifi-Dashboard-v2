from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import Field

from app.schemas.common import APIModel, PaginationMeta


class GlobalSearchRequest(APIModel):
    query: str = Field(min_length=1, max_length=255)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=500)


class InvestigationRequest(APIModel):
    employee_ids: list[int] = Field(default_factory=list)
    user_macs: list[str] = Field(default_factory=list)
    ssids: list[str] = Field(default_factory=list)
    statuses: list[str] = Field(default_factory=list)
    mnemonics: list[str] = Field(default_factory=list)
    facilities: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    ap_hostnames: list[str] = Field(default_factory=list)
    ux_available: Optional[bool] = None
    valid_users_only: bool = False
    unmapped_users_only: bool = False
    invalid_devices_only: bool = False
    start_timestamp: Optional[datetime] = None
    end_timestamp: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
    sort_by: Optional[str] = None
    sort_order: Literal["asc", "desc"] = "desc"


class InvestigationSummary(APIModel):
    total_devices: int
    total_users: int
    valid_users: int
    invalid_users: int
    success_rate: float
    failure_rate: float
    recovery_rate: float


class TimelinePoint(APIModel):
    timestamp: datetime | date
    success_count: int
    failure_count: int
    appearance_count: int
    unknown_count: int


class TimelineResponse(APIModel):
    points: list[TimelinePoint]


class RawEvent(APIModel):
    id: int
    user_mac: str
    employee_id: Optional[int]
    facility: str
    mnemonic: str
    status: str
    ssid: Optional[str]
    appeared_timestamp: datetime
    elasticsearch_timestamp: datetime
    ap_hostname: Optional[str]
    location: Optional[str]
    message: Optional[str] = None


class RawEventsResponse(APIModel):
    records: list[RawEvent]
    pagination: PaginationMeta


class DeviceDetail(APIModel):
    user_mac: str
    employee_id: Optional[int]
    total_appearance_count: int
    total_success_count: int
    total_failure_count: int
    total_exclusion_count: int
    last_event_status: Optional[str] = None
    first_seen_timestamp: Optional[datetime]
    last_seen_timestamp: Optional[datetime]
    observed_duration: Optional[str]
    ux_available: bool
    ux_timestamp: Optional[datetime] = None
    ux_last_queried_timestamp: Optional[datetime] = None
    asset_id: Optional[str] = None
    device_ip: Optional[str] = None
    location: Optional[str]
    ap_mac: Optional[str] = None
    ap_hostname: Optional[str]
    observed_ssids: list[str] = Field(default_factory=list)


class EmployeeProfile(APIModel):
    employee_id: int
    total_devices: int
    total_success_count: int
    total_failure_count: int
    first_seen_timestamp: Optional[datetime]
    last_seen_timestamp: Optional[datetime]


class EmployeeOverviewResponse(APIModel):
    profile: Optional[EmployeeProfile]
    devices: List[Dict[str, Any]]


class SearchResult(APIModel):
    entity_type: str
    display_value: str
    matched_field: str


class GlobalSearchResponse(APIModel):
    results: list[SearchResult]
    pagination: PaginationMeta


class FilterOptionsResponse(APIModel):
    ssids: list[str] = Field(default_factory=list)
    statuses: list[str] = Field(default_factory=list)
    mnemonics: list[str] = Field(default_factory=list)
    facilities: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    ap_hostnames: list[str] = Field(default_factory=list)


class LocationEntityResponse(APIModel):
    location: str
    users: int
    devices: int
    success_count: int
    failure_count: int
    top_ssids: List[Dict[str, Any]]
    top_aps: List[Dict[str, Any]]
    first_seen: Optional[datetime]
    last_seen: Optional[datetime]


class SSIDEntityResponse(APIModel):
    ssid: str
    users: int
    devices: int
    success_count: int
    failure_count: int
    locations: List[Dict[str, Any]]
    aps: List[Dict[str, Any]]
    first_seen: Optional[datetime]
    last_seen: Optional[datetime]


class APEntityResponse(APIModel):
    ap_hostname: str
    users: int
    devices: int
    success_count: int
    failure_count: int
    failure_rate: float
    locations: List[str]
    ssids: List[str]
