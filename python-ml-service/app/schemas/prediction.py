from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class CrowdPredictionRequest(BaseModel):
    hour: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6)
    weather_code: int = Field(default=0, ge=0, le=3)
    prev_density: float = Field(ge=0)
    location: Literal["zone1", "zone2", "zone3", "zone4", "zone5"] = "zone1"
    event_flag: int = Field(default=0, ge=0, le=1)
    event_intensity: float = Field(default=0.0, ge=0.0, le=1.0)
    temperature_c: float = Field(default=31.0, ge=15.0, le=45.0)
    humidity_pct: float = Field(default=70.0, ge=0.0, le=100.0)


class RiskPredictionRequest(BaseModel):
    density: float = Field(ge=0)
    duration_min: float = Field(ge=0)
    area_m2: float = Field(gt=0)
    exits_count: int = Field(ge=1)
    time_of_day: int = Field(ge=0, le=23)
    event_intensity: float = Field(default=0.0, ge=0.0, le=1.0)
    movement_speed_mps: float = Field(default=1.0, ge=0.0)


class AnomalyDetectionRequest(BaseModel):
    sensor_value: float = Field(ge=0)
    timestamp_hour: int = Field(ge=0, le=23)
    rolling_mean_1h: float = Field(gt=0)
    z_score: float = Field(ge=0)
    movement_speed_mps: float = Field(default=1.0, ge=0.0)
    noise_db: float = Field(default=65.0, ge=0.0)


class BatchPredictionRequest(BaseModel):
    type: Literal["crowd", "risk", "anomaly"]
    items: list[dict[str, Any]] = Field(min_length=1, max_length=100)

