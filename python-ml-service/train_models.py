import pickle
import numpy as np
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler

print("Starting model training during Docker build...")

X_traffic = np.array([
    [8, 0, 100, 0], [9, 0, 150, 0], [17, 0, 200, 0], [18, 0, 180, 0],
    [8, 1, 80, 0], [12, 1, 90, 0], [8, 5, 60, 0], [12, 5, 70, 0],
    [8, 0, 120, 1], [17, 0, 160, 1], [8, 2, 110, 2], [17, 2, 140, 2]
])
y_traffic = np.array([65, 85, 95, 88, 45, 50, 30, 35, 70, 80, 60, 75])

traffic_model = RandomForestRegressor(n_estimators=50, random_state=42)
traffic_model.fit(X_traffic, y_traffic)

X_aqi = np.array([
    [25, 40, 30, 10], [30, 50, 35, 15], [40, 70, 45, 20], [50, 90, 55, 30],
    [60, 110, 65, 40], [35, 60, 40, 18], [45, 80, 50, 25], [55, 100, 60, 35]
])
y_aqi = np.array([50, 80, 120, 180, 220, 90, 140, 190])

aqi_model = RandomForestRegressor(n_estimators=50, random_state=42)
aqi_model.fit(X_aqi, y_aqi)

X_normal = np.array([
    [30, 40, 20, 80], [35, 45, 25, 75], [28, 38, 18, 85], [32, 42, 22, 82],
    [33, 43, 23, 78], [31, 41, 21, 83], [34, 44, 24, 79], [29, 39, 19, 84]
])
anomaly_model = IsolationForest(contamination=0.1, random_state=42)
anomaly_model.fit(X_normal)

with open('/app/models/traffic_model.pkl', 'wb') as f:
    pickle.dump(traffic_model, f)

with open('/app/models/aqi_model.pkl', 'wb') as f:
    pickle.dump(aqi_model, f)

with open('/app/models/anomaly_model.pkl', 'wb') as f:
    pickle.dump(anomaly_model, f)

with open('/app/models/scaler.pkl', 'wb') as f:
    scaler = StandardScaler()
    scaler.fit(X_normal)
    pickle.dump(scaler, f)

print("All 3 models trained and saved successfully")