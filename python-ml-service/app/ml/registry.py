from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib

from app.core.config import settings


class ModelRegistry:
    artifacts = {
        "crowd_density": "crowd_density_model.joblib",
        "risk_classifier": "risk_classifier_model.joblib",
        "anomaly_detector": "anomaly_detector_model.joblib",
    }

    def __init__(self, models_dir: Path) -> None:
        self.models_dir = models_dir
        self._models: dict[str, dict[str, Any]] = {}
        self._metadata: dict[str, Any] = {}

    def load(self) -> None:
        if self._models:
            return

        missing = [
            artifact
            for artifact in [*self.artifacts.values(), "metadata.json"]
            if not (self.models_dir / artifact).exists()
        ]
        if missing:
            raise FileNotFoundError(
                f"Missing model artifacts in {self.models_dir}: {', '.join(missing)}"
            )

        for name, artifact in self.artifacts.items():
            self._models[name] = joblib.load(self.models_dir / artifact)

        with (self.models_dir / "metadata.json").open("r", encoding="utf-8") as handle:
            self._metadata = json.load(handle)

    @property
    def metadata(self) -> dict[str, Any]:
        self.load()
        return self._metadata

    def get(self, name: str) -> dict[str, Any]:
        self.load()
        return self._models[name]

    def model_names(self) -> list[str]:
        self.load()
        return list(self._models.keys())


@lru_cache
def get_registry() -> ModelRegistry:
    return ModelRegistry(settings.models_dir)

