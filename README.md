# Smart Crowd Control Platform

Sistem **Smart Crowd Control Platform** merupakan aplikasi berbasis **Microservices Architecture** yang dikembangkan sebagai proyek akhir mata kuliah **Pembangunan Perangkat Lunak Berorientasi Service (PPLBS)**.

Platform ini bertujuan membantu pemerintah atau pengelola kawasan dalam memonitor tingkat keramaian suatu lokasi secara **real-time**, melakukan **prediksi kepadatan**, **deteksi anomali**, serta mendukung proses penanganan insiden secara cepat melalui integrasi IoT, Machine Learning, dan API Gateway.

---

# Fitur Utama

- API Gateway sebagai Single Entry Point
- OAuth 2.0 Authentication & JWT
- Crowd Monitoring Service
- Incident Management Service
- Machine Learning Prediction
- MQTT IoT Integration
- Node-RED Automation
- RabbitMQ Message Broker
- MySQL Database
- Docker Compose Deployment
- Prometheus Monitoring
- Grafana Dashboard

---

# Arsitektur Sistem

```
                        +----------------+
                        |     Client     |
                        +-------+--------+
                                |
                                |
                        Express Gateway
                           Port 3000
                                |
      -------------------------------------------------------
      |                |                 |                  |
      |                |                 |                  |
 OAuth Server     Crowd Service    Incident Service    ML Service
   Port 3002        (PHP)              (PHP)          FastAPI 5000
      |                |                  |
      |                |                  |
      ----------- MySQL Database ----------
                       |
                  RabbitMQ Broker
                       |
                  Future Consumer
                       |
                  Monitoring
                Prometheus + Grafana

             MQTT Broker (Mosquitto)
                       |
                   Node-RED
                       |
                  IoT Sensor Simulator
```

---

# Teknologi

| Teknologi | Kegunaan |
|-----------|----------|
| Express.js | API Gateway |
| PHP 8.2 | Crowd & Incident Service |
| FastAPI | Machine Learning |
| MySQL 8 | Database |
| RabbitMQ | Message Broker |
| Mosquitto | MQTT Broker |
| Node-RED | IoT Bridge |
| Docker Compose | Container Orchestration |
| Prometheus | Monitoring |
| Grafana | Dashboard |

---

# Struktur Project

```
smart-crowd-control/

├── express-gateway/
│
├── oauth-server/
│
├── php-citizen/
│
├── php-traffic/
│
├── python-ml-service/
│
├── smartcity-iot-layer/
│   ├── node-red/
│   └── simulator/
│
├── docker/
│   ├── mosquitto/
│   └── mysql/
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── monitoring/
│
├── k8s/
│
├── docker-compose.yml
│
└── README.md
```

---

# Prasyarat

Sebelum menjalankan sistem pastikan telah menginstall:

- Docker Desktop
- Docker Compose
- Git

---

# Menjalankan Sistem

Clone repository

```bash
git clone <repository-url>
cd smart-crowd-control
```

Build seluruh service

```bash
docker compose up -d --build
```

Melihat status container

```bash
docker compose ps
```

Apabila seluruh service berjalan dengan benar maka akan muncul status:

```
healthy
```

---

# Database

Import database

```bash
docker exec -i smartcity-mysql mysql -uroot -pPASSWORD < database/schema.sql
```

Import dummy data

```bash
docker exec -i smartcity-mysql mysql -uroot -pPASSWORD < database/seed.sql
```

Sesuaikan password dengan file `.env`.

---

# Daftar Service

| Service | Port |
|----------|------|
| API Gateway | 3000 |
| OAuth Server | 3002 |
| Python ML | 5000 |
| Grafana | 3001 |
| Prometheus | 9090 |
| Node-RED | 1880 |
| RabbitMQ | 15673 |
| MQTT | 1883 |
| MySQL | 3307 |

---

# Endpoint OAuth

## Login

```
POST /oauth/login
```

## Client Credentials

```
POST /oauth/client
```

## Refresh Token

```
POST /oauth/refresh
```

## Introspect Token

```
POST /oauth/introspect
```

## Revoke Token

```
POST /oauth/revoke
```

---

# Endpoint Gateway

## Health Check

```
GET /health
```

## Metrics

```
GET /metrics
```

---

# Crowd Service

```
POST /api/crowd/readings

GET /api/crowd/current

POST /api/reports

GET /api/reports
```

---

# Incident Service

```
POST /api/incidents

GET /api/incidents

PATCH /api/incidents/{id}/resolve

GET /api/zones
```

---

# Machine Learning

```
POST /predict/crowd

POST /predict/risk

POST /predict/batch

POST /detect/anomaly

GET /model/feature-importance

GET /predict/health
```

---

# IoT Endpoint

```
POST /iot/crowd

POST /iot/security
```

Node-RED akan menerima data dari MQTT Broker kemudian mengirimkan request HTTP menuju API Gateway melalui endpoint di atas.

---

# Monitoring

## Prometheus

```
http://localhost:9090
```

## Grafana

```
http://localhost:3001
```

## Node-RED

```
http://localhost:1880
```

## RabbitMQ Management

```
http://localhost:15673
```

---

# Cara Pengujian

## 1. Login

```
POST /oauth/login
```

Mendapatkan Access Token.

---

## 2. Akses Endpoint Protected

```
GET /api/crowd/current
```

Tambahkan Authorization

```
Bearer <access_token>
```

---

## 3. Rate Limiter

Lakukan request berulang.

Gateway akan mengembalikan

```
429 Too Many Requests
```

---

## 4. Machine Learning

```
POST /predict/crowd
```

Model akan menghasilkan prediksi kepadatan.

---

## 5. IoT

Publish data MQTT

```
city/zone1/crowd
```

Node-RED akan meneruskan data menuju API Gateway.

---

# Docker Compose

Menjalankan seluruh service

```bash
docker compose up -d --build
```

Menghentikan seluruh service

```bash
docker compose down
```

Melihat log

```bash
docker compose logs -f
```

---

# Kubernetes

Deploy seluruh service

```bash
kubectl apply -f k8s/
```

Melihat pod

```bash
kubectl get pods
```

---

# Monitoring Dashboard

Grafana digunakan untuk memonitor:

- Gateway Request
- HTTP Response Time
- API Traffic
- Machine Learning Request
- Service Availability

Prometheus bertugas mengumpulkan seluruh metrics dari setiap service.

---

# Tim Pengembang

| Modul                     | Penanggung Jawab|
|--------------------------------------|------|
| A1 - API Gateway                     |Hendry|
| A2 - OAuth Server                    | Rafi |
| A3 - PHP Services                    | Oman |
| A4 - Machine Learning                | Natan|
| A5 - IoT Layer                       | Seli |
| A6 - Docker, Kubernetes & Monitoring | Sean |

---

# Lisensi

Project ini dikembangkan sebagai tugas mata kuliah **Pembangunan Perangkat Lunak Berorientasi Service (PPLBS)** Universitas Pembangunan Nasional Veteran Jakarta.