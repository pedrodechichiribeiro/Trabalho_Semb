import os, time, json, math, random, requests

API_URL = os.getenv("API_INGEST_URL", "http://api:8000/api/v1/telemetry/ingest")
FEEDER_INTERVAL_MS = int(os.getenv("FEEDER_INTERVAL_MS", "200"))
SIM_SRC = os.getenv("SIM_SRC", "feeder")

def br():
    import random
    return max(-128, min(127, int(random.gauss(0, 20))))

def gen_payload(t: float) -> dict:
    import math, random
    lat0, lon0 = -23.5586, -46.6492
    lat = lat0 + 0.0001 * math.sin(t/20.0)
    lon = lon0 + 0.0001 * math.cos(t/20.0)

    pwm = int((math.sin(t/15.0) * 0.5 + 0.5) * 255)
    speed_est_mps = max(0.0, 6.0 + 4.0*math.sin(t/10.0) + random.uniform(-0.3, 0.3))

    curve_direction = int((math.sin(t/25.0) * 0.5 + 0.5) * 360) % 361
    speed_cmd_byte = int((math.cos(t/14.0) * 0.5 + 0.5) * 255)
    movement_direction = 1 if math.sin(t/40.0) >= -0.8 else 0

    return {
        "car": {
            "gps": {"latitude": lat, "longitude": lon},
            "imu": {
                "accelerationX": br(), "accelerationY": br(), "accelerationZ": br(),
                "spinX": br(), "spinY": br(), "spinZ": br(),
                "scale_dps": random.choice([250, 500, 1000, 2000])
            },
            "drive": {"pwm": pwm, "speed_est_mps": round(speed_est_mps, 3)}
        },
        "centric": {
            "controls": {
                "curve_direction": curve_direction,
                "speed": speed_cmd_byte,
                "movement_direction": movement_direction
            }
        },
        "src": SIM_SRC
    }

def main():
    t0 = time.time()
    print(f"[feeder_http] posting to {API_URL} every {FEEDER_INTERVAL_MS}ms")
    while True:
        t = time.time() - t0
        payload = gen_payload(t)
        try:
            r = requests.post(API_URL, json=payload, timeout=5)
            if r.status_code >= 300:
                print("[feeder_http] error", r.status_code, r.text[:200])
        except Exception as e:
            print("[feeder_http] exception:", e)
        time.sleep(FEEDER_INTERVAL_MS/1000.0)

if __name__ == "__main__":
    main()
