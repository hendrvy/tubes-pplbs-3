# IoT Layer

README ini menjelaskan bagian `iot` dari project City IoT Layer.

## Tujuan

Bagian `iot` ini adalah lapisan integrasi IoT untuk:

- Menjalankan broker MQTT Mosquitto dengan autentikasi.
- Mensimulasikan data sensor kota (crowd, security, environment).
- Menghubungkan MQTT ke API gateway lewat Node-RED.
- Mengirim event ke RabbitMQ untuk pemrosesan downstream.

## Struktur Utama

- `mosquitto.conf` - konfigurasi Mosquitto broker.
- `mosquitto-entrypoint.sh` - membuat file password MQTT dan menjalankan Mosquitto.
- `simulator.py` - simulator sensor yang publish data ke topik MQTT.
- `node-red-data/` - data Node-RED, termasuk flow untuk bridge MQTT ➜ API.

## Penjelasan Kode

### `iot/mosquitto.conf`

File ini mengonfigurasi broker Mosquitto:

- `listener 1883 0.0.0.0` mendengarkan port MQTT default.
- `allow_anonymous false` memaksa autentikasi username/password.
- `password_file /mosquitto/data/passwords` menyimpan kredensial.
- `persistence` dan `log_dest stdout` untuk durable storage dan logging.

### `iot/mosquitto-entrypoint.sh`

Skrip entrypoint Docker yang:

- membuat file password Mosquitto dengan `mosquitto_passwd`
- menetapkan username/password dari environment
- menjalankan Mosquitto dengan konfigurasi yang telah dibuat

### `iot/simulator.py`

Simulator Python ini:

- menggunakan `paho.mqtt.client` untuk terhubung ke broker MQTT.
- mem-publish tiga jenis payload ke setiap zona: `crowd`, `security`, `environment`.
- menghasilkan event dengan variasi kondisi normal, spike konser/demo, dan anomali.
- menerapkan topik MQTT sesuai konvensi:
  - `city/{zone}/crowd`
  - `city/{zone}/security`
  - `city/{zone}/environment`

Payload dikirim tiap 30 detik (default) ke broker.

### `iot/node-red-data/`

Folder ini menyimpan konfigurasi Node-RED. Flow di sini bertugas:

- subscribe topik MQTT dari Mosquitto.
- memetakan pesan MQTT ke endpoint API.
- meneruskan event ke service gateway yang ada pada `src/`.

## Alur Sistem Singkat

1. `simulator.py` publish data MQTT ke broker Mosquitto.
2. Node-RED subscribe topik MQTT dan melakukan transformasi payload.
3. Node-RED memanggil API JavaScript di `http://api:3000/iot/...`.
4. API memvalidasi payload dan mengirim event ke RabbitMQ.
5. Downstream worker atau layanan lain dapat memproses event dari queue RabbitMQ.

## Kredensial Default

- MQTT username: `iot_device`
- MQTT password: `iot_secret`

Environment Node-RED dan API juga menggunakan kredensial ini untuk mengakses broker.

## Langkah Demo Singkat

Ikuti langkah ini untuk menjalankan demo lokal:

1. Pastikan berada di folder project `iot-layer`.
2. Jalankan stack Docker:

```bash
docker compose up -d
```

3. Periksa service:

- Mosquitto MQTT: `localhost:1884`
- Node-RED: `http://localhost:1880`
- RabbitMQ management: `http://localhost:15672`
- API gateway: `http://localhost:3000`

4. Jalankan simulator IoT:

```bash
source .venv/bin/activate
pip install -r requirements.txt
deactivate
```

> Catatan: `iot/simulator.py` default terhubung ke `localhost:1883`. Ketika broker Mosquitto dijalankan lewat Docker Compose, host port yang dipetakan adalah `1884`, jadi jalankan dengan environment yang sesuai.

```bash
python3 iot/simulator.py
```

Atau dengan environment custom:

```bash
MQTT_HOST=localhost MQTT_PORT=1884 MQTT_USERNAME=iot_device MQTT_PASSWORD=iot_secret python3 iot/simulator.py
```

5. Cek apakah MQTT message benar dikirim:

- Buka Node-RED dan pastikan flow `city/+/crowd`, `city/+/security`, dan `city/+/environment` aktif.
- Cek API health:

```bash
curl http://localhost:3000/health
```

6. Cek RabbitMQ queue untuk event yang masuk.

Login Rabit Mq management console: `http://localhost:15672` (default user/password: guest/guest) atau iot_user and iot_secret.

## Topic Convention

Topik MQTT yang digunakan:

- `city/{zone}/crowd`
- `city/{zone}/security`
- `city/{zone}/environment`

Contoh topik real:

- `city/zone1/crowd`
- `city/zone2/security`
- `city/zone3/environment`

## Demo MQTT Langsung (mosquitto_pub / mosquitto_sub)

Jika ingin demo langsung tanpa simulator, gunakan utilitas `mosquitto_pub` / `mosquitto_sub`.
CASE 1

# Terminal 1

docker exec -it city-mosquitto sh

mosquitto_sub \
-h localhost \
-p 1883 \
-u iot_device \
-P iot_secret \
-t "#" \
-v

# Terminal 2

docker exec -it city-mosquitto sh

mosquitto_pub \
-h localhost \
-p 1883 \
-u iot_device \
-P iot_secret \
-t "city/zone1/crowd" \
-m hello

Case 2

# Terminal 1

docker exec -it city-mosquitto sh
mosquitto_sub \
-h localhost \
-p 1883 \
-u iot_device \
-P iot_secret \
-t "city/#" \
-v

# Terminal 2

mosquitto_sub \
-h 192.168.0.4 \
-p 1884 \
-u iot_device \
-P iot_secret \
-t "#"
mosquitto_pub \
-h 192.168.0.4 \
-p 1884 \
-u iot_device \
-P iot_secret \
-t test \
-m hello

docker exec -it city-mosquitto sh
mosquitto_pub \
-h localhost \
-p 1883 \
-u iot_device \
-P iot_secret \
-t "city/zone1/crowd" \
-m '{"zone":"zone1","timestamp":"2024-06-01T12:00:00Z","crowd_density":120,"speed":1.5,"incident_flag":false,"officer_count":5,"alert_level":"low","temperature":30.5,"humidity":70.0,"visibility":8.0}'
