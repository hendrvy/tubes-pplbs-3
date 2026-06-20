# Fase 3 — Node-RED Flows

Menambahkan Node-RED bridge flows di atas MQTT Broker (Fase 1) + Simulator (Fase 2).  
Node-RED berfungsi sebagai jembatan (bridge) antara protokol MQTT dan REST API (PHP Service).

## Cara Menjalankan

cd smartcity-iot-layer

docker compose up -d

pip install -r requirements.txt

python simulator/simulator.py

## Lakukan tes Subcribe dan publish

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

docker exec -it city-mosquitto sh
mosquitto_pub \
-h localhost \
-p 1883 \
-u iot_device \
-P iot_secret \
-t "city/zone1/crowd" \
-m '{"zone":"zone1","timestamp":"2024-06-01T12:00:00Z","crowd_density":120,"speed":1.5,"incident_flag":false,"officer_count":5,"alert_level":"low","temperature":30.5,"humidity":70.0,"visibility":8.0}'
