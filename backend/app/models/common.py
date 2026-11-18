from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.common import (
    APIModel,
    ApiResponse,
    BarChartItem,
    BarChartResponse,
    DateRange,
    HealthCheckResponse,
    LineChartItem,
    LineChartResponse,
    MetricCard,
    OptionItem,
    PaginatedResponse,
    PaginationMeta,
    PaginationParams,
    PieChartItem,
    PieChartResponse,
    SortRequest,
)


class WifiEventHistoryModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_mac: str
    facility: str
    mnemonic: str
    status: str
    ssid: Optional[str] = None
    appeared_timestamp: datetime
    elasticsearch_timestamp: datetime
    ingestion_delay_seconds: Optional[float] = None
    raw_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class WifiUserSummaryModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_mac: str
    first_seen_timestamp: Optional[datetime] = None
    last_seen_timestamp: Optional[datetime] = None
    total_appearance_count: int = 0
    total_success_count: int = 0
    total_failure_count: int = 0
    total_exclusion_count: int = 0
    last_event_status: Optional[str] = None
    ux_available: bool = False
    ux_timestamp: Optional[datetime] = None
    ux_last_queried_timestamp: Optional[datetime] = None
    employee_id: Optional[int] = None
    asset_id: Optional[str] = None
    device_ip: Optional[str] = None
    location: Optional[str] = None
    ap_mac: Optional[str] = None
    ap_hostname: Optional[str] = None
    observed_ssids: List[str] = []
    observed_duration: Optional[timedelta] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


__all__ = [
    "APIModel",
    "ApiResponse",
    "BarChartItem",
    "BarChartResponse",
    "DateRange",
    "HealthCheckResponse",
    "LineChartItem",
    "LineChartResponse",
    "MetricCard",
    "OptionItem",
    "PaginatedResponse",
    "PaginationMeta",
    "PaginationParams",
    "PieChartItem",
    "PieChartResponse",
    "SortRequest",
    "WifiEventHistoryModel",
    "WifiUserSummaryModel",
]
