import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from database.db_manager import SessionLocal
from database import crud
from model.predict import predict_ultrasound, generate_gradcam
from backend.report_generator import generate_pdf_report
from backend.supabase_storage import upload_to_supabase

api_bp = Blueprint("api", __name__)

ADMIN_SECRET_CODE = "GSTNET-ADMIN-2026"


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']


# ═══════════════════════════ AUTH ROUTES ══════════════════════════════════════

@api_bp.route("/login", methods=["POST"])
def login():
    """Unified login: legacy admin fallback + DB-backed patient/admin auth."""
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    print(f"[AUTH LOG] Login attempt for username='{username}'")

    # Legacy admin fallback
    if username == "admin" and password == "admin123":
        print("[AUTH LOG] Legacy admin fallback login approved.")
        return jsonify({
            "success": True,
            "token": "gstnet-jwt-token-admin-2026",
            "user": {"username": "admin", "role": "admin", "patient_id": None}
        }), 200

    db = SessionLocal()
    try:
        user = crud.authenticate_user(db, username, password)
        if not user:
            print(f"[AUTH LOG] DB login failed: Invalid credentials for username='{username}'")
            return jsonify({"success": False, "message": "Invalid username or password."}), 401
        
        print(f"[AUTH LOG] DB login successful: username='{user.username}', role='{user.role}'")
        return jsonify({
            "success": True,
            "token": f"gstnet-jwt-{user.role}-{user.user_id}-2026",
            "user": {
                "username": user.username,
                "role": user.role,
                "patient_id": user.patient_id,
                "email": user.email,
            }
        }), 200
    finally:
        db.close()


