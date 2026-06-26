# Python ML Service Report

## Dataset

- Rows: 6000
- Zones: 5
- Time range: 2025-06-01T00:00:00 to 2025-08-02T11:45:00
- Mean current density: 123.30
- Mean predicted 30-minute density: 132.61
- Anomaly rate: 13.72%

## Risk Distribution

| Label | Count | Percent |
|---|---:|---:|
| Aman | 4978 | 82.97% |
| Waspada | 836 | 13.93% |
| Bahaya | 186 | 3.10% |

## Anomaly Distribution

| Label | Count | Percent |
|---|---:|---:|
| 0 | 5177 | 86.28% |
| 1 | 823 | 13.72% |

## Model Metrics

| Model | Algorithm | Main Metric | Supporting Metrics |
|---|---|---:|---|
| Crowd Density Predictor | RandomForestRegressor | R2 0.8314 | MAE 23.373, RMSE 29.341 |
| Risk Classifier | GradientBoostingClassifier | Accuracy 0.9825 | Macro F1 0.9474 |
| Anomaly Detector | IsolationForest | F1 0.6439 | Precision 0.6075, Recall 0.6848 |

## Key Findings

- Crowd density is strongest during evening hours, especially when event intensity is high.
- The risk classifier is intentionally explainable: density, event intensity, duration, area size, and exits count drive most predictions.
- Isolation Forest is used for unsupervised anomaly detection, then the API applies a z-score guard for operational safety.
- The dataset contains enough rows and label variety for repeatable testing and presentation.

## Generated Figures

- `reports/figures/density_by_hour.png`
- `reports/figures/risk_distribution.png`
- `reports/figures/anomaly_distribution.png`
- `reports/figures/correlation_heatmap.png`

## Feature Importance Highlights

### Crowd Density

[
  {
    "feature": "num__prev_density",
    "importance": 0.69667
  },
  {
    "feature": "num__event_intensity",
    "importance": 0.19697
  },
  {
    "feature": "num__hour",
    "importance": 0.03544
  },
  {
    "feature": "num__humidity_pct",
    "importance": 0.0215
  },
  {
    "feature": "num__temperature_c",
    "importance": 0.02008
  }
]

### Risk Classifier

[
  {
    "feature": "num__event_intensity",
    "importance": 0.42326
  },
  {
    "feature": "num__duration_min",
    "importance": 0.23881
  },
  {
    "feature": "num__density",
    "importance": 0.2211
  },
  {
    "feature": "num__area_m2",
    "importance": 0.06239
  },
  {
    "feature": "num__exits_count",
    "importance": 0.05058
  }
]
