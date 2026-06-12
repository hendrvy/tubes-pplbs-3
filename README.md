# Smart Crowd Control Platform

Sistem manajemen kerumunan cerdas berbasis microservice untuk keamanan publik.
Dibangun sebagai proyek akhir mata kuliah **Pembangunan Perangkat Lunak Orientasi Berbasis Service**.

---

## Arsitektur

```
IoT Simulator → MQTT Broker → Node-RED → API Gateway (port 3000)
                                               │
                    ┌──────────────────────────┼──────────────────────┐
                    ▼                          ▼                      ▼
             Crowd Service             Incident Service         Python ML
              (PHP, 8000)              (PHP, 8001)           (FastAPI, 5000)
                    │                          │
                    └──────────── RabbitMQ ────┘
                                      │
                              Python ML Consumer
```

---

## Prerequisites

| Tool | Versi |
|------|-------|
| Node.js | 20+ |
| PHP | 8.2+ |
| Python | 3.11+ |
| Docker & Docker Compose | 24+ |
| kubectl | 1.28+ |

---

## Setup Lokal (Tanpa Docker)

```bash
# 1. Clone repo
git clone https://github.com/<username>/smart-crowd-control.git
cd smart-crowd-control

# 2. Setup API Gateway
cd express-gateway
cp .env.example .env
# Edit .env — isi JWT_SECRET dan URL upstream
npm install
npm run dev

# 3. Cek apakah gateway berjalan
curl http://localhost:3000/health
```

---

## Setup dengan Docker Compose (Direkomendasikan)

```bash
# 1. Copy dan isi semua .env
cp .env.example .env
nano .env

# 2. (Pertama kali) Latih model ML
cd python-ml-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python train_models.py
cd ..

# 3. Build dan jalankan semua service
docker compose up -d --build

# 4. Cek status container
docker compose ps

# 5. Jalankan migrasi database
docker exec -i smartcity-mysql-1 mysql -u root -prootpass smartcity < database/schema.sql
docker exec -i smartcity-mysql-1 mysql -u root -prootpass smartcity < database/seed.sql

# 6. Verifikasi semua service sehat
curl http://localhost:3000/health
```

---

## Deploy ke Server

```bash
# Login ke server
ssh -p 8989 mahasiswa@103.147.92.134

# Clone dan setup
cd /home/mahasiswa/kelompok1/
git clone https://github.com/<username>/smart-crowd-control.git .
cp .env.example .env && nano .env

# Jalankan
docker compose up -d --build
```

---

## Deploy ke Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/ -n smartcity
kubectl get pods -n smartcity -w
```

---

## Struktur Folder

```
smart-crowd-control/
├── express-gateway/      # A1 — API Gateway
├── oauth-server/         # A2 — OAuth 2.0 + JWT
├── php-citizen/          # A3 — Crowd Service (port 8000)
├── php-traffic/          # A3 — Incident Service (port 8001)
├── php-environment/      # A3 — Environment Service (port 8002)
├── python-ml-service/    # A4 — ML FastAPI (port 5000)
├── iot/                  # A5 — MQTT + Node-RED + Simulator
├── database/             # schema.sql + seed.sql
├── k8s/                  # A6 — Kubernetes manifests
├── monitoring/           # A6 — Prometheus + Grafana
├── docker-compose.yml    # A6
└── README.md
```

---

## API Endpoints

### Public
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/health` | Status semua service |
| GET | `/metrics` | Prometheus metrics |
| POST | `/oauth/token` | Issue access token |

### Protected (Bearer JWT required)
| Method | Endpoint | Service |
|--------|----------|---------|
| GET/POST | `/api/crowd/*` | Crowd Service |
| GET/POST | `/api/incidents/*` | Incident Service |
| GET/POST | `/api/environment/*` | Environment Service |
| POST | `/predict/crowd` | Python ML |
| POST | `/predict/risk` | Python ML |
| POST | `/detect/anomaly` | Python ML |

### IoT (dari Node-RED)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/iot/crowd` | Data sensor kerumunan masuk |
| POST | `/iot/security` | Data sensor keamanan masuk |

---

## Tim

| Anggota | Tugas |
|---------|-------|
| A1 | API Gateway, Arsitektur, Postman Collection |
| A2 | OAuth 2.0, JWT, Auth Server |
| A3 | PHP MVC Services (Crowd + Incident) |
| A4 | Python ML Service (3 model) |
| A5 | IoT Layer (MQTT + Node-RED + RabbitMQ) |
| A6 | Docker, Kubernetes, Monitoring |
