import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Resolve database URL from environment variable
# If DATABASE_URL is not set, fallback to local SQLite
DATABASE_URL = os.environ.get("DATABASE_URL")

connect_args = {}

if not DATABASE_URL:
    # Local SQLite fallback
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_PATH = os.path.join(BASE_DIR, "gstnet.db")
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
    connect_args = {"check_same_thread": False}
else:
    # Clean and parse production connection string
    DATABASE_URL = DATABASE_URL.strip()
    # Replace postgresql:// with postgresql+psycopg2:// for SQLAlchemy compatibility
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

print(f"[DATABASE LOG] Connecting to database using dialect: {DATABASE_URL.split(':', 1)[0]}")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Create declarative base for model mapping
Base = declarative_base()

# Configure session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency helper to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables in the database (SQLite or PostgreSQL)."""
    # Import models here to ensure they are registered with Base.metadata
    import database.models  # noqa: F401 — registers User, Patient, Prediction
    Base.metadata.create_all(bind=engine)
