from app.constants.dashboard import MAX_PAGE_SIZE


def validate_page_size(page_size: int) -> int:
    if page_size < 1 or page_size > MAX_PAGE_SIZE:
        raise ValueError(
            f"page_size must be between 1 and {MAX_PAGE_SIZE}, got {page_size}"
        )
    return page_size
