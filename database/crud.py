import hashlib
import secrets
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.models import Patient, Prediction, User


# ─────────────────────────── Password helpers ────────────────────────────────

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{hashed}"


def verify_password(plain: str, stored_hash: str) -> bool:
    try:
        salt, hashed = stored_hash.split(":", 1)
        return hashlib.sha256((salt + plain).encode()).hexdigest() == hashed
    except Exception:
        return False


# ─────────────────────────── Report ID Generator ─────────────────────────────

def generate_report_id(db: Session) -> str:
    """
    Generates a unique Report ID in format GST-YYYYMMDD-XXXX.
    Finds the highest sequence number used today and increments it.
    """
    today_prefix = datetime.utcnow().strftime("GST-%Y%m%d-")
    # Count all reports with today's prefix to derive next sequence
    existing = db.query(Prediction).filter(
        Prediction.report_id.like(f"{today_prefix}%")
    ).all()
    seq = len(existing) + 1
    candidate = f"{today_prefix}{seq:04d}"
    # Ensure uniqueness (handles rare race conditions)
    while db.query(Prediction).filter(Prediction.report_id == candidate).first():
        seq += 1
        candidate = f"{today_prefix}{seq:04d}"
    return candidate


# ─────────────────────────── User CRUD ───────────────────────────────────────

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, username: str, email: str, password: str,
                role: str = "patient", patient_id: int = None):
    if get_user_by_username(db, username):
        raise ValueError(f"Username '{username}' is already taken.")
    if get_user_by_email(db, email):
        raise ValueError(f"Email '{email}' is already registered.")

    db_user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
        patient_id=patient_id,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


# ─────────────────────────── Patient CRUD ────────────────────────────────────

def get_patient_by_id(db: Session, patient_id: int):
    return db.query(Patient).filter(Patient.patient_id == patient_id).first()


def get_patient_by_details(db: Session, name: str, age: int, gender: str):
    return db.query(Patient).filter(
        Patient.patient_name == name,
        Patient.age == age,
        Patient.gender == gender
    ).first()


