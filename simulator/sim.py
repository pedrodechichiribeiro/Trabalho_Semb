import os, time, json, math
from urllib.parse import urlparse
import paho.mqtt.client as mqtt

# ===== env =====
MQTT_URL   = os.getenv("MQTT_URL",  "mqtt://mosquitto:1883")
MQTT_TOPIC = os.getenv("MQTT_TOPIC","telemetry/combined/1")
INTERVAL   = int(os.getenv("SIM_INTERVAL_MS","200"))
SRC        = os.getenv("SIM_SRC","sim")
USER       = os.getenv("MQTT_USERNAME") or None
PASS       = os.getenv("MQTT_PASSWORD") or None

u = urlparse(MQTT_URL)
HOST = u.hostname or "mosquitto"
PORT = u.port or 1883

# ===== mqtt client =====
client = mqtt.Client(protocol=mqtt.MQTTv311, clean_session=True)
if USER:
    client.username_pw_set(USER, PASS)

# last will (opcional)
client.will_set(MQTT_TOPIC, payload=b'{"src":"sim","_status":"down"}', qos=0, retain=False)

def on_connect(c, ud, flags, rc):
    print(f"[sim] connected rc={rc}")

def on_disconnect(c, ud, rc):
    print(f"[sim] disconnect rc={rc}")

client.on_connect = on_connect
client.on_disconnect = on_disconnect

client.connect(HOST, PORT, keepalive=30)
client.loop_start()  # <<< IMPORTANTE: mantém o keepalive / ping

t0 = time.monotonic()

def make_payload(t: float) -> dict:
    # trajetória simples ao redor de um ponto
    lat0, lon0 = -23.5586, -46.6492
    lat = lat0 + 0.00015 * math.sin(t / 20)
    lon = lon0 + 0.00015 * math.cos(t / 20)

    # IMU (faixa -128..127)
    accX = int(40 * math.sin(t / 3))
    accY = int(40 * math.cos(t / 5))
    accZ = int(10 * math.sin(t / 7))
    spinX = int(50 * math.sin(t / 4))
    spinY = int(50 * math.cos(t / 6))
    spinZ = int(70 * math.sin(t / 2))

    # drive
    pwm = int(( (math.sin(t / 5) + 1) / 2 ) * 255)
    speed_est_mps = round(12.0 * ((math.sin(t / 5) + 1) / 2), 3)

    # direção/central
    steering = (math.sin(t / 4) * 90)  # -90..+90
    speed_cmd = pwm
    movement_direction = 1 if math.sin(t / 15) > -0.2 else 0

    return {
        "car": {
            "gps": {"latitude": lat, "longitude": lon},
            "imu": {
                "accelerationX": accX, "accelerationY": accY, "accelerationZ": accZ,
                "spinX": spinX, "spinY": spinY, "spinZ": spinZ, "scale_dps": 500
            },
            "drive": {"pwm": pwm, "speed_est_mps": speed_est_mps}
        },
        "centric": {
            "controls": {
                "curve_direction": int((steering + 360) % 360),
                "speed": speed_cmd,
                "movement_direction": movement_direction
            }
        },
        "src": SRC
    }

try:
    while True:
        t = time.monotonic() - t0
        payload = make_payload(t)
        client.publish(MQTT_TOPIC, json.dumps(payload).encode(), qos=0, retain=False)
        time.sleep(INTERVAL / 1000.0)
except KeyboardInterrupt:
    pass
finally:
    client.loop_stop()
    client.disconnect()
