from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


# Project root
BASE_DIR = Path(__file__).resolve().parents[2]

# Database directory
DB_DIR = BASE_DIR / "data" / "database"
DB_DIR.mkdir(parents=True, exist_ok=True)

# SQLite database file
DATABASE_PATH = DB_DIR / "nta.db"

DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for database models
Base = declarative_base()


def get_db():
    """
    Provide a database session.
    """

    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()