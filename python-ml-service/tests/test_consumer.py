from app.consumers.rabbitmq_consumer import process_event


def test_process_crowd_event_detects_alert():
    result = process_event(
        "crowd.new",
        {
            "zone": "zone1",
            "density_count": 950,
            "timestamp": "2025-06-11T20:00:00Z",
            "rolling_mean_1h": 280,
            "z_score": 3.8,
        },
    )

    assert result["event_type"] == "crowd.processed"
    assert result["should_alert"] is True
    assert result["anomaly_detection"]["is_anomaly"] is True


def test_process_incident_event_predicts_risk():
    result = process_event(
        "incident.new",
        {
            "zone_id": 1,
            "estimated_density": 450,
            "duration_min": 120,
            "area_m2": 500,
            "exits_count": 2,
            "timestamp": "2025-06-11T20:00:00Z",
        },
    )

    assert result["event_type"] == "incident.processed"
    assert result["risk_prediction"]["risk_category"] in ["Aman", "Waspada", "Bahaya"]

