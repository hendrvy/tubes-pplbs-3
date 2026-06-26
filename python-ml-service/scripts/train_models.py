from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, IsolationForest, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    root_mean_squared_error,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = ROOT_DIR / "data" / "synthetic_crowd_data.csv"
DEFAULT_MODELS_DIR = ROOT_DIR / "models"

CROWD_FEATURES = [
    "hour",
    "day_of_week",
    "weather_code",
    "prev_density",
    "location",
    "event_flag",
    "event_intensity",
    "temperature_c",
    "humidity_pct",
]
RISK_FEATURES = [
    "density",
    "duration_min",
    "area_m2",
    "exits_count",
    "time_of_day",
    "event_intensity",
    "movement_speed_mps",
]
ANOMALY_FEATURES = [
    "sensor_value",
    "timestamp_hour",
    "rolling_mean_1h",
    "z_score",
    "movement_speed_mps",
    "noise_db",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def prepare_frame(dataset: Path) -> pd.DataFrame:
    df = pd.read_csv(dataset)
    df["density"] = df["current_density"]
    df["time_of_day"] = df["hour"]
    df["timestamp_hour"] = df["hour"]
    return df


def feature_names(preprocessor: ColumnTransformer) -> list[str]:
    return preprocessor.get_feature_names_out().tolist()


def top_importances(pipeline: Pipeline, limit: int = 10) -> list[dict[str, Any]]:
    model = pipeline.named_steps["model"]
    if not hasattr(model, "feature_importances_"):
        return []

    names = feature_names(pipeline.named_steps["preprocess"])
    importances = model.feature_importances_
    pairs = sorted(zip(names, importances), key=lambda item: item[1], reverse=True)
    return [
        {"feature": name, "importance": round(float(score), 5)}
        for name, score in pairs[:limit]
    ]


def build_preprocessor(df: pd.DataFrame, features: list[str], categorical: list[str]) -> ColumnTransformer:
    numeric = [column for column in features if column not in categorical]
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
        ]
    )


def train_crowd_model(df: pd.DataFrame, models_dir: Path) -> dict[str, Any]:
    target = "predicted_density_30m"
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
    pipeline = Pipeline(
        steps=[
            ("preprocess", build_preprocessor(df, CROWD_FEATURES, categorical=["location"])),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=180,
                    max_depth=14,
                    min_samples_leaf=3,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    pipeline.fit(train_df[CROWD_FEATURES], train_df[target])
    predictions = pipeline.predict(test_df[CROWD_FEATURES])

    bundle = {
        "name": "crowd_density",
        "algorithm": "RandomForestRegressor",
        "features": CROWD_FEATURES,
        "target": target,
        "model": pipeline,
    }
    joblib.dump(bundle, models_dir / "crowd_density_model.joblib")

    return {
        "algorithm": bundle["algorithm"],
        "artifact": "crowd_density_model.joblib",
        "features": CROWD_FEATURES,
        "target": target,
        "metrics": {
            "mae": round(float(mean_absolute_error(test_df[target], predictions)), 3),
            "rmse": round(float(root_mean_squared_error(test_df[target], predictions)), 3),
            "r2": round(float(r2_score(test_df[target], predictions)), 4),
        },
        "feature_importance": top_importances(pipeline),
    }


def train_risk_model(df: pd.DataFrame, models_dir: Path) -> dict[str, Any]:
    target = "risk_label"
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df[target],
    )
    pipeline = Pipeline(
        steps=[
            ("preprocess", build_preprocessor(df, RISK_FEATURES, categorical=[])),
            (
                "model",
                GradientBoostingClassifier(
                    n_estimators=170,
                    learning_rate=0.06,
                    max_depth=3,
                    random_state=42,
                ),
            ),
        ]
    )
    pipeline.fit(train_df[RISK_FEATURES], train_df[target])
    predictions = pipeline.predict(test_df[RISK_FEATURES])

    bundle = {
        "name": "risk_classifier",
        "algorithm": "GradientBoostingClassifier",
        "features": RISK_FEATURES,
        "target": target,
        "model": pipeline,
    }
    joblib.dump(bundle, models_dir / "risk_classifier_model.joblib")

    return {
        "algorithm": bundle["algorithm"],
        "artifact": "risk_classifier_model.joblib",
        "features": RISK_FEATURES,
        "target": target,
        "metrics": {
            "accuracy": round(float(accuracy_score(test_df[target], predictions)), 4),
            "macro_f1": round(float(f1_score(test_df[target], predictions, average="macro")), 4),
        },
        "classification_report": classification_report(
            test_df[target],
            predictions,
            output_dict=True,
            zero_division=0,
        ),
        "feature_importance": top_importances(pipeline),
    }


def train_anomaly_model(df: pd.DataFrame, models_dir: Path) -> dict[str, Any]:
    target = "anomaly_label"
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        random_state=42,
        stratify=df[target],
    )
    pipeline = Pipeline(
        steps=[
            ("preprocess", build_preprocessor(df, ANOMALY_FEATURES, categorical=[])),
            (
                "model",
                IsolationForest(
                    n_estimators=220,
                    contamination=0.14,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    pipeline.fit(train_df[ANOMALY_FEATURES])
    raw_predictions = pipeline.predict(test_df[ANOMALY_FEATURES])
    predictions = np.where(raw_predictions == -1, 1, 0)

    bundle = {
        "name": "anomaly_detector",
        "algorithm": "IsolationForest",
        "features": ANOMALY_FEATURES,
        "target": target,
        "model": pipeline,
    }
    joblib.dump(bundle, models_dir / "anomaly_detector_model.joblib")

    return {
        "algorithm": bundle["algorithm"],
        "artifact": "anomaly_detector_model.joblib",
        "features": ANOMALY_FEATURES,
        "target": target,
        "metrics": {
            "precision": round(float(precision_score(test_df[target], predictions, zero_division=0)), 4),
            "recall": round(float(recall_score(test_df[target], predictions, zero_division=0)), 4),
            "f1": round(float(f1_score(test_df[target], predictions, zero_division=0)), 4),
        },
    }


def train_all(dataset: Path, models_dir: Path) -> dict[str, Any]:
    models_dir.mkdir(parents=True, exist_ok=True)
    df = prepare_frame(dataset)

    metadata = {
        "trained_at": utc_now(),
        "dataset": str(dataset.relative_to(ROOT_DIR)),
        "row_count": int(len(df)),
        "models": {
            "crowd_density": train_crowd_model(df, models_dir),
            "risk_classifier": train_risk_model(df, models_dir),
            "anomaly_detector": train_anomaly_model(df, models_dir),
        },
    }
    with (models_dir / "metadata.json").open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser(description="Train all Smart Crowd Control ML models.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--models-dir", type=Path, default=DEFAULT_MODELS_DIR)
    args = parser.parse_args()

    metadata = train_all(dataset=args.dataset, models_dir=args.models_dir)
    print(json.dumps(metadata["models"], indent=2))


if __name__ == "__main__":
    main()
