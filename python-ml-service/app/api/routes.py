from fastapi import APIRouter

from app.core.config import settings
from app.core.responses import ok

router = APIRouter()


@router.get("/health")
def health():
    return ok(
        message="Python ML service is healthy.",
        data={
            "version": settings.app_version,
            "environment": settings.environment,
            "models_loaded": False,
        },
    )


@router.get("/predict/health")
def prediction_health():
    return ok(
        message="Prediction service is reachable.",
        data={
            "models": [],
            "models_loaded": False,
        },
    )

