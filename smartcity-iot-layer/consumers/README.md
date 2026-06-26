# RabbitMQ Consumers

## Files
- anomaly_detector.py — Deteksi anomali dari crowd.new & incident.new
- notification_worker.py — Kirim notifikasi dari report.submitted

## Cara menjalankan
```bash
cd fase-4
pip install pika
python consumers/anomaly_detector.py
python consumers/notification_worker.py
```
