#!/usr/bin/env python3
import json
import os
import signal

import pika

RABBIT_URL = os.getenv("RABBITMQ_URL", "amqp://iot_user:iot_secret@localhost:5672")
EXCHANGE = os.getenv("RABBITMQ_EXCHANGE", "city.events")
running = True

def stop(_signum, _frame): global running; running = False

def send_notification(report):
    print(f"[NOTIFICATION] Report {report.get('report_id')} dari zone {report.get('zone')}")
    print(f"               Message: {report.get('message', '(no message)')}")

def callback(ch, method, _properties, body_bytes):
    try: payload = json.loads(body_bytes)
    except json.JSONDecodeError as error:
        print(f"[ERROR] Invalid JSON: {error}")
        ch.basic_nack(method.delivery_tag, requeue=False); return
    send_notification(payload)
    ch.basic_ack(method.delivery_tag)

def main():
    signal.signal(signal.SIGINT, stop); signal.signal(signal.SIGTERM, stop)
    params = pika.URLParameters(RABBIT_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE, exchange_type="topic", durable=True)
    channel.queue_declare(queue="report.submitted", durable=True)
    channel.queue_bind(queue="report.submitted", exchange=EXCHANGE, routing_key="report.submitted")
    channel.basic_consume(queue="report.submitted", on_message_callback=callback, auto_ack=False)
    print(f"[READY] Notification worker listening on report.submitted")
    try: channel.start_consuming()
    except KeyboardInterrupt: pass
    finally: connection.close(); print("[STOP] Shut down")

if __name__ == "__main__":
    main()
