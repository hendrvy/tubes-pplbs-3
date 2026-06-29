from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.responses import ok
from app.ml.predictors import detect_anomaly, predict_crowd, predict_risk
from app.ml.registry import get_registry
from app.schemas.prediction import (
    AnomalyDetectionRequest,
    BatchPredictionRequest,
    CrowdPredictionRequest,
    RiskPredictionRequest,
)

router = APIRouter()


@router.get("/health")
def health():
    registry = get_registry()
    models_loaded = True
    try:
        model_names = registry.model_names()
    except FileNotFoundError:
        models_loaded = False
        model_names = []

    return ok(
        message="Python ML service is healthy.",
        data={
            "version": settings.app_version,
            "environment": settings.environment,
            "models_loaded": models_loaded,
            "models": model_names,
        },
    )


@router.get("/predict/health")
def prediction_health():
    registry = get_registry()
    try:
        model_names = registry.model_names()
        metadata = registry.metadata
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return ok(
        message="Prediction service is reachable.",
        data={
            "models": model_names,
            "models_loaded": True,
            "trained_at": metadata.get("trained_at"),
            "row_count": metadata.get("row_count"),
        },
        models=model_names,
    )


@router.post("/predict/crowd")
def crowd_prediction(payload: CrowdPredictionRequest):
    result = predict_crowd(payload, get_registry())
    return ok("Crowd density prediction generated.", data=result, **result)


@router.post("/predict/risk")
def risk_prediction(payload: RiskPredictionRequest):
    result = predict_risk(payload, get_registry())
    return ok("Area risk prediction generated.", data=result, **result)


@router.post("/detect/anomaly")
def anomaly_detection(payload: AnomalyDetectionRequest):
    result = detect_anomaly(payload, get_registry())
    return ok("Anomaly detection completed.", data=result, **result)


@router.get("/model/feature-importance")
def feature_importance():
    metadata = get_registry().metadata
    return ok(
        "Model feature importance loaded.",
        data={
            name: model.get("feature_importance", [])
            for name, model in metadata["models"].items()
        },
    )


@router.post("/predict/batch")
def batch_prediction(payload: BatchPredictionRequest):
    registry = get_registry()
    results = []
    for item in payload.items:
        if payload.type == "crowd":
            results.append(predict_crowd(CrowdPredictionRequest(**item), registry))
        elif payload.type == "risk":
            results.append(predict_risk(RiskPredictionRequest(**item), registry))
        else:
            results.append(detect_anomaly(AnomalyDetectionRequest(**item), registry))

    return ok(
        "Batch prediction completed.",
        data={"type": payload.type, "count": len(results), "results": results},
        results=results,
    )
