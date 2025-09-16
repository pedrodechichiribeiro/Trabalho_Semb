
from __future__ import annotations
import json
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.telemetry import TelemetryRaw

def get_latest_raw(db: Session) -> Optional[Dict[str, Any]]:
    row = db.query(TelemetryRaw).order_by(TelemetryRaw.received_at.desc()).first()
    if not row:
        return None
    try:
        return {
            "received_at": row.received_at,
            "src": row.src,
            "raw": json.loads(row.raw_json),
        }
    except Exception:
        return None

def list_raw_range(
    db: Session,
    limit: int = 100,
    offset: int = 0,
    start_received_at: Optional[int] = None,
    end_received_at: Optional[int] = None,
) -> List[Dict[str, Any]]:
    q = db.query(TelemetryRaw)
    if start_received_at is not None:
        q = q.filter(TelemetryRaw.received_at >= int(start_received_at))
    if end_received_at is not None:
        q = q.filter(TelemetryRaw.received_at <= int(end_received_at))
    rows = q.order_by(TelemetryRaw.received_at.desc()).offset(offset).limit(limit).all()
    out = []
    for r in rows:
        try:
            out.append({
                "received_at": r.received_at,
                "src": r.src,
                "raw": json.loads(r.raw_json),
            })
        except Exception:
            continue
    return out
