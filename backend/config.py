import os

# Root directory of the execution
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Upload and Reports folders
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
REPORTS_FOLDER = os.path.join(BASE_DIR, "reports")

# Ensure required system folders exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REPORTS_FOLDER, exist_ok=True)

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "gstnet_diagnostic_secret_key_2026")
    UPLOAD_FOLDER = UPLOAD_FOLDER
    REPORTS_FOLDER = REPORTS_FOLDER
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "tif", "tiff"}
    
    # SQLite configuration
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(BASE_DIR, 'database', 'gstnet.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
