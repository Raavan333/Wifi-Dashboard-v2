from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import Field, field_validator

from app.schemas.common import APIModel, PaginationMeta


class GlobalSearchRequest(APIModel):
    query: str = Field(min_length=1, max_length=255)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=500)


class InvestigationRequest(APIModel):
    # Entity filters
    employee_ids: list[int] = Field(default_factory=list)
    user_macs: list[str] = Field(default_factory=list)
    ssids: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    ap_hostnames: list[str] = Field(default_factory=list)
    ap_macs: list[str] = Field(default_factory=list)
    statuses: list[str] = Field(default_factory=list)
    mnemonics: list[str] = Field(default_factory=list)
    facilities: list[str] = Field(default_factory=list)
    asset_ids: list[str] = Field(default_factory=list)
    device_ips: list[str] = Field(default_factory=list)

    # Message & metadata search (ENH-024)
    query: Optional[str] = Field(default=None, max_length=255)
    search_fields: list[Literal["raw_message", "metadata"]] = Field(
        default_factory=lambda: ["raw_message"]
    )

    # Numeric filters
    min_success_count: Optional[int] = Field(default=None, ge=0)
    max_success_count: Optional[int] = Field(default=None, ge=0)
    min_failure_count: Optional[int] = Field(default=None, ge=0)
    max_failure_count: Optional[int] = Field(default=None, ge=0)
    min_appearance_count: Optional[int] = Field(default=None, ge=0)
    max_appearance_count: Optional[int] = Field(default=None, ge=0)
    min_exclusion_count: Optional[int] = Field(default=None, ge=0)
    max_exclusion_count: Optional[int] = Field(default=None, ge=0)
    min_duration_days: Optional[float] = Field(default=None, ge=0)
    max_duration_days: Optional[float] = Field(default=None, ge=0)

    # Temporal filters & time bucketing (ENH-025)
    first_seen_after: Optional[datetime] = None
    first_seen_before: Optional[datetime] = None
    last_seen_after: Optional[datetime] = None
    last_seen_before: Optional[datetime] = None
    start_timestamp: Optional[datetime] = None
    end_timestamp: Optional[datetime] = None
    bucket: Literal["hour", "day", "week", "month"] = "day"

    # Boolean filters
    ux_available: Optional[bool] = None
    valid_users_only: bool = False
    unmapped_users_only: bool = False
    invalid_devices_only: bool = False
    recovered_only: bool = False
    multi_device_users_only: bool = False

    # Grouping & deduplication
    group_by: Optional[
        Literal[
            "user",
            "device",
            "ssid",
            "location",
            "ap",
            "ap_mac",
            "event",
        ]
    ] = None
    group_mode: Literal["raw", "authentication_attempt"] = "raw"

    # Pagination & sorting
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)
    sort_by: Optional[str] = None
    sort_order: Literal["asc", "desc"] = "desc"

    @field_validator(
        "first_seen_after",
        "first_seen_before",
        "last_seen_after",
        "last_seen_before",
        "start_timestamp",
        "end_timestamp",
        mode="before",
    )
    @classmethod
    def _empty_string_to_none(cls, value: Any) -> Any:
        if isinstance(value, str) and not value.strip():
            return None
        return value


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
    ap_mac: Optional[str] = None
    location: Optional[str]
    message: Optional[str] = None
    metadata: Optional[Any] = None
    attempt_count: Optional[int] = None


class RawEventsResponse(APIModel):
    records: list[RawEvent]
    pagination: PaginationMeta


class GroupedInvestigationItem(APIModel):
    group_key: str
    users: int
    devices: int
    total_events: int
    success_count: int
    failure_count: int
    unknown_count: int
    failure_rate: float
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None


class GroupedInvestigationResponse(APIModel):
    group_by: str
    records: list[GroupedInvestigationItem]
    pagination: PaginationMeta


class EmployeeProfile(APIModel):
    employee_id: int
    total_devices: int
    total_success_count: int
    total_failure_count: int
    first_seen_timestamp: Optional[datetime]
    last_seen_timestamp: Optional[datetime]


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
    recovered_after_failure: bool = False
    first_fail_timestamp: Optional[datetime] = None
    last_success_after_fail: Optional[datetime] = None
    user: Optional[EmployeeProfile] = None
    ssids: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    aps: list[str] = Field(default_factory=list)


class EmployeeOverviewResponse(APIModel):
    profile: Optional[EmployeeProfile]
    devices: List[Dict[str, Any]]
    locations: List[str] = Field(default_factory=list)
    ssids: List[str] = Field(default_factory=list)
    aps: List[str] = Field(default_factory=list)


class SearchResult(APIModel):
    entity_type: str
    display_value: str
    matched_field: str
    location: Optional[str] = None
    users: Optional[int] = None
    devices: Optional[int] = None
    failure_rate: Optional[float] = None
    related_to: Optional[str] = None


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


class EntityMetrics(APIModel):
    users: int = 0
    devices: int = 0
    success_count: int = 0
    failure_count: int = 0
    success_rate: float = 0.0
    failure_rate: float = 0.0


class LocationEntityResponse(APIModel):
    location: str
    users: int
    devices: int
    success_count: int
    failure_count: int
    failure_rate: float = 0.0
    ssids: List[Dict[str, Any]] = Field(default_factory=list)
    aps: List[Dict[str, Any]] = Field(default_factory=list)
    top_ssids: List[Dict[str, Any]] = Field(default_factory=list)
    top_aps: List[Dict[str, Any]] = Field(default_factory=list)
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    metrics: EntityMetrics = Field(default_factory=EntityMetrics)


class SSIDEntityResponse(APIModel):
    ssid: str
    users: int
    devices: int
    success_count: int
    failure_count: int
    failure_rate: float = 0.0
    locations: List[Dict[str, Any]] = Field(default_factory=list)
    aps: List[Dict[str, Any]] = Field(default_factory=list)
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    metrics: EntityMetrics = Field(default_factory=EntityMetrics)


class APEntityResponse(APIModel):
    ap_hostname: str
    ap_macs: List[str] = Field(default_factory=list)
    users: int
    devices: int
    success_count: int
    failure_count: int
    failure_rate: float
    locations: List[str] = Field(default_factory=list)
    ssids: List[str] = Field(default_factory=list)
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    metrics: EntityMetrics = Field(default_factory=EntityMetrics)


class APMacEntityResponse(APIModel):
    ap_mac: str
    ap_hostnames: List[str] = Field(default_factory=list)
    locations: List[str] = Field(default_factory=list)
    ssids: List[str] = Field(default_factory=list)
    users: int
    devices: int
    success_count: int
    failure_count: int
    failure_rate: float
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    metrics: EntityMetrics = Field(default_factory=EntityMetrics)


class UniversalEntityResponse(APIModel):
    query: str
    resolved: bool
    entity_type: Optional[
        Literal["Employee", "Device", "AP MAC", "AP", "Location", "SSID"]
    ] = None
    canonical_value: Optional[str] = None
    data: Optional[
        Union[
            EmployeeOverviewResponse,
            DeviceDetail,
            APMacEntityResponse,
            APEntityResponse,
            LocationEntityResponse,
            SSIDEntityResponse,
        ]
    ] = None
