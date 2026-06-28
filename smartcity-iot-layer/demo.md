## Demo lengkap dari awal sampai akhir

### Prasyarat

- Docker dan Docker Compose terpasang
- Node.js terpasang
- Python 3 terpasang

### 1. Masuk ke folder repository

```bash
cd smartcity-iot-layer
```

### 2. Nyalakan seluruh stack

```bash
docker compose up -d
```

Tunggu sampai service:

- `city-mosquitto` berjalan
- `city-node-red` berjalan
- `city-rabbitmq` berjalan
- `city-iot-api` berjalan

### 3. Verifikasi service dasar

```bash
docker compose ps
```

Akses:

- Node-RED: `http://localhost:1880`
- RabbitMQ Management: `http://localhost:15672`
- API gateway: `http://localhost:3000`

### 4. Buat virtual environment Python

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Lihat pesan MQTT langsung

Buka terminal baru dan jalankan:

```bash
docker exec -it city-mosquitto sh

mosquitto_sub -h localhost -p 1883 -u iot_device -P iot_secret -t "city/#" -v
```

Kamu akan melihat pesan JSON yang diterbitkan simulator.

### 6. Jalankan simulator IoT

Buka terminal baru dan jalankan:

```bash
PUBLISH_INTERVAL_SECONDS=5 .venv/bin/python3 iot/simulator.py
```

Simulator menampilkan logging real-time:

```
City IoT Simulator started
  MQTT broker: localhost:1884
  Zones: zone1, zone2, zone3, zone4
  Interval: 5s

--- Tick 1 @ 2026-06-28T07:40:59.302113+00:00 ---
  [07:40:59] Published city/zone1/crowd | rc=0
  [07:40:59] Published city/zone1/security | rc=0
  [07:40:59] Published city/zone1/environment | rc=0
  ...
  -> 12 messages published (5s until next tick)
```

### 7. Cek ulang broker dan Node-RED

- Pastikan Node-RED sudah tersambung ke broker Mosquitto (`node-red-city-bridge`).
- Pastikan Node-RED flow aktif untuk topik `city/+/crowd`, `city/+/security`, dan `city/+/environment`.

### 8. Cek API health

```bash
curl http://localhost:3000/health
```

Respons yang diharapkan:

```json
{
  "status": "ok",
  "rabbitmq": "connected",
  "queues": [
    "crowd.new",
    "incident.new",
    "environment.new",
    "security.status",
    "anomaly.alert",
    "report.submitted",
    "iot.command"
  ]
}
```

### 9. Cek pesan di RabbitMQ

Buka RabbitMQ Management UI di `http://localhost:15672`.
Login dengan:

- user: `iot_user`
- password: `iot_secret`

Lihat queue:

- `crowd.new` — data kerumunan
- `incident.new` — insiden keamanan
- `security.status` — status keamanan (non-insiden)
- `environment.new` — data lingkungan
- `anomaly.alert` — alert anomali
- `report.submitted` — laporan manual
- `iot.command` — perintah IoT

### 10. Demo publish manual MQTT

Gunakan ini di terminal host:

```bash
docker exec -it city-mosquitto sh

mosquitto_pub -h localhost -p 1883 -u iot_device -P iot_secret \
  -t "city/zone1/crowd" \
  -m '{"zone":"zone1","density_count":420,"risk_level":"medium","speed":1.8,"timestamp":"2026-06-28T00:00:00Z"}'
```

### 11. Demo fallback Node-RED ketika API down

Stop API sementara:

```bash
docker compose stop api
```

Lalu lihat file local queue:

```bash
tail -f iot/node-red-data/gateway-failed.jsonl
```

Kemudian hidupkan kembali API:

```bash
docker compose start api
```

### 12. Akhiri demo

```bash
docker compose down
```

Jika kamu menggunakan virtual environment Python:

```bash
deactivate
```

### 13. e2e test

```bash
node --test test/e2e.test.js
```

Test memverifikasi 10 skenario: health check (7 queue), direct API publish (crowd, incident, environment), MQTT bridge (crowd, security, environment) via Node-RED, dan full pipeline simulator (12 events).

### 14. consume test
data dari rabbitmq queue `crowd.new` dan `incident.new` akan dikonsumsi oleh test ini. Pastikan service `city-rabbitmq` dan `city-iot-api` sudah berjalan.

```bash
node --test test/consume.test.js
```

## Catatan penting

- Broker Mosquitto mendengarkan pada port container `1883`, tetapi host port yang dipetakan adalah `1884`.
- Saat menjalankan simulator di host, gunakan `MQTT_PORT=1884`.
- Saat menggunakan `docker exec -it city-mosquitto sh`, gunakan port `1883` untuk `mosquitto_pub`/`mosquitto_sub` di dalam container.
- Untuk produksi, jangan simpan password secara eksplisit di file teks.
