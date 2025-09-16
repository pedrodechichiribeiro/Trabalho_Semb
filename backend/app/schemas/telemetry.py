
"""Esquemas Pydantic para validação/serialização de telemetria (versão única)."""
from pydantic import BaseModel, Field, conint, confloat
from typing import Optional

# ---------- Blocos "car" ----------
class CarGPS(BaseModel):
    latitude: confloat(strict=True) = Field(..., description="Latitude WGS-84")
    longitude: confloat(strict=True) = Field(..., description="Longitude WGS-84")

class CarIMU(BaseModel):
    accelerationX: conint(ge=-128, le=127) | int
    accelerationY: conint(ge=-128, le=127) | int
    accelerationZ: conint(ge=-128, le=127) | int
    spinX: conint(ge=-128, le=127) | int
    spinY: conint(ge=-128, le=127) | int
    spinZ: conint(ge=-128, le=127) | int
    scale_dps: conint(strict=True) = Field(..., description="Faixa do giroscópio (°/s): 250, 500, 1000, 2000")

class CarDrive(BaseModel):
    pwm: Optional[conint(ge=0, le=255)] = None
    speed_est_mps: Optional[confloat()] = None  # m/s

class CarBlock(BaseModel):
    gps: Optional[CarGPS] = None
    imu: Optional[CarIMU] = None
    drive: Optional[CarDrive] = None

# ---------- Derivados ----------
class ControlsDerived(BaseModel):
    steering_deg: float
    steering_side: str
    speed_cmd_byte: int
    speed_cmd_pct: float
    speed_cmd_mps: float
    movement_direction_text: str

# ---------- Blocos "centric" ----------
class CentricControls(BaseModel):
    curve_direction: conint(ge=0, le=360)
    speed: conint(ge=0, le=255)
    movement_direction: conint(ge=0, le=1)  # 1=front, 0=back
    derived: Optional[ControlsDerived] = None  # <-- IMPORTANTE para aparecer na resposta

class CentricBlock(BaseModel):
    controls: CentricControls

# ---------- Payload bruto ----------
class TelemetryIn(BaseModel):
    car: CarBlock
    centric: CentricBlock
    src: Optional[str] = Field(default="central")

# ---------- Registro processado ----------
class TelemetryOut(BaseModel):
    ts: int
    ts_iso: str
    ts_local: str
    src: Optional[str]

    car: CarBlock
    centric: CentricBlock