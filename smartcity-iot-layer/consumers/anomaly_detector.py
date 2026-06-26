#!/usr/bin/env python3
import json
import os
import signal
from datetime import datetime, timezone

import pika

RABBIT_URL = os.getenv("RABBITMQ_URL", "amqp://iot_user:iot_secret@localhost:5672")
EXCHANGE = os.getenv("RABBITMQ_EXCHANGE", "city.events")
running = True

def stop(_signum, _frame): global running; running = False
def now_iso(): return datetime.now(timezone.utc).isoformat()

def detect_anomaly(body):
    rules = []
    density = body.get("density_count", 0)
    if isinstance(density, (int, float)):
        if density >= 1000: rules.append(f"crowd_density_extreme:{density}")
        elif density == 0: rules.append(f"crowd_density_zero:{density}")
    speed = body.get("speed", 0)
    if isinstance(speed, (int, float)):
        if speed >= 10: rules.append(f"speed_extreme:{speed}")
        elif speed < 0: rules.append(f"speed_negative:{speed}")
    temp = body.get("temperature", None)
    if temp is not None and (temp >= 50 or temp <= -10): rules.append(f"temperature_extreme:{temp}")
    hum = body.get("humidity", None)
    if hum is not None and (hum >= 100 or hum <= 1): rules.append(f"humidity_extreme:{hum}")
    vis = body.get("visibility", None)
    if vis is not None and vis <= 0.5: rules.append(f"visibility_critical:{vis}")
    officers = body.get("officer_count", None)
    if officers is not None:
        if officers == 0: rules.append("no_officers")
        elif officers >= 50: rules.append(f"officer_count_extreme:{officers}")
    if not rules: return None
    level = "critical" if any("extreme" in r for r in rules) else "high"
    return {
        "zone": body.get("zone"), "alert_level": level,
        "reason": "; ".join(rules), "detected_at": now_iso(),
        "source": "python-ml-anomaly-detector", "original_payload": body,
    }

def callback(ch, method, _properties, body_bytes):
    try: payload = json.loads(body_bytes)
    except json.JSONDecodeError as error:
        print(f"[ERROR] Invalid JSON: {error}")
        ch.basic_nack(method.delivery_tag, requeue=False); return
    print(f"[CONSUME] {method.routing_key} zone={payload.get('zone')}", end="")
    anomaly = detect_anomaly(payload)
    if anomaly:
        ch.basic_publish(exchange=EXCHANGE, routing_key="anomaly.alert",
            body=json.dumps(anomaly), properties=pika.BasicProperties(content_type="application/json", delivery_mode=2))
        print(f" -> ANOMALY: {anomaly['reason']}")
    else: print(" -> OK")
    ch.basic_ack(method.delivery_tag)

def main():
    signal.signal(signal.SIGINT, stop); signal.signal(signal.SIGTERM, stop)
    params = pika.URLParameters(RABBIT_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    for queue in ["crowd.new", "incident.new"]:
        channel.queue_declare(queue=queue, durable=True)
        channel.queue_bind(queue=queue, exchange=EXCHANGE, routing_key=queue)
        channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=False)
        print(f"[SETUP] Listening on {queue}")
    print(f"[READY] Anomaly detector running. Queues: crowd.new, incident.new")
    try: channel.start_consuming()
    except KeyboardInterrupt: pass
    finally: connection.close(); print("[STOP] Shut down")

if __name__ == "__main__":
    main()
