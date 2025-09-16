from __future__ import annotations

import asyncio
import json
import threading
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import init_db, SessionLocal
from app.api.v1 import telemetry as api_telemetry
from app.api.v1 import telemetry_raw as api_telemetry_raw
from app.schemas.telemetry import TelemetryIn
from app.crud.telemetry import create_from_payload

# ---------------------------------------------------------------------
# OpenAPI / App metadata
# ---------------------------------------------------------------------
openapi_tags = [
    {"name": "health", "description": "Status do serviço."},
    {"name": "telemetry", "description": "Ingestão e consulta da telemetria."},
]

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Backend de telemetria com FastAPI + SQLite + MQTT + WebSocket.\n"
        "- Datas: `ts` (epoch ms), `ts_iso` (UTC), `ts_local` (fuso API_TZ).\n"
        "- HTTP: ingestão e leitura.\n- WS: streaming em tempo real."
    ),
    version="1.0.0",
    openapi_tags=openapi_tags,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ---------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------
app.include_router(api_telemetry.router, prefix="/api/v1/telemetry", tags=["telemetry"])
app.include_router(api_telemetry_raw.router)

# ---------------------------------------------------------------------
# Health (inline para evitar módulos extras)
# ---------------------------------------------------------------------
@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}

@app.get("/ready", tags=["health"])
def ready() -> dict:
    # Se desejar, acrescente testes de conexão ao SQLite/MQTT aqui.
    return {"status": "ready"}

# ---------------------------------------------------------------------
# WebSocket manager simples (broadcast)
# ---------------------------------------------------------------------
class WebSocketManager:
    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def broadcast(self, payload) -> None:
        dead: list[WebSocket] = []
        for client in list(self._clients):
            try:
                await client.send_json(payload)
            except Exception:
                dead.append(client)
        for ws in dead:
            self.disconnect(ws)

ws_manager = WebSocketManager()

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        # Mantém a conexão viva sem exigir mensagens do cliente
        while True:
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(ws)

# ---------------------------------------------------------------------
# MQTT subscriber (inline, sem depender de services antigos)
# ---------------------------------------------------------------------
try:
    import paho.mqtt.client as mqtt  # type: ignore
    _HAS_PAHO = True
except Exception:
    _HAS_PAHO = False

def _start_mqtt_subscriber(loop: asyncio.AbstractEventLoop) -> None:
    """
    Inicia uma thread que:
      - Conecta no MQTT (MQTT_URL)
      - Assina o tópico (MQTT_TOPIC_SUB)
      - Para cada mensagem:
          * valida (TelemetryIn)
          * persiste bruto+processado (create_from_payload)
          * faz broadcast no WS do documento processado
    """
    if not _HAS_PAHO:
        print("[api] paho-mqtt não instalado; consumo via MQTT desabilitado.")
        return

    from urllib.parse import urlparse

    url = settings.MQTT_URL or ""
    topic = settings.MQTT_TOPIC_SUB or ""
    if not url or not topic:
        print("[api] MQTT_URL/MQTT_TOPIC_SUB não configurados; consumo via MQTT desabilitado.")
        return

    u = urlparse(url)
    host = u.hostname or "localhost"
    port = u.port or 1883

    client = mqtt.Client()
    if u.username:
        client.username_pw_set(u.username, u.password or "")

    def on_connect(cli, userdata, flags, rc):
        print(f"[api] MQTT conectado (rc={rc}) -> subscrevendo '{topic}'")
        cli.subscribe(topic, qos=0)

    def on_message(cli, userdata, msg):
        try:
            raw = json.loads(msg.payload.decode("utf-8"))
            payload = TelemetryIn.model_validate(raw)
        except Exception as e:
            print("[api] MQTT mensagem inválida:", e)
            return

        db = SessionLocal()
        try:
            proc = create_from_payload(db, payload)
        except Exception as e:
            print("[api] erro ao persistir MQTT:", e)
            proc = None
        finally:
            db.close()

        if proc is not None:
            try:
                asyncio.run_coroutine_threadsafe(ws_manager.broadcast(proc), loop)
            except Exception as e:
                print("[api] erro no broadcast WS:", e)

    def worker():
        try:
            client.on_connect = on_connect
            client.on_message = on_message
            client.connect(host, port, keepalive=30)
            print(f"[api] Consumindo MQTT em mqtt://{host}:{port} topic='{topic}'")
            client.loop_forever()
        except Exception as e:
            print("[api] MQTT subscriber encerrou com erro:", e)

    th = threading.Thread(target=worker, name="mqtt-subscriber", daemon=True)
    th.start()

# ---------------------------------------------------------------------
# Startup / Shutdown
# ---------------------------------------------------------------------
_event_loop: asyncio.AbstractEventLoop | None = None

@app.on_event("startup")
async def on_startup():
    global _event_loop
    # Garante as tabelas do SQLite
    init_db()
    # Captura event loop para uso no broadcast a partir da thread MQTT
    _event_loop = asyncio.get_running_loop()
    # Inicia o assinante MQTT (se configurado)
    _start_mqtt_subscriber(_event_loop)

@app.on_event("shutdown")
def on_shutdown():
    # Nada especial; o thread MQTT é daemon e sai com o processo.
    pass