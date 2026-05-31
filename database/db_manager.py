import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Locate the database directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "gstnet.db")

# Create SQLAlchemy engine
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

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
    """Initializes tables in the SQLite database."""
    # Import models here to ensure they are registered with Base.metadata
    import database.models  # noqa: F401 — registers User, Patient, Prediction
    Base.metadata.create_all(bind=engine)
