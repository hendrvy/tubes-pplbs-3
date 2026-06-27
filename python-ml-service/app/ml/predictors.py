from __future__ import annotations

from typing import Any

import pandas as pd

from app.ml.registry import ModelRegistry
from app.schemas.prediction import (
    AnomalyDetectionRequest,
    CrowdPredictionRequest,
    RiskPredictionRequest,
)


def crowd_level(value: float) -> str:
    if value >= 520:
        return "Bahaya"
    if value >= 320:
        return "Waspada"
    return "Aman"


def anomaly_severity(is_anomaly: bool, anomaly_score: float, z_score: float) -> str:
    if not is_anomaly:
        return "normal"
    if z_score >= 4.5 or anomaly_score >= 0.12:
        return "high"
    if z_score >= 3.2 or anomaly_score >= 0.04:
        return "medium"
    return "low"


def predict_crowd(payload: CrowdPredictionRequest, registry: ModelRegistry) -> dict[str, Any]:
    bundle = registry.get("crowd_density")
    frame = pd.DataFrame([payload.model_dump()])
    prediction = float(bundle["model"].predict(frame[bundle["features"]])[0])
    prediction = max(0.0, round(prediction, 2))
    metadata = registry.metadata["models"]["crowd_density"]

    return {
        "predicted_density": prediction,
        "congestion_level": crowd_level(prediction),
        "horizon_minutes": 30,
        "model": bundle["algorithm"],
        "confidence": metadata["metrics"]["r2"],
        "input_zone": payload.location,
    }


def predict_risk(payload: RiskPredictionRequest, registry: ModelRegistry) -> dict[str, Any]:
    bundle = registry.get("risk_classifier")
    frame = pd.DataFrame([payload.model_dump()])
    model = bundle["model"]
    risk_category = str(model.predict(frame[bundle["features"]])[0])
    probabilities = model.predict_proba(frame[bundle["features"]])[0]
    confidence = round(float(max(probabilities)), 4)
    classes = model.named_steps["model"].classes_.tolist()

    return {
        "risk_category": risk_category,
        "confidence": confidence,
        "probabilities": {
            str(label): round(float(prob), 4)
            for label, prob in zip(classes, probabilities)
        },
        "model": bundle["algorithm"],
    }


def detect_anomaly(payload: AnomalyDetectionRequest, registry: ModelRegistry) -> dict[str, Any]:
    bundle = registry.get("anomaly_detector")
    frame = pd.DataFrame([payload.model_dump()])
    model = bundle["model"]
    raw_prediction = int(model.predict(frame[bundle["features"]])[0])
    decision_score = float(model.decision_function(frame[bundle["features"]])[0])
    anomaly_score = round(float(max(0.0, -decision_score)), 4)
    is_anomaly = raw_prediction == -1 or payload.z_score >= 3.0

    return {
        "is_anomaly": bool(is_anomaly),
        "severity": anomaly_severity(bool(is_anomaly), anomaly_score, payload.z_score),
        "anomaly_score": anomaly_score,
        "z_score": payload.z_score,
        "model": bundle["algorithm"],
    }

