"""
GSTNet Database Migration Tool: SQLite to Supabase PostgreSQL

This script copies all existing records from the local SQLite database
(database/gstnet.db) to a target remote PostgreSQL database.

Usage:
  $env:DATABASE_URL="postgresql://username:password@host:port/database"
  .\venv\Scripts\python database/migrate_to_postgres.py
"""

import os
import sys

# Ensure project root is in PYTHONPATH
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

# Local SQLite Engine
sqlite_db_path = os.path.join(BASE_DIR, "database", "gstnet.db")
if not os.path.exists(sqlite_db_path):
    print(f"[-] Local SQLite database not found at {sqlite_db_path}. Nothing to migrate.")
    sys.exit(0)

print(f"[+] Found local SQLite database at {sqlite_db_path}")
sqlite_engine = create_engine(f"sqlite:///{sqlite_db_path}")
SqliteSession = sessionmaker(bind=sqlite_engine)

# Remote PostgreSQL Engine
postgres_url = os.environ.get("DATABASE_URL")
if not postgres_url:
    print("[-] DATABASE_URL environment variable is not defined.")
    print("[-] Please set your Supabase connection string and try again.")
    sys.exit(1)

postgres_url = postgres_url.strip()
if postgres_url.startswith("postgresql://"):
    postgres_url = postgres_url.replace("postgresql://", "postgresql+psycopg2://", 1)

print(f"[+] Connecting to Supabase PostgreSQL database...")
try:
    postgres_engine = create_engine(postgres_url)
    PostgresSession = sessionmaker(bind=postgres_engine)
    # Test connection
    with postgres_engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("[+] Successfully connected to PostgreSQL server.")
except Exception as e:
    print(f"[-] Connection to PostgreSQL failed: {e}")
    sys.exit(1)

# Import models to ensure they are registered with Base
from database.db_manager import Base, init_db
from database.models import User, Patient, Prediction

print("[+] Initializing tables on PostgreSQL if they do not exist...")
try:
    Base.metadata.create_all(bind=postgres_engine)
    print("[+] Table schema verified/initialized successfully.")
except Exception as e:
    print(f"[-] Failed to initialize database schema: {e}")
    sys.exit(1)

# Establish Sessions
sq_session = SqliteSession()
pg_session = PostgresSession()

try:
    print("\n--- 1. Migrating Patients ---")
    sqlite_patients = sq_session.query(Patient).all()
    print(f"[+] Found {len(sqlite_patients)} patient(s) in SQLite.")
    
    migrated_patients = 0
    for p in sqlite_patients:
        # Check if already exists in target postgres
        exists = pg_session.query(Patient).filter(Patient.patient_id == p.patient_id).first()
        if not exists:
            pg_patient = Patient(
                patient_id=p.patient_id,
                patient_name=p.patient_name,
                gender=p.gender,
                date_of_birth=p.date_of_birth,
                age=p.age,
                password_hash=p.password_hash,
                created_at=p.created_at
            )
            pg_session.add(pg_patient)
            migrated_patients += 1
            
    pg_session.commit()
    print(f"[+] Migrated {migrated_patients} patient record(s) successfully.")

    print("\n--- 2. Migrating Users (Clinicians / Admins) ---")
    sqlite_users = sq_session.query(User).all()
    print(f"[+] Found {len(sqlite_users)} user(s) in SQLite.")
    
    migrated_users = 0
    for u in sqlite_users:
        exists = pg_session.query(User).filter(User.user_id == u.user_id).first()
        if not exists:
            pg_user = User(
                user_id=u.user_id,
                username=u.username,
                email=u.email,
                password_hash=u.password_hash,
                role=u.role,
                patient_id=u.patient_id,
                created_at=u.created_at
            )
            pg_session.add(pg_user)
            migrated_users += 1
            
    pg_session.commit()
    print(f"[+] Migrated {migrated_users} user record(s) successfully.")

    print("\n--- 3. Migrating Predictions (Caseload Logs) ---")
    sqlite_preds = sq_session.query(Prediction).all()
    print(f"[+] Found {len(sqlite_preds)} prediction(s) in SQLite.")
    
    migrated_preds = 0
    for pr in sqlite_preds:
        exists = pg_session.query(Prediction).filter(Prediction.prediction_id == pr.prediction_id).first()
        if not exists:
            pg_pred = Prediction(
                prediction_id=pr.prediction_id,
                patient_id=pr.patient_id,
                report_id=pr.report_id,
                image_path=pr.image_path,
                heatmap_path=pr.heatmap_path,
                prediction=pr.prediction,
                confidence=pr.confidence,
                report_path=pr.report_path,
                timestamp=pr.timestamp
            )
            pg_session.add(pg_pred)
            migrated_preds += 1
            
    pg_session.commit()
    print(f"[+] Migrated {migrated_preds} prediction record(s) successfully.")

    print("\n--- 4. Synchronizing PostgreSQL Primary Key Sequences ---")
    # This prevents duplicate key conflicts on subsequent inserts
    with postgres_engine.connect() as conn:
        tables_to_sync = [
            ("patients", "patient_id"),
            ("users", "user_id"),
            ("predictions", "prediction_id")
        ]
        for tbl, pk in tables_to_sync:
            try:
                # Advancing sequences dynamically
                sync_query = text(f"SELECT setval(pg_get_serial_sequence('{tbl}', '{pk}'), COALESCE(max({pk}), 1)) FROM {tbl};")
                conn.execute(sync_query)
                conn.commit()
                print(f"[+] Reset and synchronized primary sequence for table '{tbl}'.")
            except Exception as seq_err:
                print(f"[-] Sequence reset warning for table '{tbl}': {seq_err}")

    print("\n[+] Database migration completed successfully!")

except Exception as err:
    pg_session.rollback()
    print(f"\n[-] Critical error occurred during migration: {err}")
    sys.exit(1)
finally:
    sq_session.close()
    pg_session.close()
