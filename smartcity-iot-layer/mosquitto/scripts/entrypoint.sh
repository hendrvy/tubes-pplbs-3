#!/bin/sh
set -eu

USER_NAME="${MQTT_USERNAME:-iot_device}"
USER_PASS="${MQTT_PASSWORD:-iot_secret}"
PASSWORD_FILE="/mosquitto/data/passwords"

rm -f "$PASSWORD_FILE"
mosquitto_passwd -b -c "$PASSWORD_FILE" "$USER_NAME" "$USER_PASS"
chown mosquitto:mosquitto "$PASSWORD_FILE"
chmod 640 "$PASSWORD_FILE"

exec mosquitto -c /mosquitto/config/mosquitto.conf
