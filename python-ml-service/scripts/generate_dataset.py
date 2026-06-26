from __future__ import annotations

import argparse
import csv
import math
import random
from datetime import datetime, timedelta
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT_DIR / "data" / "synthetic_crowd_data.csv"

ZONES = {
    "zone1": {"zone_id": 1, "area_m2": 520, "exits": 3, "base": 155, "capacity": 760},
    "zone2": {"zone_id": 2, "area_m2": 680, "exits": 4, "base": 125, "capacity": 880},
    "zone3": {"zone_id": 3, "area_m2": 430, "exits": 2, "base": 105, "capacity": 560},
    "zone4": {"zone_id": 4, "area_m2": 810, "exits": 5, "base": 95, "capacity": 980},
    "zone5": {"zone_id": 5, "area_m2": 360, "exits": 2, "base": 80, "capacity": 470},
}

WEATHER = {
    0: {"label": "clear", "factor": 1.0},
    1: {"label": "cloudy", "factor": 0.96},
    2: {"label": "rain", "factor": 0.82},
    3: {"label": "storm", "factor": 0.68},
}


def time_factor(hour: int) -> float:
    morning = math.exp(-((hour - 8) ** 2) / 18)
    lunch = math.exp(-((hour - 13) ** 2) / 22)
    evening = math.exp(-((hour - 20) ** 2) / 14)
    return 0.72 + 0.26 * morning + 0.18 * lunch + 0.48 * evening


def choose_weather(rng: random.Random) -> int:
    return rng.choices([0, 1, 2, 3], weights=[0.56, 0.25, 0.15, 0.04], k=1)[0]


def classify_risk(density: float, duration_min: float, area_m2: float, exits: int, event_intensity: float) -> str:
    occupancy_ratio = density / area_m2
    exit_pressure = density / max(exits, 1)
    score = (
        0.55 * occupancy_ratio
        + 0.0017 * duration_min
        + 0.00085 * exit_pressure
        + 0.22 * event_intensity
    )
    if score >= 0.72:
        return "Bahaya"
    if score >= 0.42:
        return "Waspada"
    return "Aman"


def anomaly_reason(is_anomaly: bool, z_score: float, speed: float, noise_db: float) -> str:
    if not is_anomaly:
        return "normal"
    if z_score >= 3.0:
        return "density_spike"
    if speed <= 0.18:
        return "stalled_movement"
    if noise_db >= 94:
        return "panic_noise"
    return "sensor_outlier"


def generate_rows(row_count: int, seed: int) -> list[dict[str, object]]:
    rng = random.Random(seed)
    start = datetime(2025, 6, 1, 0, 0, 0)
    rows: list[dict[str, object]] = []

    for idx in range(row_count):
        ts = start + timedelta(minutes=15 * idx)
        location, zone = rng.choice(list(ZONES.items()))
        hour = ts.hour
        day_of_week = ts.weekday()
        is_weekend = int(day_of_week >= 5)
        weather_code = choose_weather(rng)
        weather = WEATHER[weather_code]
        event_flag = int(rng.random() < (0.18 if is_weekend else 0.09))
        event_intensity = round(rng.uniform(0.45, 1.0) if event_flag else rng.uniform(0.0, 0.18), 3)

        base = zone["base"] * time_factor(hour) * weather["factor"]
        weekend_boost = 1.16 if is_weekend else 1.0
        event_boost = 1.0 + event_intensity * rng.uniform(0.28, 0.62)
        noise = rng.gauss(0, 32)
        prev_density = max(8, base * weekend_boost * event_boost + noise)

        trend = rng.gauss(0, 18) + (event_intensity * 70) - (weather_code * 9)
        current_density = max(4, min(zone["capacity"] * 1.16, prev_density + trend))
        predicted_density = max(
            4,
            min(
                zone["capacity"] * 1.22,
                current_density
                + rng.gauss(0, 21)
                + event_intensity * 55
                + (0.18 if hour in [18, 19, 20, 21] else -0.04) * current_density,
            ),
        )

        duration_min = max(5, rng.gauss(38 + event_intensity * 95 + current_density / 9, 18))
        movement_speed = max(0.05, rng.gauss(1.25 - current_density / zone["capacity"], 0.18))
        occupancy_ratio = current_density / zone["area_m2"]
        camera_count = rng.randint(2, 8)
        temperature = rng.gauss(31.0 - weather_code * 1.8, 2.4)
        humidity = min(98, max(48, rng.gauss(67 + weather_code * 7, 8)))
        noise_db = min(112, max(48, rng.gauss(64 + event_intensity * 22 + occupancy_ratio * 12, 6)))

        rolling_mean = max(8, prev_density * rng.uniform(0.86, 1.12))
        sensor_value = current_density + rng.gauss(0, 19)
        z_score = abs((sensor_value - rolling_mean) / max(18, rolling_mean * 0.12))
        injected_anomaly = rng.random() < 0.055
        if injected_anomaly:
            sensor_value *= rng.choice([0.24, 1.75, 2.35])
            z_score = max(z_score, rng.uniform(3.1, 6.2))
            movement_speed *= rng.uniform(0.25, 0.55)
            noise_db = min(114, noise_db + rng.uniform(14, 31))

        is_anomaly = int(injected_anomaly or z_score >= 3.0 or movement_speed <= 0.16)
        risk_label = classify_risk(
            density=current_density,
            duration_min=duration_min,
            area_m2=zone["area_m2"],
            exits=zone["exits"],
            event_intensity=event_intensity,
        )

        rows.append(
            {
                "recorded_at": ts.isoformat(),
                "zone_id": zone["zone_id"],
                "location": location,
                "hour": hour,
                "day_of_week": day_of_week,
                "is_weekend": is_weekend,
                "weather_code": weather_code,
                "weather_label": weather["label"],
                "temperature_c": round(temperature, 2),
                "humidity_pct": round(humidity, 2),
                "area_m2": zone["area_m2"],
                "exits_count": zone["exits"],
                "event_flag": event_flag,
                "event_intensity": event_intensity,
                "prev_density": round(prev_density, 2),
                "current_density": round(current_density, 2),
                "predicted_density_30m": round(predicted_density, 2),
                "duration_min": round(duration_min, 2),
                "movement_speed_mps": round(movement_speed, 3),
                "occupancy_ratio": round(occupancy_ratio, 4),
                "camera_count": camera_count,
                "noise_db": round(noise_db, 2),
                "risk_label": risk_label,
                "anomaly_label": is_anomaly,
                "anomaly_reason": anomaly_reason(bool(is_anomaly), z_score, movement_speed, noise_db),
                "sensor_value": round(sensor_value, 2),
                "rolling_mean_1h": round(rolling_mean, 2),
                "z_score": round(z_score, 3),
            }
        )

    return rows


def write_csv(rows: list[dict[str, object]], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic crowd-control ML dataset.")
    parser.add_argument("--rows", type=int, default=6000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if args.rows < 5000:
        raise ValueError("Dataset must contain at least 5000 rows for the A4 requirement.")

    rows = generate_rows(row_count=args.rows, seed=args.seed)
    write_csv(rows, args.output)
    print(f"Generated {len(rows)} rows at {args.output}")


if __name__ == "__main__":
    main()
