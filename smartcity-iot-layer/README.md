# City IoT Layer

## Ringkasan

Repo ini membangun fitur ingestion dan event distribution untuk data IoT Smart City.

Fitur utama:

- Menerima data sensor dari broker MQTT Mosquitto.
- Menghubungkan topik MQTT ke HTTP API gateway menggunakan Node-RED.
- Memvalidasi payload dan menerbitkannya ke RabbitMQ.
- Menyediakan fallback lokal pada Node-RED saat API down.
- Memudahkan demo langsung dengan `mosquitto_pub`/`mosquitto_sub` dan simulator Python.

## Arsitektur

```
[Simulator IoT] --> [MQTT Broker Mosquitto] --> [Node-RED Bridge] --> [API Express] --> [RabbitMQ]
                                      |                                       |
                                      |                                       +--> [Health + Report endpoints]
                                      +--> local gateway queue file when API fails
```

### Komponen utama

- `iot/` : semua konfigurasi IoT dan simulator
  - `iot/mosquitto.conf` : konfigurasi broker MQTT dengan autentikasi
  - `iot/mosquitto-entrypoint.sh` : buat password dan jalankan Mosquitto
  - `iot/simulator.py` : generator payload sensor untuk `crowd`, `security`, dan `environment`
  - `iot/node-red-data/flows.json` : Node-RED flow yang meneruskan MQTT ke API
- `src/` : kode API Express
  - `src/index.js` : entrypoint server, koneksi RabbitMQ
  - `src/app.js` : middleware, logging, routing
  - `src/routes/` : kumpulan route API
  - `src/controllers/` : handler HTTP
  - `src/services/` : business logic dan publikasi RabbitMQ
  - `src/utils/payload.js` : normalisasi dan validasi request payload
- `scripts/setup-rabbitmq.js` : helper untuk menyiapkan exchange dan queue manual
- `docker-compose.yml` : jalankan Mosquitto, Node-RED, RabbitMQ, dan API secara bersamaan

## Penjelasan apa yang dikerjakan kode ini

### 1. Ingest sensor data melalui MQTT

`iot/simulator.py` menghasilkan payload sensor untuk zona kota `zone1` sampai `zone4`.

- `city/{zone}/crowd` : data kerumunan
- `city/{zone}/security` : data keamanan
- `city/{zone}/environment` : data lingkungan

Payload dibuat secara teratur, termasuk kondisi normal, spike event, dan anomali.

### 2. Bridge MQTT ke HTTP API dengan Node-RED

Node-RED mengambil pesan MQTT dari Mosquitto dan mengubahnya menjadi request HTTP:

- `city/+/crowd` -> `POST http://api:3000/iot/crowd`
- `city/+/security` -> `POST http://api:3000/iot/security`
- `city/+/environment` -> `POST http://api:3000/iot/environment`

Jika API tidak tersedia, Node-RED menyimpan payload gagal ke file lokal:

- `iot/node-red-data/gateway-failed.jsonl`

### 3. Validasi, transformasi, dan publish event di API

API Express menerima request dari Node-RED dan melakukan:

- validasi zona (`zone1`, `zone2`, `zone3`, `zone4`)
- verifikasi field wajib untuk masing-masing tipe event
- penambahan metadata `received_at`
- penerbitan ke RabbitMQ melalui exchange `city.events`

### 4. Queue RabbitMQ untuk downstream processing

RabbitMQ digunakan sebagai bus event untuk menyalurkan data ke konsumer berikutnya.

Bindings yang didefinisikan:

| Queue | Routing Key | Sumber Data |
|---|---|---|
| `crowd.new` | `crowd.new` | Data crowd dari simulator |
| `incident.new` | `incident.new` | Security dengan `incident_flag=true` |
| `security.status` | `security.status` | Security dengan `incident_flag=false` |
| `environment.new` | `environment.new` | Data lingkungan dari simulator |
| `anomaly.alert` | `anomaly.alert` | Alert anomali/ML |
| `report.submitted` | `report.submitted` | Laporan manual |
| `iot.command` | `iot.command` | Perintah IoT |

API otomatis membuat exchange dan queue saat start.

### 5. Endpoint tambahan

API juga mendukung:

- `GET /health` : cek status service dan konektivitas RabbitMQ
- `POST /reports` : kirim laporan manual ke routing key `report.submitted`
- `POST /iot/anomaly-alert` : publish alert anomali ke routing key `anomaly.alert`
- `POST /iot/command` : publish perintah IoT ke routing key `iot.command`

## Daftar Express endpoints

Express API mendukung endpoint berikut:

- `GET /health`
- `POST /reports`
- `POST /iot/crowd`
- `POST /iot/security`
- `POST /iot/environment`
- `POST /iot/anomaly-alert`
- `POST /iot/command`

## Feature utama

Fitur yang dibangun oleh kode ini adalah:

- IoT ingestion pipeline dari MQTT ke event bus
- Sensor simulator untuk pengujian end-to-end
- Node-RED bridge untuk koneksi MQTT -> HTTP
- API gateway untuk validasi dan routing event
- RabbitMQ-based event distribution
- Local failover queue di Node-RED jika API tidak tersedia

## Tech Stack

Teknologi utama yang digunakan di project ini:

