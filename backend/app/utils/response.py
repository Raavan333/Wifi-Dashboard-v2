from typing import Any

from app.schemas.common import ApiResponse


def success_response(data: Any, message: str = "success") -> ApiResponse[Any]:
    return ApiResponse(success=True, message=message, data=data)
