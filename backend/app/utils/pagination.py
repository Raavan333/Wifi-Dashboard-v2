import math

from app.schemas.common import PaginationMeta


def build_pagination_meta(
    page: int,
    page_size: int,
    total_records: int,
) -> PaginationMeta:
    total_pages = math.ceil(total_records / page_size) if total_records > 0 else 0
    return PaginationMeta(
        page=page,
        page_size=page_size,
        total_records=total_records,
        total_pages=total_pages,
    )