- Docker Compose: men-deploy Mosquitto, RabbitMQ, Node-RED, dan API secara bersamaan
- MQTT broker: `eclipse-mosquitto` untuk ingest data IoT
- Node-RED: bridge MQTT -> HTTP dan queue failover
- Node.js + Express: API gateway untuk memvalidasi dan menerbitkan event
- RabbitMQ: message broker/event bus untuk downstream processing
- Python + `paho-mqtt`: simulator IoT untuk mengirim payload MQTT
- `amqplib`: library RabbitMQ client di Node.js
- `dotenv`: konfigurasi environment variables
- `helmet`, `cors`, `morgan`: middleware keamanan, CORS, dan logging untuk API

## Mengambil data dari RabbitMQ

RabbitMQ menampung event yang sudah tervalidasi oleh API. Untuk membaca atau mengkonsumsi data tersebut, gunakan salah satu cara berikut.

### 1. RabbitMQ Management UI

Buka: `http://localhost:15672`

Login dengan:

- user: `iot_user`
- password: `iot_secret`

Kemudian:

- buka tab `Queues`
- pilih queue seperti `crowd.new`, `incident.new`, atau `anomaly.alert`
- lihat `Ready` messages dan gunakan tombol `Get messages` untuk mengambil contoh pesan

### 2. Command line dari host

Lihat queue yang aktif:

```bash
docker compose exec rabbitmq rabbitmqctl list_queues
```

Ambil pesan dari queue menggunakan `rabbitmqadmin` (jika tersedia) atau via script konsumer custom.

### 3. Contoh consumer sederhana dengan Node.js

Gunakan file `consume.js` yang sudah ada di repo:

```bash
node consume.js
```

Atau buat consumer custom untuk queue lain:

```js
import amqp from "amqplib";

const conn = await amqp.connect("amqp://iot_user:iot_secret@localhost:5672");
const ch = await conn.createChannel();
await ch.assertQueue("environment.new", { durable: true });

console.log("Waiting for messages on environment.new...");
ch.consume("environment.new", (msg) => {
  if (msg) {
    console.log("Received:", msg.content.toString());
    ch.ack(msg);
  }
});
```

## Menjalankan E2E test

Project sudah dilengkapi dengan test end-to-end di file `test/e2e.test.js`.

Jalankan semua test dengan perintah:

```bash
npm test
```

Atau jalankan file test langsung:

```bash
node --test test/e2e.test.js
```

Test E2E ini memverifikasi:

- `GET /health` API sehat dan RabbitMQ terhubung (7 queue)
- exchange dan queue RabbitMQ sudah dibuat (crowd.new, incident.new, environment.new, security.status, anomaly.alert, report.submitted, iot.command)
- `POST /iot/crowd`, `POST /iot/security`, dan `POST /iot/environment` publish event ke RabbitMQ
- pesan MQTT `city/zoneX/crowd`, `city/zoneX/security`, dan `city/zoneX/environment` di-bridge oleh Node-RED ke RabbitMQ
- simulator `iot/simulator.py` mengalirkan 12 event/tick melalui MQTT -> Node-RED -> API -> RabbitMQ

## Endpoint Express

Daftar endpoint API yang tersedia:

- `GET /health`
- `POST /reports`
- `POST /iot/crowd`
- `POST /iot/security`
- `POST /iot/environment`
- `POST /iot/anomaly-alert`
- `POST /iot/command`

## Struktur dan peran file

### `docker-compose.yml`

Menjalankan:

- `city-mosquitto` : broker MQTT Mosquitto
- `city-node-red` : Node-RED untuk bridging
- `city-rabbitmq` : RabbitMQ + management UI
- `city-iot-api` : API Express yang terhubung ke RabbitMQ

### `iot/mosquitto.conf`

Konfigurasi broker MQTT dengan:

- autentikasi pengguna
- port listener internal `1883`
- persistence dan logging ke stdout

### `iot/mosquitto-entrypoint.sh`

Skrip entrypoint Docker untuk membuat password file Mosquitto dan menjalankan Mosquitto.

### `iot/simulator.py`

Simulator membuat payload JSON dan publish ke broker MQTT.
Output mencakup logging real-time timestamp, topic, dan status tiap publish.

Fungsi penting:

- `build_payloads(zone, tick)` : membuat data crowd/security/environment
- `publish(client, topic, payload)` : publish ke topik MQTT dengan logging

### `iot/node-red-data/flows.json`

Node-RED flow untuk bridge MQTT ke API dan menulis fallback file jika API down.

### `src/index.js`

Start server Express dan sambungkan ke RabbitMQ saat inisialisasi.

### `src/app.js`

Konfigurasi middleware umum:

- helmet
- cors
- express.json
- morgan
- error handler

### `src/routes/index.js`

Menggabungkan rute:

- health
- /iot
- /reports

### `src/controllers/iot.controller.js`

Menangani request REST dari Node-RED dan memanggil service yang sesuai.

### `src/services/iot.service.js`

Membuat event RabbitMQ untuk setiap tipe payload dan menentukan routing key:

| Event | Routing Key | Queue Tujuan |
|---|---|---|
| Crowd | `crowd.new` | `crowd.new` |
| Security (incident) | `incident.new` | `incident.new` |
| Security (no incident) | `security.status` | `security.status` |
| Environment | `environment.new` | `environment.new` |
| Anomaly alert | `anomaly.alert` | `anomaly.alert` |
| Command | `iot.command` | `iot.command` |

### `src/services/rabbitmq.service.js`

Membuat koneksi RabbitMQ, exchange `city.events`, assert queue, dan publish event.

### `src/utils/payload.js`

Normalisasi payload request dan validasi field yang wajib.
