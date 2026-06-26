from __future__ import annotations

import json
import os
from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
DATASET = ROOT_DIR / "data" / "synthetic_crowd_data.csv"
METADATA = ROOT_DIR / "models" / "metadata.json"
REPORTS_DIR = ROOT_DIR / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"
REPORT_PATH = REPORTS_DIR / "ml_report.md"
MPL_CACHE_DIR = REPORTS_DIR / ".matplotlib"

os.environ.setdefault("MPLCONFIGDIR", str(MPL_CACHE_DIR))

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import seaborn as sns


def save_fig(path: Path) -> None:
    plt.tight_layout()
    plt.savefig(path, dpi=140)
    plt.close()


def generate_figures(df: pd.DataFrame) -> None:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    sns.set_theme(style="whitegrid")

    plt.figure(figsize=(9, 5))
    sns.lineplot(data=df, x="hour", y="current_density", hue="location", estimator="mean", errorbar=None)
    plt.title("Average Crowd Density by Hour and Zone")
    plt.xlabel("Hour")
    plt.ylabel("Current Density")
    save_fig(FIGURES_DIR / "density_by_hour.png")

    plt.figure(figsize=(7, 4))
    order = ["Aman", "Waspada", "Bahaya"]
    sns.countplot(data=df, x="risk_label", hue="risk_label", order=order, palette="viridis", legend=False)
    plt.title("Risk Label Distribution")
    plt.xlabel("Risk Label")
    plt.ylabel("Rows")
    save_fig(FIGURES_DIR / "risk_distribution.png")

    plt.figure(figsize=(7, 4))
    sns.countplot(data=df, x="anomaly_label", hue="anomaly_label", palette="magma", legend=False)
    plt.title("Anomaly Label Distribution")
    plt.xlabel("Anomaly Label")
    plt.ylabel("Rows")
    save_fig(FIGURES_DIR / "anomaly_distribution.png")

    corr_columns = [
        "current_density",
        "predicted_density_30m",
        "duration_min",
        "event_intensity",
        "movement_speed_mps",
        "sensor_value",
        "z_score",
        "noise_db",
    ]
    plt.figure(figsize=(9, 6))
    sns.heatmap(df[corr_columns].corr(), annot=True, fmt=".2f", cmap="coolwarm", linewidths=0.5)
    plt.title("Feature Correlation Heatmap")
    save_fig(FIGURES_DIR / "correlation_heatmap.png")


def markdown_table(counts: pd.Series) -> str:
    lines = ["| Label | Count | Percent |", "|---|---:|---:|"]
    total = counts.sum()
    for label, count in counts.items():
        lines.append(f"| {label} | {int(count)} | {count / total:.2%} |")
    return "\n".join(lines)


def write_report(df: pd.DataFrame, metadata: dict) -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    risk_counts = df["risk_label"].value_counts().reindex(["Aman", "Waspada", "Bahaya"])
    anomaly_counts = df["anomaly_label"].value_counts().sort_index()
    crowd_metrics = metadata["models"]["crowd_density"]["metrics"]
    risk_metrics = metadata["models"]["risk_classifier"]["metrics"]
    anomaly_metrics = metadata["models"]["anomaly_detector"]["metrics"]

    report = f"""# Python ML Service Report

## Dataset

- Rows: {len(df)}
- Zones: {df["location"].nunique()}
- Time range: {df["recorded_at"].min()} to {df["recorded_at"].max()}
- Mean current density: {df["current_density"].mean():.2f}
- Mean predicted 30-minute density: {df["predicted_density_30m"].mean():.2f}
- Anomaly rate: {df["anomaly_label"].mean():.2%}

## Risk Distribution

{markdown_table(risk_counts)}

## Anomaly Distribution

{markdown_table(anomaly_counts)}

## Model Metrics

| Model | Algorithm | Main Metric | Supporting Metrics |
|---|---|---:|---|
| Crowd Density Predictor | RandomForestRegressor | R2 {crowd_metrics["r2"]} | MAE {crowd_metrics["mae"]}, RMSE {crowd_metrics["rmse"]} |
| Risk Classifier | GradientBoostingClassifier | Accuracy {risk_metrics["accuracy"]} | Macro F1 {risk_metrics["macro_f1"]} |
| Anomaly Detector | IsolationForest | F1 {anomaly_metrics["f1"]} | Precision {anomaly_metrics["precision"]}, Recall {anomaly_metrics["recall"]} |

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

{json.dumps(metadata["models"]["crowd_density"].get("feature_importance", [])[:5], indent=2)}

### Risk Classifier

{json.dumps(metadata["models"]["risk_classifier"].get("feature_importance", [])[:5], indent=2)}
"""
    REPORT_PATH.write_text(report, encoding="utf-8")


def main() -> None:
    df = pd.read_csv(DATASET)
    metadata = json.loads(METADATA.read_text(encoding="utf-8"))
    generate_figures(df)
    write_report(df, metadata)
    print(f"Generated report at {REPORT_PATH}")


if __name__ == "__main__":
    main()
