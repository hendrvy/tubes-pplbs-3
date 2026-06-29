#!/usr/bin/env python3
import json
import os
import random
import signal
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1884"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "iot_device")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "iot_secret")
PUBLISH_INTERVAL_SECONDS = int(os.getenv("PUBLISH_INTERVAL_SECONDS", "30"))
SIMULATOR_RUN_ID = os.getenv("SIMULATOR_RUN_ID")
ZONES = ("zone1", "zone2", "zone3", "zone4")

running = True


def stop(_signum, _frame):
    global running
    running = False


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def risk_level(density_count):
    if density_count >= 900:
        return "critical"
    if density_count >= 650:
        return "high"
    if density_count >= 350:
        return "medium"
    return "low"


def alert_level(incident_flag, officer_count):
    if incident_flag and officer_count < 4:
        return "critical"
    if incident_flag:
        return "high"
    if officer_count < 3:
        return "medium"
    return "low"


def event_profile(tick, zone):
    concert_spike = tick % 20 in (6, 7, 8) and zone in ("zone1", "zone2")
    demo_spike = tick % 30 in (14, 15) and zone == "zone3"
    anomaly = tick % 25 == 0 and zone == "zone4"
    return concert_spike, demo_spike, anomaly


def build_payloads(zone, tick):
    concert_spike, demo_spike, anomaly = event_profile(tick, zone)
    base_density = random.randint(80, 420)
    if concert_spike:
        base_density += random.randint(450, 850)
    if demo_spike:
        base_density += random.randint(550, 950)
    if anomaly:
        base_density = random.choice((0, 1400, 1800))

    speed = round(random.uniform(0.2, 2.4), 2)
    if concert_spike or demo_spike:
        speed = round(random.uniform(2.5, 5.6), 2)
    if anomaly:
        speed = random.choice((-1.0, 0.0, 12.5))

    incident_flag = random.random() < (0.35 if demo_spike else 0.08)
    officer_count = random.randint(2, 12)
    if anomaly:
        officer_count = random.choice((0, 99))

    temperature = round(random.uniform(25.0, 34.5), 1)
    humidity = round(random.uniform(55.0, 88.0), 1)
    visibility = round(random.uniform(2.5, 10.0), 1)
    if anomaly:
        temperature = random.choice((-15.0, 62.0))
        humidity = random.choice((0.0, 120.0))
        visibility = random.choice((-1.0, 0.1))

    event_type = None
    if concert_spike:
        event_type = "concert"
    elif demo_spike:
        event_type = "demo"
    elif anomaly:
        event_type = "anomaly_test"

    common = {
        "zone": zone,
        "timestamp": now_iso(),
        "event_type": event_type,
        "simulator": "city-iot-simulator",
    }
    if SIMULATOR_RUN_ID:
        common["test_run_id"] = SIMULATOR_RUN_ID

    crowd = {
        **common,
        "density_count": base_density,
        "risk_level": risk_level(base_density),
        "speed": speed,
    }
    security = {
        **common,
        "incident_flag": incident_flag,
        "officer_count": officer_count,
        "alert_level": alert_level(incident_flag, officer_count),
    }
    environment = {
        **common,
        "temperature": temperature,
        "humidity": humidity,
        "visibility": visibility,
    }
    return crowd, security, environment


def publish(client, topic, payload):
    result = client.publish(topic, json.dumps(payload), qos=1, retain=False)
    print(f"  [{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Published {topic} | rc={result.rc}", flush=True)


def main():
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="city-iot-simulator")
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
    client.loop_start()

    run_id = f" ({SIMULATOR_RUN_ID})" if SIMULATOR_RUN_ID else ""
    print(f"City IoT Simulator started{run_id}")
    print(f"  MQTT broker: {MQTT_HOST}:{MQTT_PORT}")
    print(f"  Zones: {', '.join(ZONES)}")
    print(f"  Interval: {PUBLISH_INTERVAL_SECONDS}s")
    print()

    tick = 0
    while running:
        tick += 1
        print(f"--- Tick {tick} @ {now_iso()} ---")
        for zone in ZONES:
            crowd, security, environment = build_payloads(zone, tick)
            publish(client, f"city/{zone}/crowd", crowd)
            publish(client, f"city/{zone}/security", security)
            publish(client, f"city/{zone}/environment", environment)
        print(f"  -> {len(ZONES) * 3} messages published ({PUBLISH_INTERVAL_SECONDS}s until next tick)")
        print()
        time.sleep(PUBLISH_INTERVAL_SECONDS)

    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()
