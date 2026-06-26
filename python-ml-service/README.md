# Python ML Service (A4)

FastAPI microservice for the Smart Crowd Control platform. It provides three ML
models required by A4:

- Crowd Density Predictor: Random Forest regression for 30-minute density.
- Risk Classifier: Gradient Boosting classification for `Aman`, `Waspada`, `Bahaya`.
- Anomaly Detector: Isolation Forest for abnormal crowd/sensor events.

The service runs on port `5000`, matching the API Gateway `PYTHON_ML_URL` setting.

## Local Setup

```bash
cd python-ml-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Generate Dataset and Train Models

```bash
python scripts/generate_dataset.py --rows 6000 --seed 42
python scripts/train_models.py
python scripts/generate_report.py
```

Generated artifacts:

- `data/synthetic_crowd_data.csv`
- `models/*.joblib`
- `models/metadata.json`
- `reports/ml_report.md`
- `reports/figures/*.png`

## Run API

```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

Health check:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/predict/health
```

## Endpoints

### POST `/predict/crowd`

```json
{
  "hour": 20,
  "day_of_week": 6,
  "weather_code": 0,
  "prev_density": 320,
  "location": "zone1",
  "event_flag": 1
}
```

### POST `/predict/risk`

```json
{
  "density": 450,
  "duration_min": 120,
  "area_m2": 500,
  "exits_count": 2,
  "time_of_day": 20
}
```

### POST `/detect/anomaly`

```json
{
  "sensor_value": 950,
  "timestamp_hour": 20,
  "rolling_mean_1h": 280,
  "z_score": 3.8
}
```

### GET `/model/feature-importance`

Returns feature importance for supported models.

### POST `/predict/batch`

Accepts up to 100 items for `crowd`, `risk`, or `anomaly` prediction.

## RabbitMQ Consumer

The consumer processes PHP/A3 events from RabbitMQ:

- `crowd.new`
- `incident.new`

It publishes alert-worthy results to:

- `anomaly.alert`

Run it with:

```bash
python scripts/run_consumer.py
```

## Tests

```bash
pytest
```

## Docker

```bash
docker build -t smartcrowd-python-ml .
docker run --rm -p 5000:5000 smartcrowd-python-ml
```

Optional service-only compose file:

```bash
docker compose -f docker-compose.ml.yml up --build
```

