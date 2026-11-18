import logging

import asyncpg
from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import ORJSONResponse

logger = logging.getLogger(__name__)


async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> ORJSONResponse:
    return ORJSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "data": None,
        },
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> ORJSONResponse:
    return ORJSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation error",
            "data": exc.errors(),
        },
    )


async def database_exception_handler(
    request: Request,
    exc: asyncpg.PostgresError,
) -> ORJSONResponse:
    logger.exception(
        "Database error on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return ORJSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Database query error",
            "data": None,
        },
    )


async def global_exception_handler(
    request: Request,
    exc: Exception,
) -> ORJSONResponse:
    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return ORJSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "data": None,
        },
    )
