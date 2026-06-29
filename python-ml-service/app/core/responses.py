from datetime import datetime, timezone
from typing import Any

from app.core.config import settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ok(
    message: str,
    data: Any | None = None,
    code: int = 200,
    **extra: Any,
) -> dict[str, Any]:
    response: dict[str, Any] = {
        "status": "success",
        "code": code,
        "message": message,
        "timestamp": utc_now(),
        "service": settings.service_name,
    }
    if data is not None:
        response["data"] = data
    response.update(extra)
    return response
