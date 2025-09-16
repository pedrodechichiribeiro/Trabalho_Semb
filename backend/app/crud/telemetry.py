
"""CRUD de telemetria: salva bruto + processado, deriva campos e gera datas (formato de tempo ajustado)."""
from __future__ import annotations
from sqlalchemy.orm import Session
from typing import Optional, List, Tuple, Any, Dict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import json

from app.models.telemetry import Telemetry, TelemetryRaw
from app.schemas.telemetry import TelemetryIn
from app.core.config import settings

try:
    _TZ = ZoneInfo(settings.API_TZ)
except Exception:
    _TZ = timezone.utc

# --- helpers de formatação de tempo ---
def _fmt_offset_with_colon(dt: datetime) -> str:
    # %z -> "-0300"; precisamos "-03:00"
    off = dt.strftime("%z")
    if len(off) == 5 and (off[0] == "+" or off[0] == "-"):
        return f"{off[:3]}:{off[3:]}"
    return off

def _iso_fields(ts_ms: int) -> Tuple[str, str]:
    """Retorna (ts_iso_utc, ts_local) no formato:
    - ts_iso:  YYYY-MM-DDTHH:MM:SS.mmmZ
    - ts_local:YYYY-MM-DD HH:MM:SS.mmm±HH:MM
    """
    dt_utc = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc)
    dt_loc = dt_utc.astimezone(_TZ)

    ms_utc = int(dt_utc.microsecond / 1000)
    ms_loc = int(dt_loc.microsecond / 1000)

    ts_iso = dt_utc.strftime("%Y-%m-%dT%H:%M:%S") + f".{ms_utc:03d}Z"
    ts_local = dt_loc.strftime("%Y-%m-%d %H:%M:%S") + f".{ms_loc:03d}" + _fmt_offset_with_colon(dt_loc)
    return ts_iso, ts_local

def _clamp(v: Optional[float], lo: float, hi: float) -> Optional[float]:
    if v is None:
        return None
    try:
        vf = float(v)
    except Exception:
        return None
    return max(lo, min(hi, vf))

def _derive(payload: TelemetryIn, ts_ms: int) -> Dict[str, Any]:
    # Base: clonar estrutura de entrada
    data: Dict[str, Any] = {
        "ts": ts_ms,
        "ts_iso": "",
        "ts_local": "",
        "src": payload.src,
        "car": json.loads(payload.car.model_dump_json()),
        "centric": json.loads(payload.centric.model_dump_json()),
    }

    # Normalizações e clamps leves
    car = data.get("car") or {}
    centric = data.get("centric") or {}
    controls = (centric.get("controls") or {})

    # Volante (steering_deg)
    cd = int(controls.get("curve_direction", 0))
    if cd == 0 or cd == 180:
        steering_deg = 0.0
    elif cd < 180:
        steering_deg = float(cd)
    else:
        steering_deg = float(-(360 - cd))

    steering_side = "straight"
    if steering_deg > 0:
        steering_side = "right"
    elif steering_deg < 0:
        steering_side = "left"

    # Velocidade de comando
    speed_cmd_byte = int(_clamp(controls.get("speed", 0), 0, 255) or 0)
    speed_cmd_pct = speed_cmd_byte / 255.0
    vmax = float(getattr(settings, "VMAX_MPS", 12.0) or 12.0)
    speed_cmd_mps = speed_cmd_pct * vmax
    movement_dir = int(_clamp(controls.get("movement_direction", 1), 0, 1) or 1)
    movement_direction_text = "front" if movement_dir == 1 else "back"

    # Injeta derivados
    controls["derived"] = {
        "steering_deg": steering_deg,
        "steering_side": steering_side,
        "speed_cmd_byte": speed_cmd_byte,
        "speed_cmd_pct": round(speed_cmd_pct, 6),
        "speed_cmd_mps": round(speed_cmd_mps, 6),
        "movement_direction_text": movement_direction_text,
    }
    centric["controls"] = controls
    data["centric"] = centric
    return data

def _now_ms() -> int:
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)

def create_from_payload(db: Session, payload: TelemetryIn):
    """Salva bruto + processado, retornando o documento processado."""
    ts_recv_ms = _now_ms()

    # 1) Salvar bruto
    raw_dict = json.loads(payload.model_dump_json())
    t_raw = TelemetryRaw(
        received_at=ts_recv_ms,
        src=payload.src,
        raw_json=json.dumps(raw_dict, separators=(",", ":")),
    )
    db.add(t_raw)
    db.flush()

    # 2) Processar + datas
    proc = _derive(payload, ts_recv_ms)
    iso_utc, iso_loc = _iso_fields(ts_recv_ms)
    proc["ts_iso"] = iso_utc
    proc["ts_local"] = iso_loc

    # 3) Projeção p/ colunas indexadas
    car = proc.get("car") or {}
    drive = (car.get("drive") or {})
    gps = (car.get("gps") or {})
    centric = proc.get("centric") or {}
    controls = (centric.get("controls") or {})
    derived = (controls.get("derived") or {})

    t = Telemetry(
        ts=proc["ts"],
        ts_iso=proc["ts_iso"],
        ts_local=proc["ts_local"],
        src=proc.get("src"),
        updated_at=ts_recv_ms,  # mantém compatível com /latest por updated_at
        lat=gps.get("latitude"),
        lon=gps.get("longitude"),
        speed_est_mps=drive.get("speed_est_mps"),
        pwm=drive.get("pwm"),
        steering_deg=derived.get("steering_deg"),
        speed_cmd_pct=derived.get("speed_cmd_pct"),
        speed_cmd_mps=derived.get("speed_cmd_mps"),
        movement_dir=1 if derived.get("movement_direction_text") == "front" else 0,
        doc_json=json.dumps(proc, ensure_ascii=False, separators=(",", ":")),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return proc

def touch_updated_at(db: Session, row_id: int):
    now = _now_ms()
    db.query(Telemetry).filter(Telemetry.id == row_id).update({"updated_at": now})
    db.commit()

def get_latest(db: Session):
    row = db.query(Telemetry).order_by(Telemetry.updated_at.desc()).first()
    if not row:
        return None
    try:
        return json.loads(row.doc_json)
    except Exception:
        return None

def list_range(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    start_ts: Optional[int] = None,
    end_ts: Optional[int] = None,
    order_by: str = "updated_at",  # "updated_at" ou "ts"
):
    q = db.query(Telemetry)
    if start_ts is not None:
        q = q.filter(Telemetry.ts >= int(start_ts))
    if end_ts is not None:
        q = q.filter(Telemetry.ts <= int(end_ts))

    if order_by == "ts":
        q = q.order_by(Telemetry.ts.desc())
    else:
        q = q.order_by(Telemetry.updated_at.desc())

    rows = q.offset(offset).limit(limit).all()
    out = []
    for r in rows:
        try:
            out.append(json.loads(r.doc_json))
        except Exception:
            continue
    return out