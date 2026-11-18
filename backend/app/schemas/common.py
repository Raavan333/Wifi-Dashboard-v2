from datetime import date, datetime
from typing import Generic, List, Literal, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        str_strip_whitespace=True,
    )


T = TypeVar("T")


class ApiResponse(APIModel, Generic[T]):
    success: bool = True
    message: str = "success"
    data: T


class PaginationParams(APIModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)


class PaginationMeta(APIModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int


class PaginatedResponse(APIModel, Generic[T]):
    success: bool = True
    message: str = "success"
    records: List[T]
    pagination: PaginationMeta


class DateRange(APIModel):
    start_timestamp: Optional[datetime] = None
    end_timestamp: Optional[datetime] = None


class SortRequest(APIModel):
    sort_by: Optional[str] = None
    sort_order: Literal["asc", "desc"] = "desc"


class OptionItem(APIModel):
    label: str
    value: str


class HealthCheckResponse(APIModel):
    service: str
    version: str
    status: str
    database: str
    pool_size: Optional[int] = None
    pool_free: Optional[int] = None


class MetricCard(APIModel):
    title: str
    value: int | float | str
    subtitle: Optional[str] = None
    trend: Optional[float] = None
    trend_direction: Optional[str] = None


class PieChartItem(APIModel):
    label: str
    value: int
    percentage: float


class PieChartResponse(APIModel):
    title: str
    items: list[PieChartItem]


class BarChartItem(APIModel):
    label: str
    value: int


class BarChartResponse(APIModel):
    title: str
    items: list[BarChartItem]


class LineChartItem(APIModel):
    timestamp: datetime | date
    value: int


class LineChartResponse(APIModel):
    title: str
    items: list[LineChartItem]
