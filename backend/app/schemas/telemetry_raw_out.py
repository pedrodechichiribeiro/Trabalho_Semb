
# --- ADDITION: Raw output schema ---
from pydantic import BaseModel
from typing import Optional, Dict, Any

class TelemetryRawOut(BaseModel):
    received_at: int
    src: Optional[str] = None
    raw: Dict[str, Any]
