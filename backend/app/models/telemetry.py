
"""Modelos ORM (SQLAlchemy 2.x) para telemetria (bruta e processada)."""
from sqlalchemy import Column, Integer, Float, BigInteger, String, Text
from app.core.db import Base

class TelemetryRaw(Base):
    __tablename__ = "telemetry_raw"
    id = Column(Integer, primary_key=True, index=True)
    received_at = Column(BigInteger, index=True)
    src = Column(String(32), nullable=True)
    raw_json = Column(Text, nullable=False)

class Telemetry(Base):
    __tablename__ = "telemetry"
    id = Column(Integer, primary_key=True, index=True)
    ts = Column(BigInteger, index=True)
    ts_iso = Column(String, nullable=True)
    ts_local = Column(String, nullable=True)
    src = Column(String(32), nullable=True)

    updated_at = Column(BigInteger, index=True)

    # índices úteis do doc
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    speed_est_mps = Column(Float, nullable=True)
    pwm = Column(Integer, nullable=True)
    steering_deg = Column(Float, nullable=True)
    speed_cmd_pct = Column(Float, nullable=True)
    speed_cmd_mps = Column(Float, nullable=True)
    movement_dir = Column(Integer, nullable=True)

    doc_json = Column(Text, nullable=False)
