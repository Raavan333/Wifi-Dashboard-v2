from datetime import datetime
from typing import Dict, List, Optional

from pydantic import Field

from app.schemas.common import (
    APIModel,
    BarChartResponse,
    LineChartResponse,
    MetricCard,
    PaginationMeta,
    PieChartResponse,
)


class ExecutiveSummaryResponse(APIModel):
    metrics: List[MetricCard]
    success_failure_chart: PieChartResponse
    recovery_chart: PieChartResponse


class UserPopulationResponse(APIModel):
    metrics: List[MetricCard]
    device_distribution: BarChartResponse


class ConnectivityHealthResponse(APIModel):
    metrics: List[MetricCard]
    success_failure_chart: PieChartResponse
    recovery_chart: PieChartResponse
    outcome_distribution: BarChartResponse


class SSIDFailureItem(APIModel):
    ssid: str
    failure_count: int
    failure_rate: float


class SSIDFailureDistributionResponse(APIModel):
    title: str
    items: List[SSIDFailureItem]


class SSIDIntelligenceResponse(APIModel):
    metrics: List[MetricCard] = Field(default_factory=list)
    user_distribution: BarChartResponse
    ssid_combinations: BarChartResponse
    failure_distribution: SSIDFailureDistributionResponse


class LocationOverviewResponse(APIModel):
    metrics: List[MetricCard] = Field(default_factory=list)
    user_distribution: BarChartResponse
    device_distribution: BarChartResponse


class UserActivityResponse(APIModel):
    metrics: List[MetricCard] = Field(default_factory=list)
    duration_distribution: BarChartResponse
    new_user_trend: LineChartResponse
    active_user_trend: LineChartResponse


class DataQualityResponse(APIModel):
    metrics: List[MetricCard]
    classification_chart: PieChartResponse
    completeness_chart: BarChartResponse


class DashboardResponse(APIModel):
    executive_summary: ExecutiveSummaryResponse
    user_population: UserPopulationResponse
    connectivity_health: ConnectivityHealthResponse
    ssid_intelligence: SSIDIntelligenceResponse
    location_overview: LocationOverviewResponse
    user_activity: UserActivityResponse
    data_quality: DataQualityResponse


class APMetricItem(APIModel):
    ap_hostname: str
    users: int
    devices: int
    success_count: int
    failure_count: int
    failure_rate: float


class APAnalyticsResponse(APIModel):
    top_aps: List[APMetricItem]
    worst_aps: List[APMetricItem]


class InactiveUserItem(APIModel):
    employee_id: int
    device_count: int
    last_seen_timestamp: Optional[datetime]


class InactiveUsersResponse(APIModel):
    inactive_7d: List[InactiveUserItem]
    inactive_30d: List[InactiveUserItem]
    inactive_90d: List[InactiveUserItem]
    pagination: Dict[str, PaginationMeta]


class RareUserItem(APIModel):
    employee_id: int
    device_count: int
    appearance_count: int
    last_seen_timestamp: Optional[datetime]


class RareUsersResponse(APIModel):
    records: List[RareUserItem]
    pagination: PaginationMeta
