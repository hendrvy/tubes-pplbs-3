import json
from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]


def test_dataset_has_required_size_and_labels():
    df = pd.read_csv(ROOT_DIR / "data" / "synthetic_crowd_data.csv")

    assert len(df) >= 5000
    assert set(["Aman", "Waspada", "Bahaya"]).issubset(set(df["risk_label"]))
    assert set([0, 1]).issubset(set(df["anomaly_label"]))


def test_model_metadata_contains_three_models():
    metadata = json.loads((ROOT_DIR / "models" / "metadata.json").read_text(encoding="utf-8"))

    assert metadata["row_count"] >= 5000
    assert set(metadata["models"]) == {
        "crowd_density",
        "risk_classifier",
        "anomaly_detector",
    }
    assert metadata["models"]["crowd_density"]["metrics"]["r2"] >= 0.7
    assert metadata["models"]["risk_classifier"]["metrics"]["accuracy"] >= 0.9