def create_patient(db: Session, name: str, age: int, gender: str, date_of_birth: str = None, password: str = None):
    """Creates or retrieves an existing patient record."""
    existing = get_patient_by_details(db, name, age, gender)
    if existing:
        # Update DOB if missing
        if date_of_birth and not existing.date_of_birth:
            existing.date_of_birth = date_of_birth
        if password:
            existing.password_hash = hash_password(password)
        db.commit()
        db.refresh(existing)
        return existing

    db_patient = Patient(
        patient_name=name,
        age=age,
        gender=gender,
        date_of_birth=date_of_birth,
        password_hash=hash_password(password) if password else None,
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


def get_all_patients(db: Session, search_query: str = None,
                     gender_filter: str = None, sort_by: str = "created_at",
                     sort_order: str = "desc"):
    query = db.query(Patient)
    if search_query:
        query = query.filter(Patient.patient_name.ilike(f"%{search_query}%"))
    if gender_filter:
        query = query.filter(Patient.gender == gender_filter)

    sort_column = getattr(Patient, sort_by, Patient.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.all()


def delete_patient(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return None
    predictions = list(patient.predictions)
    db.delete(patient)
    db.commit()
    return predictions


# ─────────────────────────── Prediction CRUD ─────────────────────────────────

def create_prediction(db: Session, patient_id: int, image_path: str,
                      prediction: str, confidence: float,
                      heatmap_path: str = None, report_path: str = None,
                      report_id: str = None):
    db_prediction = Prediction(
        patient_id=patient_id,
        image_path=image_path,
        heatmap_path=heatmap_path,
        prediction=prediction,
        confidence=confidence,
        report_path=report_path,
        report_id=report_id,
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    return db_prediction


def get_prediction_by_id(db: Session, prediction_id: int):
    return db.query(Prediction).filter(Prediction.prediction_id == prediction_id).first()


def get_prediction_by_report_id(db: Session, report_id: str):
    """Fetches a prediction by its unique Report ID."""
    return db.query(Prediction).filter(Prediction.report_id == report_id).first()


def get_prediction_by_report_id_and_dob(db: Session, report_id: str, date_of_birth: str):
    """
    Secure lookup: returns prediction only if both report_id AND patient DOB match.
    This prevents patients from accessing other patients' reports.
    """
    prediction = db.query(Prediction).filter(
        Prediction.report_id == report_id
    ).first()

    if not prediction:
        return None

    # Verify patient's date of birth matches
    patient = prediction.patient
    if not patient or patient.date_of_birth != date_of_birth:
        return None

    return prediction


def get_all_predictions(db: Session, search_query: str = None,
                        prediction_filter: str = None, gender_filter: str = None,
                        sort_by: str = "timestamp", sort_order: str = "desc",
                        patient_id: int = None):
    query = db.query(Prediction).join(Patient)

    if patient_id is not None:
        query = query.filter(Prediction.patient_id == patient_id)

    if search_query:
        query = query.filter(Patient.patient_name.ilike(f"%{search_query}%"))

    if prediction_filter:
        query = query.filter(Prediction.prediction == prediction_filter)
    if gender_filter:
        query = query.filter(Patient.gender == gender_filter)

    sort_column = getattr(Prediction, sort_by, Prediction.timestamp)
    if sort_by == "patient_name":
        sort_column = Patient.patient_name

    if sort_order.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    return query.all()


def get_dashboard_stats(db: Session):
    total_scans = db.query(Prediction).count()
    gallstone_cases = db.query(Prediction).filter(Prediction.prediction == "Gallstone").count()
    normal_cases = db.query(Prediction).filter(Prediction.prediction == "Normal").count()
    recent_predictions = db.query(Prediction).order_by(Prediction.timestamp.desc()).limit(5).all()

    return {
        "total_scans": total_scans,
        "gallstone_cases": gallstone_cases,
        "normal_cases": normal_cases,
        "recent_predictions": [p.to_dict() for p in recent_predictions]
    }


def get_prediction_by_report_id_dob_and_password(db: Session, report_id: str, date_of_birth: str, password: str):
    """
    Secure lookup: returns prediction only if report_id, patient DOB, AND password match.
    """
    prediction = db.query(Prediction).filter(
        Prediction.report_id == report_id
    ).first()

    if not prediction:
        return None

    patient = prediction.patient
    if not patient:
        return None

    if patient.date_of_birth != date_of_birth:
        return None

    if not patient.password_hash or not verify_password(password, patient.password_hash):
        return None

    return prediction


def verify_patient_for_forgot_password(db: Session, report_id: str, patient_name: str, date_of_birth: str):
    """
    Verifies if a patient exists matching report_id, patient_name, and date_of_birth.
    """
    prediction = db.query(Prediction).filter(
        Prediction.report_id == report_id
    ).first()

    if not prediction:
        return None

    patient = prediction.patient
    if not patient:
        return None

    if patient.patient_name.strip().lower() != patient_name.strip().lower():
        return None

    if patient.date_of_birth != date_of_birth:
        return None

    return patient


def reset_patient_password(db: Session, patient_id: int, new_password: str):
    """
    Securely resets a patient's password hash in the database.
    """
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return False

    patient.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(patient)
    return True


def prune_old_records(db: Session):
    """
    Deletes prediction logs, compiled PDF reports, and raw uploads
    that are older than 3 days (72 hours).
    Also removes the patient profile if they have no remaining predictions.
    """
    import os
    from datetime import datetime, timedelta
    
    # 3 days ago limit
    limit = datetime.utcnow() - timedelta(days=3)
    
    # 1. Find all old predictions
    old_preds = db.query(Prediction).filter(Prediction.timestamp < limit).all()
    if not old_preds:
        return
        
    print(f"[CLEANUP LOG] Found {len(old_preds)} prediction records older than 3 days. Pruning...")
    
    # Track patient IDs to check for remaining predictions later
    patient_ids_to_check = set()
    
    for pred in old_preds:
        patient_ids_to_check.add(pred.patient_id)
        
        # Clean up physical files if they exist (local fallback or Supabase Cloud)
        from backend.supabase_storage import delete_from_supabase
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for path_attr in [pred.image_path, pred.heatmap_path, pred.report_path]:
            if path_attr:
                if path_attr.startswith("http://") or path_attr.startswith("https://"):
                    # Clean up from Supabase Storage
                    delete_from_supabase(path_attr)
                else:
                    # Clean up local filesystem (local fallback)
                    rel_path = path_attr.lstrip('/')
                    abs_path = os.path.join(base_dir, rel_path)
                    try:
                        if os.path.exists(abs_path) and os.path.isfile(abs_path):
                            os.remove(abs_path)
                            print(f"[CLEANUP LOG] Deleted physical file: {abs_path}")
                    except Exception as file_err:
                        print(f"[CLEANUP LOG] Failed to delete file {abs_path}: {file_err}")
                    
        # Delete prediction record from DB
        db.delete(pred)
        
    db.commit()
    
    # 2. Check and clean up orphaned patients who have zero remaining predictions
    for p_id in patient_ids_to_check:
        remaining = db.query(Prediction).filter(Prediction.patient_id == p_id).count()
        if remaining == 0:
            patient = db.query(Patient).filter(Patient.patient_id == p_id).first()
            if patient:
                print(f"[CLEANUP LOG] Pruning orphaned patient profile ID={p_id}, Name='{patient.patient_name}'")
                if patient.user_account:
                    db.delete(patient.user_account)
                db.delete(patient)
                
    db.commit()
