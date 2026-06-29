from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Smart Crowd Python ML Service"
    app_version: str = "1.0.0"
    environment: str = "development"
    service_name: str = "python-ml"
    host: str = "0.0.0.0"
    port: int = 5000

    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    rabbitmq_exchange: str = "city_events"
    rabbitmq_crowd_queue: str = "crowd.new"
    rabbitmq_incident_queue: str = "incident.new"
    rabbitmq_alert_queue: str = "anomaly.alert"

    base_dir: Path = Path(__file__).resolve().parents[2]
    data_dir: Path = base_dir / "data"
    models_dir: Path = base_dir / "models"
    reports_dir: Path = base_dir / "reports"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

