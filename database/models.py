from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from database.db_manager import Base


class User(Base):
    """System user account (Admin or Patient login credentials)."""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="patient")  # "admin" or "patient"
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="user_account")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "patient_id": self.patient_id,
            "created_at": (self.created_at.isoformat() + "Z") if self.created_at else None,
        }


class Patient(Base):
    """Patient demographic profile — now includes date_of_birth."""
    __tablename__ = "patients"

    patient_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_name = Column(String, nullable=False, index=True)
    gender = Column(String, nullable=False)
    date_of_birth = Column(String, nullable=True)   # stored as ISO string YYYY-MM-DD
    age = Column(Integer, nullable=False)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    predictions = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")
    user_account = relationship("User", back_populates="patient", uselist=False)

    def to_dict(self):
        return {
            "patient_id": self.patient_id,
            "patient_name": self.patient_name,
            "gender": self.gender,
            "date_of_birth": self.date_of_birth,
            "age": self.age,
            "created_at": (self.created_at.isoformat() + "Z") if self.created_at else None,
        }


class Prediction(Base):
    """Diagnostic prediction record — now carries a unique report_id."""
    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id", ondelete="CASCADE"), nullable=False)
    report_id = Column(String, nullable=True, unique=True, index=True)  # e.g. GST-20260530-0001
    image_path = Column(String, nullable=False)
    heatmap_path = Column(String, nullable=True)
    prediction = Column(String, nullable=False)   # "Gallstone" or "Normal"
    confidence = Column(Float, nullable=False)
    report_path = Column(String, nullable=True)   # PDF path
    timestamp = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="predictions")

    def to_dict(self):
        return {
            "prediction_id": self.prediction_id,
            "patient_id": self.patient_id,
            "report_id": self.report_id,
            "image_path": self.image_path,
            "heatmap_path": self.heatmap_path,
            "prediction": self.prediction,
            "confidence": self.confidence,
            "report_path": self.report_path,
            "timestamp": (self.timestamp.isoformat() + "Z") if self.timestamp else None,
            "patient": self.patient.to_dict() if self.patient else None,
        }
