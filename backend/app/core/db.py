
"""Conexão e inicialização do banco de dados SQLite (overlay)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

DATABASE_URL = f"sqlite:///{settings.SQLITE_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def init_db():
    """Cria as tabelas se não existirem (telemetry_raw + telemetry)."""
    from app.models.telemetry import Telemetry, TelemetryRaw
    Base.metadata.create_all(bind=engine)