@api_bp.route("/register", methods=["POST"])
def register():
    """Register a new patient or admin account."""
    data = request.json or {}
    username = data.get("username", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    confirm  = data.get("confirm_password", "").strip()
    role     = data.get("role", "patient").lower()

    print(f"[AUTH LOG] Registration request received: username='{username}', email='{email}', role='{role}'")

    if not username or not email or not password:
        print("[AUTH LOG] Registration rejected: Missing required inputs.")
        return jsonify({"success": False, "message": "Username, email and password are required."}), 400
    if len(username) < 3:
        return jsonify({"success": False, "message": "Username must be at least 3 characters."}), 400
    if len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400
    if password != confirm:
        return jsonify({"success": False, "message": "Passwords do not match."}), 400
    if "@" not in email:
        return jsonify({"success": False, "message": "Please provide a valid email address."}), 400
    if role not in ("admin", "patient"):
        return jsonify({"success": False, "message": "Role must be 'admin' or 'patient'."}), 400

    if role == "admin":
        admin_code = data.get("admin_code", "").strip()
        if admin_code != ADMIN_SECRET_CODE:
            print(f"[AUTH LOG] Admin registration rejected: Invalid admin setup code '{admin_code}'")
            return jsonify({"success": False, "message": "Invalid admin registration code."}), 403

    db = SessionLocal()
    try:
        patient_id = None
        if role == "patient":
            name  = data.get("patient_name", "").strip()
            age_s = data.get("age", "").strip()
            gender = data.get("gender", "").strip()
            dob    = data.get("date_of_birth", "").strip()

            if not name or not age_s or not gender:
                return jsonify({"success": False,
                                "message": "Patient name, age and gender are required."}), 400
            try:
                age = int(age_s)
            except ValueError:
                return jsonify({"success": False, "message": "Age must be a number."}), 400

            db_patient = crud.create_patient(db, name, age, gender, date_of_birth=dob or None)
            patient_id = db_patient.patient_id

        user = crud.create_user(db, username=username, email=email,
                                password=password, role=role, patient_id=patient_id)
        print(f"[AUTH LOG] User created successfully: ID={user.user_id}, username='{user.username}'")
        return jsonify({
            "success": True,
            "message": f"{'Patient' if role == 'patient' else 'Admin'} account created successfully.",
            "user": user.to_dict()
        }), 201

    except ValueError as e:
        print(f"[AUTH LOG] Registration value conflict: {e}")
        return jsonify({"success": False, "message": str(e)}), 409
    except Exception as e:
        db.rollback()
        import traceback
        print(f"[AUTH LOG] CRITICAL Registration error: {e}")
        print(traceback.format_exc())
        return jsonify({"success": False, "message": f"Registration failed: {str(e)}"}), 500
    finally:
        db.close()


# ═══════════════════════════ UPLOAD ROUTE ═════════════════════════════════════

@api_bp.route("/upload", methods=["POST"])
def upload_file():
    if 'image' not in request.files:
        return jsonify({"success": False, "message": "No image file provided."}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({"success": False, "message": "No file selected."}), 400
    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        save_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_name)
        file.save(save_path)
        return jsonify({"success": True, "filename": unique_name,
                        "file_url": f"/uploads/{unique_name}",
                        "absolute_path": save_path}), 200
    return jsonify({"success": False, "message": "File format not supported."}), 400


# ═══════════════════════════ REPORT ID ROUTE ══════════════════════════════════

@api_bp.route("/generate-report-id", methods=["POST"])
def generate_report_id_route():
    """Generate the next unique GST-YYYYMMDD-XXXX Report ID."""
    db = SessionLocal()
    try:
        report_id = crud.generate_report_id(db)
        return jsonify({"success": True, "report_id": report_id}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


# ═══════════════════════════ PREDICT ROUTE ════════════════════════════════════

@api_bp.route("/predict", methods=["POST"])
def run_prediction():
    """
    Full diagnostic pipeline:
    1. Patient registration  2. Image save  3. GSTNet inference
    4. Grad-CAM heatmap      5. DB record   6. PDF with Report ID
    """
    name    = request.form.get("patient_name", "").strip()
    age_str = request.form.get("age", "").strip()
    gender  = request.form.get("gender", "").strip()
    dob     = request.form.get("date_of_birth", "").strip() or None
    password = request.form.get("password", "").strip()
    confirm  = request.form.get("confirm_password", "").strip()

    print(f"[PREDICT LOG] Demographics received: Name='{name}', Age='{age_str}', Gender='{gender}', DOB='{dob}', PwdLen={len(password)}")

    if not name or not age_str or not gender:
        print("[PREDICT LOG] Demographic validation failed: Missing fields.")
        return jsonify({"success": False, "message": "Missing patient demographics."}), 400
    try:
        age = int(age_str)
    except ValueError:
        print(f"[PREDICT LOG] Demographic validation failed: Invalid age '{age_str}'")
        return jsonify({"success": False, "message": "Age must be an integer."}), 400

    if not password:
        print("[PREDICT LOG] Demographic validation failed: Password empty.")
        return jsonify({"success": False, "message": "Password is required."}), 400
    if len(password) < 6:
        print(f"[PREDICT LOG] Demographic validation failed: Password '{password}' length < 6")
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400
    if password != confirm:
        print("[PREDICT LOG] Demographic validation failed: Passwords mismatch.")
        return jsonify({"success": False, "message": "Passwords do not match."}), 400

    if 'image' not in request.files:
        print("[PREDICT LOG] Scan file validation failed: 'image' not in request.files.")
        return jsonify({"success": False, "message": "Ultrasound scan file is required."}), 400
    file = request.files['image']
    if file.filename == '' or not allowed_file(file.filename):
        print(f"[PREDICT LOG] Scan file validation failed: Disallowed file name '{file.filename}'")
        return jsonify({"success": False, "message": "Invalid scan file."}), 400

    db = SessionLocal()
    try:
        # Run automatic retention pruning (records older than 3 days)
        crud.prune_old_records(db)
        
        # 1. Patient
        db_patient = crud.create_patient(db, name, age, gender, date_of_birth=dob, password=password)
        patient_id = db_patient.patient_id
        print(f"[PREDICT LOG] Patient processed. ID={patient_id}, Name='{db_patient.patient_name}', DOB='{db_patient.date_of_birth}'")

        # 2. Save image
        ext = file.filename.rsplit('.', 1)[1].lower()
        file_uuid = uuid.uuid4().hex
        orig_filename = f"{file_uuid}.{ext}"
        orig_abs = os.path.join(current_app.config['UPLOAD_FOLDER'], orig_filename)
        file.save(orig_abs)
        orig_url = f"/uploads/{orig_filename}"
        print(f"[PREDICT LOG] RAW scan saved at {orig_abs}")

        # 3. GSTNet inference
        from backend.app import gstnet_model, load_ai_model
        if gstnet_model is None:
            load_ai_model()
        print("[PREDICT LOG] Executing GSTNet deep model prediction...")
        prediction_label, confidence = predict_ultrasound(gstnet_model, orig_abs)
        print(f"[PREDICT LOG] Prediction completed: Verdict='{prediction_label}', Confidence={confidence}")

        # 4. Grad-CAM
        heatmap_filename = f"{file_uuid}_heatmap.{ext}"
        heatmap_abs = os.path.join(current_app.config['UPLOAD_FOLDER'], heatmap_filename)
        print("[PREDICT LOG] Generating Grad-CAM heatmaps...")
        generate_gradcam(gstnet_model, orig_abs, heatmap_abs)
        heatmap_url = f"/uploads/{heatmap_filename}"
        print(f"[PREDICT LOG] Heatmap saved at {heatmap_abs}")

        # 5. Generate Report ID
        report_id = crud.generate_report_id(db)
        print(f"[PREDICT LOG] Assumed Report ID: '{report_id}'")

        # 6. DB record (creates record to resolve prediction_id first)
        db_prediction = crud.create_prediction(
            db=db, patient_id=patient_id,
            image_path=orig_url, heatmap_path=heatmap_url,
            prediction=prediction_label, confidence=confidence,
            report_id=report_id,
        )
        prediction_id = db_prediction.prediction_id

        # 7. Compile PDF Report locally
        report_filename = f"report_{report_id}.pdf"
        report_abs = os.path.join(current_app.config['REPORTS_FOLDER'], report_filename)
        print("[PREDICT LOG] Compiling clinical PDF report...")
        generate_pdf_report(
            patient_name=name, patient_age=age, patient_gender=gender,
            prediction=prediction_label, confidence=confidence,
            image_path=orig_abs, heatmap_path=heatmap_abs,
            save_path=report_abs, patient_id=patient_id,
            prediction_id=prediction_id, report_id=report_id,
            date_of_birth=dob,
        )
        print(f"[PREDICT LOG] PDF Report compiled at {report_abs}")

        # 8. Upload clinical assets to Supabase Storage (deletes local files on upload success)
        supabase_image_url = upload_to_supabase("ultrasound-images", orig_abs, orig_filename)
        supabase_heatmap_url = upload_to_supabase("heatmaps", heatmap_abs, heatmap_filename)
        supabase_report_url = upload_to_supabase("reports", report_abs, report_filename)

        # 9. Update DB record with Supabase Cloud URLs
        db_prediction.image_path = supabase_image_url
        db_prediction.heatmap_path = supabase_heatmap_url
        db_prediction.report_path = supabase_report_url
        db.commit()
        db.refresh(db_prediction)

        print("[PREDICT LOG] Scan pipeline executed successfully. Returning data.")
        return jsonify({
            "success": True,
            "prediction": db_prediction.to_dict(),
            "patient": db_patient.to_dict()
        }), 200

    except Exception as e:
        db.rollback()
        import traceback
        print(f"[PREDICT LOG] CRITICAL EXCEPTION IN DIAGNOSTIC PIPELINE: {e}")
        print(traceback.format_exc())
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500
    finally:
        db.close()


# ═══════════════════════════ PATIENT REPORT ACCESS ════════════════════════════

@api_bp.route("/patient-report-access", methods=["POST"])
def patient_report_access():
    """
    Secure report lookup: Report ID + Date of Birth + Password must all match.
    """
    data = request.json or {}
    report_id   = data.get("report_id", "").strip().upper()
    date_of_birth = data.get("date_of_birth", "").strip()
    password    = data.get("password", "").strip()

    print(f"[REPORT ACCESS LOG] Access lookup query: Report ID='{report_id}', DOB='{date_of_birth}', PwdLen={len(password)}")

    if not report_id or not date_of_birth or not password:
        print("[REPORT ACCESS LOG] Denied: Missing required request fields.")
        return jsonify({"success": False,
                        "message": "Report ID, Date of Birth, and Password are required."}), 400

    db = SessionLocal()
    try:
        # Run automatic retention pruning (records older than 3 days)
        crud.prune_old_records(db)
        
        # Check prediction records
        pred = db.query(crud.Prediction).filter(crud.Prediction.report_id == report_id).first()
        if not pred:
            print(f"[REPORT ACCESS LOG] Denied: No record found matching Report ID '{report_id}'")
            return jsonify({"success": False, "message": "Invalid Report ID, Date of Birth, or Password."}), 401

        patient = pred.patient
        if not patient:
            print("[REPORT ACCESS LOG] Denied: No linked patient profile found.")
            return jsonify({"success": False, "message": "Invalid Report ID, Date of Birth, or Password."}), 401

        print(f"[REPORT ACCESS LOG] Found linked Patient profile ID={patient.patient_id}, Name='{patient.patient_name}', DOB='{patient.date_of_birth}'")

        if patient.date_of_birth != date_of_birth:
            print(f"[REPORT ACCESS LOG] Denied: Date of Birth mismatch. Provided '{date_of_birth}' vs DB '{patient.date_of_birth}'")
            return jsonify({"success": False, "message": "Invalid Report ID, Date of Birth, or Password."}), 401

        if not patient.password_hash or not crud.verify_password(password, patient.password_hash):
            print("[REPORT ACCESS LOG] Denied: Password hash mismatch.")
            return jsonify({"success": False, "message": "Invalid Report ID, Date of Birth, or Password."}), 401

        print("[REPORT ACCESS LOG] Approved: Authentication passed. Dispensing record details.")
        return jsonify({"success": True, "report": pred.to_dict()}), 200
    except Exception as e:
        print(f"[REPORT ACCESS LOG] CRITICAL EXCEPTION: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


@api_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """
    Verifies Report ID + Patient Name + Date of Birth.
    If valid, returns success and patient_id to allow password reset.
    """
    data = request.json or {}
    report_id = data.get("report_id", "").strip().upper()
    patient_name = data.get("patient_name", "").strip()
    date_of_birth = data.get("date_of_birth", "").strip()

    if not report_id or not patient_name or not date_of_birth:
        return jsonify({"success": False,
                        "message": "Report ID, Patient Name, and Date of Birth are required."}), 400

    db = SessionLocal()
    try:
        patient = crud.verify_patient_for_forgot_password(db, report_id, patient_name, date_of_birth)
        if not patient:
            return jsonify({
                "success": False,
                "message": "Invalid Report ID, Patient Name, or Date of Birth."
            }), 400

        return jsonify({
            "success": True,
            "message": "Verification successful.",
            "patient_id": patient.patient_id
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


@api_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """
    Securely resets a patient's password in the database.
    """
    data = request.json or {}
    patient_id = data.get("patient_id")
    password = data.get("password", "")
    confirm = data.get("confirm_password", "")

    if not patient_id or not password or not confirm:
        return jsonify({"success": False, "message": "All fields are required."}), 400

    if len(password) < 6:
        return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400

    if password != confirm:
        return jsonify({"success": False, "message": "Passwords do not match."}), 400

    db = SessionLocal()
    try:
        success = crud.reset_patient_password(db, int(patient_id), password)
        if not success:
            return jsonify({"success": False, "message": "Patient not found."}), 404

        return jsonify({
            "success": True,
            "message": "Password reset successful."
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


@api_bp.route("/report/<string:report_id>", methods=["GET"])
def get_report_by_id(report_id):
    """
    Fetches a report by ID (admin use — no DOB check).
    For public access, use POST /patient-report-access instead.
    """
    db = SessionLocal()
    try:
        prediction = crud.get_prediction_by_report_id(db, report_id.upper())
        if not prediction:
            return jsonify({"success": False, "message": "Report not found."}), 404
        return jsonify({"success": True, "report": prediction.to_dict()}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


# ═══════════════════════════ HISTORY ROUTE ════════════════════════════════════

@api_bp.route("/history", methods=["GET"])
def get_history():
    search     = request.args.get("search")
    prediction = request.args.get("prediction")
    gender     = request.args.get("gender")
    sort_by    = request.args.get("sortBy", "timestamp")
    sort_order = request.args.get("sortOrder", "desc")
    patient_id_filter = request.args.get("patient_id", type=int)

    db = SessionLocal()
    try:
        records = crud.get_all_predictions(
            db=db, search_query=search, prediction_filter=prediction,
            gender_filter=gender, sort_by=sort_by, sort_order=sort_order,
            patient_id=patient_id_filter,
        )
        return jsonify({"success": True, "history": [r.to_dict() for r in records]}), 200
    except Exception as e:
        print(f"History error: {e}")
        return jsonify({"success": False, "message": "Failed to read records."}), 500
    finally:
        db.close()


@api_bp.route("/metrics", methods=["GET"])
def get_metrics():
    import json
    metrics_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'metrics.json')
    try:
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as f:
                metrics = json.load(f)
            return jsonify({"success": True, "metrics": metrics}), 200
        return jsonify({"success": False, "message": "Metrics not yet generated."}), 404
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@api_bp.route("/delete-prediction/<int:prediction_id>", methods=["DELETE"])
def delete_prediction(prediction_id):
    db = SessionLocal()
    try:
        prediction = crud.get_prediction_by_id(db, prediction_id)
        if not prediction:
            return jsonify({"success": False, "message": "Record not found."}), 404
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for path_attr in [prediction.image_path, prediction.heatmap_path, prediction.report_path]:
            if path_attr:
                abs_path = os.path.join(base_dir, path_attr.lstrip('/'))
                if os.path.exists(abs_path):
                    os.remove(abs_path)
        db.delete(prediction)
        db.commit()
        return jsonify({"success": True, "message": f"Record {prediction_id} deleted."}), 200
    except Exception as e:
        db.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


# ═══════════════════════════ ADMIN DASHBOARD ROUTES ═══════════════════════════

def verify_admin_auth():
    """Validates the Authorization token and ensures the user has 'admin' role."""
    token = request.headers.get("Authorization", "")
    print(f"[AUTH LOG] Received raw Authorization header: '{token}'")
    if token.startswith("Bearer "):
        token = token[7:]
    if not token:
        token = request.headers.get("X-Session-Token", "")
        print(f"[AUTH LOG] Fallback X-Session-Token: '{token}'")
    if not token:
        print("[AUTH LOG] Authentication rejected: No session token provided.")
        return False
    token = token.strip()
    if token == "gstnet-jwt-token-admin-2026":
        print("[AUTH LOG] Authentication approved: Valid legacy admin token.")
        return True
    if token.startswith("gstnet-jwt-admin-"):
        print(f"[AUTH LOG] Authentication approved: Valid database admin token '{token}'.")
        return True
    print(f"[AUTH LOG] Authentication rejected: Token '{token}' did not match any admin sequence.")
    return False


@api_bp.route("/admin/patients", methods=["GET"])
def get_admin_patients():
    if not verify_admin_auth():
        return jsonify({"success": False, "message": "Unauthorized. Admin session required."}), 401
    search = request.args.get("search")
    gender = request.args.get("gender")
    sort_by = request.args.get("sortBy", "created_at")
    sort_order = request.args.get("sortOrder", "desc")
    db = SessionLocal()
    try:
        patients = crud.get_all_patients(
            db=db, search_query=search, gender_filter=gender,
            sort_by=sort_by, sort_order=sort_order
        )
        return jsonify({"success": True, "patients": [p.to_dict() for p in patients]}), 200
    except Exception as e:
        print(f"Admin patients list error: {e}")
        return jsonify({"success": False, "message": "Failed to read patient records."}), 500
    finally:
        db.close()


@api_bp.route("/admin/predictions", methods=["GET"])
def get_admin_predictions():
    if not verify_admin_auth():
        return jsonify({"success": False, "message": "Unauthorized. Admin session required."}), 401
    search = request.args.get("search")
    prediction = request.args.get("prediction")
    gender = request.args.get("gender")
    sort_by = request.args.get("sortBy", "timestamp")
    sort_order = request.args.get("sortOrder", "desc")
    db = SessionLocal()
    try:
        records = crud.get_all_predictions(
            db=db, search_query=search, prediction_filter=prediction,
            gender_filter=gender, sort_by=sort_by, sort_order=sort_order
        )
        return jsonify({"success": True, "predictions": [r.to_dict() for r in records]}), 200
    except Exception as e:
        print(f"Admin predictions list error: {e}")
        return jsonify({"success": False, "message": "Failed to read prediction records."}), 500
    finally:
        db.close()


@api_bp.route("/admin/delete-patient/<int:patient_id>", methods=["DELETE"])
def delete_admin_patient(patient_id):
    if not verify_admin_auth():
        return jsonify({"success": False, "message": "Unauthorized. Admin session required."}), 401
    db = SessionLocal()
    try:
        predictions = db.query(crud.Prediction).filter(crud.Prediction.patient_id == patient_id).all()
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for prediction in predictions:
            for path_attr in [prediction.image_path, prediction.heatmap_path, prediction.report_path]:
                if path_attr:
                    abs_path = os.path.join(base_dir, path_attr.lstrip('/'))
                    if os.path.exists(abs_path):
                        try:
                            os.remove(abs_path)
                        except Exception as file_err:
                            print(f"Error removing file {abs_path}: {file_err}")
        success_preds = crud.delete_patient(db, patient_id)
        if success_preds is None:
            return jsonify({"success": False, "message": "Patient not found."}), 404
        return jsonify({"success": True, "message": "Patient profile and associated diagnostic files deleted."}), 200
    except Exception as e:
        db.rollback()
        print(f"Admin delete patient error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


@api_bp.route("/admin/delete-prediction/<int:prediction_id>", methods=["DELETE"])
def delete_admin_prediction(prediction_id):
    if not verify_admin_auth():
        return jsonify({"success": False, "message": "Unauthorized. Admin session required."}), 401
    db = SessionLocal()
    try:
        prediction = crud.get_prediction_by_id(db, prediction_id)
        if not prediction:
            return jsonify({"success": False, "message": "Record not found."}), 404
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for path_attr in [prediction.image_path, prediction.heatmap_path, prediction.report_path]:
            if path_attr:
                abs_path = os.path.join(base_dir, path_attr.lstrip('/'))
                if os.path.exists(abs_path):
                    try:
                        os.remove(abs_path)
                    except Exception as file_err:
                        print(f"Error removing file {abs_path}: {file_err}")
        db.delete(prediction)
        db.commit()
        return jsonify({"success": True, "message": f"Diagnostic prediction RUN-{prediction_id:05d} deleted."}), 200
    except Exception as e:
        db.rollback()
        print(f"Admin delete prediction error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        db.close()


@api_bp.route("/db-health", methods=["GET"])
def get_db_health():
    """Checks database connection and returns dialect info."""
    db = SessionLocal()
    try:
        # Run simple query to test connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        
        # Get dialect from engine
        dialect_name = db.bind.dialect.name
        return jsonify({
            "success": True,
            "status": "healthy",
            "dialect": dialect_name,
            "message": f"Successfully connected to database using {dialect_name} dialect."
        }), 200
    except Exception as e:
        import traceback
        print(f"[DB HEALTH LOG] DB health check failed: {e}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }), 500
    finally:
        db.close()


# ═══════════════════════════ DASHBOARD ROUTE ══════════════════════════════════

@api_bp.route("/dashboard", methods=["GET"])
def get_dashboard():
    db = SessionLocal()
    try:
        # Run automatic retention pruning (records older than 3 days)
        crud.prune_old_records(db)
        
        stats = crud.get_dashboard_stats(db)
        history_records = db.query(crud.Prediction).order_by(crud.Prediction.timestamp.asc()).all()
        monthly_data = {}
        for rec in history_records:
            m = rec.timestamp.strftime("%Y-%m")
            if m not in monthly_data:
                monthly_data[m] = {"month": m, "Gallstone": 0, "Normal": 0}
            monthly_data[m][rec.prediction] += 1
        chart_data = list(monthly_data.values()) or [
            {"month": "Jan", "Gallstone": 12, "Normal": 22},
            {"month": "Feb", "Gallstone": 15, "Normal": 25},
            {"month": "Mar", "Gallstone": 18, "Normal": 30},
            {"month": "Apr", "Gallstone": 22, "Normal": 28},
            {"month": "May", "Gallstone": 16, "Normal": 34},
        ]
        return jsonify({
            "success": True,
            "stats": {
                "total_scans": stats["total_scans"],
                "gallstone_cases": stats["gallstone_cases"],
                "normal_cases": stats["normal_cases"]
            },
            "recent_predictions": stats["recent_predictions"],
            "caseload_trend": chart_data,
        }), 200
    except Exception as e:
        print(f"Dashboard error: {e}")
        return jsonify({"success": False, "message": "Failed to load dashboard."}), 500
    finally:
        db.close()
