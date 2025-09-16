
from fastapi import APIRouter, Depends, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from app.api.deps import get_db
from app.schemas.telemetry import TelemetryOut, TelemetryIn
from app.crud.telemetry import create_from_payload, get_latest, list_range

router = APIRouter(tags=["telemetry"])

@router.get(
    "/latest",
    response_model=Optional[TelemetryOut],
    summary="Último registro de telemetria",
    response_description="Registro mais recente com datas e derivados.",
)
def latest(db: Session = Depends(get_db)):
    return get_latest(db)

@router.get(
    "/list",
    response_model=List[TelemetryOut],
    summary="Listar telemetrias",
    response_description="Lista ordenada por ts (desc).",
)
def list_items(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_ts: Optional[int] = Query(None, description="Filtra por ts (>=) em epoch ms"),
    end_ts: Optional[int] = Query(None, description="Filtra por ts (<=) em epoch ms"),
    db: Session = Depends(get_db),
):
    return list_range(db, limit=limit, offset=offset, start_ts=start_ts, end_ts=end_ts)

@router.post(
    "/ingest",
    response_model=TelemetryOut,
    summary="Ingerir telemetria (HTTP)",
    response_description="Registro recém-criado com datas e derivados.",
)
def ingest(payload: TelemetryIn = Body(...), db: Session = Depends(get_db)):
    return create_from_payload(db, payload)
