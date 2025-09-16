
"""Overlay de configurações: adiciona VMAX_MPS e ajusta def. do tópico."""
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Any
import os, json as _json

class Settings(BaseSettings):
    APP_NAME: str = "telemetry-api"
    MQTT_URL: str = os.getenv("MQTT_URL", "mqtt://localhost:1883")
    MQTT_TOPIC_SUB: str = os.getenv("MQTT_TOPIC_SUB", "telemetry/combined/1")
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "/data/telemetry.db")

    SERIAL_PORT: str = os.getenv("SERIAL_PORT", "/dev/ttyACM0")
    SERIAL_BAUD: int = int(os.getenv("SERIAL_BAUD", "115200"))

    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    API_TZ: str = os.getenv("API_TZ", "UTC")

    VMAX_MPS: float = float(os.getenv("VMAX_MPS", "12"))

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                try:
                    arr = _json.loads(s)
                    return [str(x).strip() for x in arr if str(x).strip()]
                except Exception:
                    pass
            return [p.strip() for p in s.split(",") if p.strip()]
        return v  # type: ignore

    class Config:
        extra = "ignore"

settings = Settings()
