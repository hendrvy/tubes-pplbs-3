from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle
import numpy as np
from datetime import datetime

app = FastAPI(title="Smart City ML Service", version="1.0.0")

MODEL_PATH = "/app/models"

with open(f"{MODEL_PATH}/traffic_model.pkl", "rb") as f:
    traffic_model = pickle.load(f)

with open(f"{MODEL_PATH}/aqi_model.pkl", "rb") as f:
    aqi_model = pickle.load(f)

with open(f"{MODEL_PATH}/anomaly_model.pkl", "rb") as f:
    anomaly_model = pickle.load(f)

with open(f"{MODEL_PATH}/scaler.pkl", "rb") as f:
    scaler = pickle.load(f)

class TrafficPredictionRequest(BaseModel):
    hour: int
    day_of_week: int
    historical_volume: float
    weather_condition: int

class TrafficPredictionResponse(BaseModel):
    congestion_level: float
    severity: str
    recommendation: str

class AQIPredictionRequest(BaseModel):
    pm25: float
    pm10: float
    co2: float
    temperature: float

class AQIPredictionResponse(BaseModel):
    aqi: float
    category: str
    health_advice: str

class AnomalyRequest(BaseModel):
    sensor_type: str
    values: list

class AnomalyResponse(BaseModel):
    is_anomaly: bool
    confidence: float
    alert_level: str

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "python-ml-service",
        "models_loaded": ["traffic", "aqi", "anomaly"],
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict/traffic", response_model=TrafficPredictionResponse)
def predict_traffic(request: TrafficPredictionRequest):
    try:
        features = np.array([[
            request.hour,
            request.day_of_week,
            request.historical_volume,
            request.weather_condition
        ]])
        
        congestion = float(traffic_model.predict(features)[0])
        
        if congestion < 40:
            severity = "low"
            recommendation = "Lancar, silakan berkendara normal"
        elif congestion < 70:
            severity = "medium"
            recommendation = "Kepadatan sedang, waspadai perlambatan"
        else:
            severity = "high"
            recommendation = "Kemacetan tinggi, cari rute alternatif"
        
        return TrafficPredictionResponse(
            congestion_level=round(congestion, 1),
            severity=severity,
            recommendation=recommendation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/aqi", response_model=AQIPredictionResponse)
def predict_aqi(request: AQIPredictionRequest):
    try:
        features = np.array([[
            request.pm25,
            request.pm10,
            request.co2,
            request.temperature
        ]])
        
        aqi = float(aqi_model.predict(features)[0])
        
        if aqi <= 50:
            category = "Good"
            health_advice = "Aman untuk semua aktivitas luar ruangan"
        elif aqi <= 100:
            category = "Moderate"
            health_advice = "Kelompok sensitif kurangi aktivitas luar"
        elif aqi <= 150:
            category = "Unhealthy for Sensitive Groups"
            health_advice = "Warga sensitif gunakan masker"
        elif aqi <= 200:
            category = "Unhealthy"
            health_advice = "Kurangi aktivitas luar ruangan"
        elif aqi <= 300:
            category = "Very Unhealthy"
            health_advice = "Gunakan masker N95, hindari luar ruangan"
        else:
            category = "Hazardous"
            health_advice = "PERINGATAN! Tetap di dalam ruangan"
        
        return AQIPredictionResponse(
            aqi=round(aqi, 1),
            category=category,
            health_advice=health_advice
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/anomaly", response_model=AnomalyResponse)
def detect_anomaly(request: AnomalyRequest):
    try:
        values = np.array(request.values).reshape(1, -1)
        
        if values.shape[1] < 4:
            padded = np.zeros((1, 4))
            padded[0, :values.shape[1]] = values[0]
            values = padded
        elif values.shape[1] > 4:
            values = values[:, :4]
        
        scaled_values = scaler.transform(values)
        prediction = anomaly_model.predict(scaled_values)
        confidence = float(abs(anomaly_model.score_samples(scaled_values)[0]))
        
        is_anomaly = prediction[0] == -1
        
        if is_anomaly:
            alert_level = "HIGH" if confidence > 0.3 else "MEDIUM"
        else:
            alert_level = "NORMAL"
        
        return AnomalyResponse(
            is_anomaly=bool(is_anomaly),
            confidence=round(min(abs(confidence), 1.0), 3),
            alert_level=alert_level
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {
        "service": "Smart City ML Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "traffic_prediction": "/predict/traffic",
            "aqi_prediction": "/predict/aqi",
            "anomaly_detection": "/detect/anomaly"
        }
    }