
from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.telemetry_raw_out import TelemetryRawOut
from app.crud.telemetry_raw import get_latest_raw, list_raw_range

router = APIRouter(prefix="/api/v1/telemetry/raw", tags=["telemetry-raw"])

@router.get("/latest", response_model=Optional[TelemetryRawOut], summary="Último registro bruto")
def latest_raw(db: Session = Depends(get_db)):
    return get_latest_raw(db)

@router.get("/list", response_model=List[TelemetryRawOut], summary="Listar registros brutos")
def list_raw(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    start_received_at: Optional[int] = Query(None, description="Filtro >= em epoch ms"),
    end_received_at: Optional[int] = Query(None, description="Filtro <= em epoch ms"),
    db: Session = Depends(get_db),
):
    return list_raw_range(db, limit=limit, offset=offset, start_received_at=start_received_at, end_received_at=end_received_at)
