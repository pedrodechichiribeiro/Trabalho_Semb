import os, time, json, sys
import serial
from urllib.parse import urlparse
import requests
import paho.mqtt.client as mqtt

SERIAL_PORT = os.getenv("SERIAL_PORT", "/dev/ttyACM0")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "115200"))
BRIDGE_MODE = os.getenv("BRIDGE_MODE", "mqtt").lower()  # mqtt|http

MQTT_URL = os.getenv("MQTT_URL", "mqtt://mosquitto:1883")
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "telemetry/combined/1")
MQTT_USERNAME = os.getenv("MQTT_USERNAME") or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD") or None

API_INGEST_URL = os.getenv("API_INGEST_URL", "http://api:8000/api/v1/telemetry/ingest")

def mqtt_connect(url: str):
    u = urlparse(url)
    host = u.hostname or "localhost"
    port = u.port or 1883
    client = mqtt.Client()
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD or "")
    client.connect(host, port, keepalive=30)
    client.loop_start()
    return client

def forward_mqtt(cli, payload: dict):
    cli.publish(MQTT_TOPIC, json.dumps(payload, separators=(',',':')))

def forward_http(payload: dict):
    r = requests.post(API_INGEST_URL, json=payload, timeout=5)
    if r.status_code >= 300:
        print("[serial_bridge] HTTP error", r.status_code, r.text[:200])

def open_serial():
    while True:
        try:
            print(f"[serial_bridge] opening {SERIAL_PORT} @ {SERIAL_BAUD}...")
            ser = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)
            print("[serial_bridge] serial open.")
            return ser
        except Exception as e:
            print("[serial_bridge] serial open failed:", e)
            time.sleep(2)

def main():
    cli = None
    if BRIDGE_MODE == "mqtt":
        cli = mqtt_connect(MQTT_URL)
        print(f"[serial_bridge] mode=mqtt topic={MQTT_TOPIC}")
    else:
        print(f"[serial_bridge] mode=http url={API_INGEST_URL}")

    while True:
        ser = open_serial()
        buf = b""
        try:
            while True:
                line = ser.readline()
                if not line:
                    continue
                line = line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line.decode("utf-8"))
                except Exception as e:
                    print("[serial_bridge] invalid JSON line:", line[:80], e)
                    continue

                # Transparente: não alteramos o payload. Ele deve estar no formato esperado pelo backend.
                try:
                    if BRIDGE_MODE == "mqtt":
                        forward_mqtt(cli, payload)
                    else:
                        forward_http(payload)
                except Exception as e:
                    print("[serial_bridge] forward error:", e)
        except Exception as e:
            print("[serial_bridge] serial loop error:", e)
            try:
                ser.close()
            except:
                pass
            time.sleep(1)

if __name__ == "__main__":
    main()
