from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import pika

from app.core.config import settings
from app.ml.predictors import detect_anomaly, predict_crowd, predict_risk
from app.ml.registry import get_registry
from app.schemas.prediction import (
    AnomalyDetectionRequest,
    CrowdPredictionRequest,
    RiskPredictionRequest,
)


def parse_timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return datetime.now(timezone.utc)


def zone_to_location(payload: dict[str, Any]) -> str:
    zone = str(payload.get("location") or payload.get("zone") or "")
    if zone.startswith("zone"):
        return zone
    zone_id = payload.get("zone_id")
    if zone_id:
        return f"zone{zone_id}"
    return "zone1"


def extract_density(payload: dict[str, Any]) -> float:
    for key in ["density", "density_count", "current_density", "vehicle_density", "sensor_value"]:
        if key in payload:
            return float(payload[key])
    return 0.0


def process_crowd_event(payload: dict[str, Any]) -> dict[str, Any]:
    timestamp = parse_timestamp(payload.get("recorded_at") or payload.get("timestamp"))
    density = extract_density(payload)
    rolling_mean = float(payload.get("rolling_mean_1h") or max(density * 0.82, 1.0))
    z_score = float(payload.get("z_score") or abs(density - rolling_mean) / max(rolling_mean * 0.15, 18))
    registry = get_registry()

    crowd = predict_crowd(
        CrowdPredictionRequest(
            hour=timestamp.hour,
            day_of_week=timestamp.weekday(),
            weather_code=int(payload.get("weather_code", 0)),
            prev_density=float(payload.get("prev_density", density)),
            location=zone_to_location(payload),
            event_flag=int(payload.get("event_flag", 0)),
            event_intensity=float(payload.get("event_intensity", 0.0)),
            temperature_c=float(payload.get("temperature_c", 31.0)),
            humidity_pct=float(payload.get("humidity_pct", 70.0)),
        ),
        registry,
    )
    anomaly = detect_anomaly(
        AnomalyDetectionRequest(
            sensor_value=density,
            timestamp_hour=timestamp.hour,
            rolling_mean_1h=rolling_mean,
            z_score=z_score,
            movement_speed_mps=float(payload.get("movement_speed_mps", payload.get("speed_mps", 1.0))),
            noise_db=float(payload.get("noise_db", 65.0)),
        ),
        registry,
    )

    return {
        "event_type": "crowd.processed",
        "zone": zone_to_location(payload),
        "source_event": payload,
        "crowd_prediction": crowd,
        "anomaly_detection": anomaly,
        "should_alert": anomaly["is_anomaly"] or crowd["congestion_level"] == "Bahaya",
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }


def process_incident_event(payload: dict[str, Any]) -> dict[str, Any]:
    timestamp = parse_timestamp(payload.get("reported_at") or payload.get("timestamp"))
    density = extract_density(payload) or float(payload.get("estimated_density", 260))
    registry = get_registry()
    risk = predict_risk(
        RiskPredictionRequest(
            density=density,
            duration_min=float(payload.get("duration_min", 60)),
            area_m2=float(payload.get("area_m2", 500)),
            exits_count=int(payload.get("exits_count", 2)),
            time_of_day=timestamp.hour,
            event_intensity=float(payload.get("event_intensity", 0.6)),
            movement_speed_mps=float(payload.get("movement_speed_mps", 0.8)),
        ),
        registry,
    )

    return {
        "event_type": "incident.processed",
        "zone": zone_to_location(payload),
        "source_event": payload,
        "risk_prediction": risk,
        "should_alert": risk["risk_category"] == "Bahaya",
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }


def process_event(routing_key: str, payload: dict[str, Any]) -> dict[str, Any]:
    if routing_key == settings.rabbitmq_incident_queue or "incident" in routing_key:
        return process_incident_event(payload)
    return process_crowd_event(payload)


def start_consumer() -> None:
    connection = pika.BlockingConnection(pika.URLParameters(settings.rabbitmq_url))
    channel = connection.channel()
    channel.exchange_declare(exchange=settings.rabbitmq_exchange, exchange_type="topic", durable=True)

    for queue_name in [settings.rabbitmq_crowd_queue, settings.rabbitmq_incident_queue]:
        channel.queue_declare(queue=queue_name, durable=True)
        channel.queue_bind(
            exchange=settings.rabbitmq_exchange,
            queue=queue_name,
            routing_key=queue_name,
        )

    channel.queue_declare(queue=settings.rabbitmq_alert_queue, durable=True)

    def on_message(channel, method, properties, body) -> None:
        try:
            payload = json.loads(body.decode("utf-8"))
            result = process_event(method.routing_key, payload)
            if result["should_alert"]:
                channel.basic_publish(
                    exchange=settings.rabbitmq_exchange,
                    routing_key=settings.rabbitmq_alert_queue,
                    body=json.dumps(result).encode("utf-8"),
                    properties=pika.BasicProperties(
                        content_type="application/json",
                        delivery_mode=2,
                    ),
                )
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as exc:  # pragma: no cover - broker recovery path
            print(f"[ML Consumer] Failed to process event: {exc}")
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    for queue_name in [settings.rabbitmq_crowd_queue, settings.rabbitmq_incident_queue]:
        channel.basic_consume(queue=queue_name, on_message_callback=on_message)

    print(
        "[ML Consumer] Listening on "
        f"{settings.rabbitmq_crowd_queue}, {settings.rabbitmq_incident_queue}"
    )
    channel.start_consuming()


if __name__ == "__main__":
    start_consumer()
