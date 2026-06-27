from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_prediction_health_loads_models(client):
    response = client.get("/predict/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert set(body["models"]) == {
        "crowd_density",
        "risk_classifier",
        "anomaly_detector",
    }


def test_crowd_prediction_contract(client):
    response = client.post(
        "/predict/crowd",
        json={
            "hour": 20,
            "day_of_week": 6,
            "weather_code": 0,
            "prev_density": 320,
            "location": "zone1",
            "event_flag": 1,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["predicted_density"] > 0
    assert body["congestion_level"] in ["Aman", "Waspada", "Bahaya"]
    assert body["data"]["model"] == "RandomForestRegressor"


def test_risk_prediction_contract(client):
    response = client.post(
        "/predict/risk",
        json={
            "density": 450,
            "duration_min": 120,
            "area_m2": 500,
            "exits_count": 2,
            "time_of_day": 20,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["risk_category"] in ["Aman", "Waspada", "Bahaya"]
    assert 0 <= body["confidence"] <= 1
    assert body["data"]["model"] == "GradientBoostingClassifier"


def test_anomaly_detection_contract(client):
    response = client.post(
        "/detect/anomaly",
        json={
            "sensor_value": 950,
            "timestamp_hour": 20,
            "rolling_mean_1h": 280,
            "z_score": 3.8,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_anomaly"] is True
    assert body["severity"] in ["low", "medium", "high"]
    assert body["data"]["model"] == "IsolationForest"


def test_batch_prediction_contract(client):
    response = client.post(
        "/predict/batch",
        json={
            "type": "crowd",
            "items": [
                {
                    "hour": 18,
                    "day_of_week": 5,
                    "weather_code": 0,
                    "prev_density": 200,
                    "location": "zone1",
                    "event_flag": 1,
                },
                {
                    "hour": 20,
                    "day_of_week": 5,
                    "weather_code": 1,
                    "prev_density": 500,
                    "location": "zone3",
                    "event_flag": 1,
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["results"]) == 2


def test_invalid_payload_returns_422(client):
    response = client.post(
        "/predict/crowd",
        json={
            "hour": 99,
            "day_of_week": 6,
            "weather_code": 0,
            "prev_density": 320,
        },
    )

    assert response.status_code == 422
