import os
import sys
import unittest
import numpy as np
from PIL import Image

# Ensure project modules are importable
WORKSPACE_PATH = os.path.dirname(os.path.abspath(__file__))
if WORKSPACE_PATH not in sys.path:
    sys.path.insert(0, WORKSPACE_PATH)

from database.db_manager import init_db, SessionLocal, Base, engine
from database import crud
from model.gstnet_model import build_gstnet_model, extract_texture_features
from model.predict import predict_ultrasound, generate_gradcam
from backend.app import create_app, load_ai_model
from backend.report_generator import generate_pdf_report

class TestGSTNetSystem(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Initializes tables and database setup before tests."""
        print("\n=== STARTING GSTNet INTEGRATION TESTS ===")
        # Re-initialize DB tables
        from database.db_manager import Base, engine
        Base.metadata.drop_all(bind=engine)
        init_db()
        cls.db = SessionLocal()
        
    @classmethod
    def tearDownClass(cls):
        """Closes connection session."""
        cls.db.close()
        print("\n=== GSTNet INTEGRATION TESTS FINISHED ===")

    def test_01_database_crud(self):
        """Verifies database Patient registration and Prediction logging CRUD."""
        print("\n[Test 1] Verifying database CRUD operations...")
        # Create Patient
        patient = crud.create_patient(self.db, "Integration Test Patient", 45, "Female")
        self.assertIsNotNone(patient.patient_id)
        self.assertEqual(patient.patient_name, "Integration Test Patient")
        self.assertEqual(patient.age, 45)
        self.assertEqual(patient.gender, "Female")
        
        # Create Prediction entry
        prediction = crud.create_prediction(
            db=self.db,
            patient_id=patient.patient_id,
            image_path="/uploads/test.jpg",
            prediction="Normal",
            confidence=0.92,
            heatmap_path="/uploads/test_heatmap.jpg"
        )
        self.assertIsNotNone(prediction.prediction_id)
        self.assertEqual(prediction.patient_id, patient.patient_id)
        self.assertEqual(prediction.prediction, "Normal")
        self.assertEqual(prediction.confidence, 0.92)
        
        # Test History retrieval
        history = crud.get_all_predictions(self.db, search_query="Integration Test")
        self.assertGreater(len(history), 0)
        self.assertEqual(history[0].patient.patient_name, "Integration Test Patient")
        
        # Test Dashboard stats
        stats = crud.get_dashboard_stats(self.db)
        self.assertGreaterEqual(stats["total_scans"], 1)
        self.assertEqual(stats["normal_cases"], 1)
        self.assertEqual(stats["gallstone_cases"], 0)
        print("OK: Database CRUD verified successfully.")

    def test_02_model_architecture(self):
        """Verifies GSTNet structural layers compilation."""
        print("\n[Test 2] Verifying GSTNet custom Keras functional layers compilation...")
        model = build_gstnet_model()
        self.assertEqual(model.name, "GSTNet")
        self.assertEqual(len(model.inputs), 2)
        # Inputs: image (224x224x3) and texture (24)
        self.assertEqual(model.inputs[0].shape[1:], (224, 224, 3))
        self.assertEqual(model.inputs[1].shape[1:], (24,))
        self.assertEqual(model.outputs[0].shape[1:], (1,))
        print("OK: Model compilation verified successfully.")

    def test_03_texture_features(self):
        """Verifies Local Binary Patterns and GLCM 24 texture features extraction."""
        print("\n[Test 3] Verifying Local Binary Patterns & GLCM 24 texture features extraction...")
        # Create a mock grayscale noise image (224x224)
        mock_img = np.random.randint(0, 256, (224, 224)).astype(np.uint8)
        img_gray_norm = mock_img.astype(np.float32) / 255.0
        
        # Extract features
        vector = extract_texture_features(img_gray_norm)
        self.assertEqual(vector.shape, (24,))
        self.assertEqual(vector.dtype, np.float32)
        print("OK: LBP & GLCM 24-dimensional texture extraction verified successfully.")

    def test_04_pipeline_and_gradcam(self):
        """Verifies pipeline inference execution, Grad-CAM overlays, and PDF compilation."""
        print("\n[Test 4] Verifying pipeline diagnostic execution, Grad-CAM maps, and PDF creation...")
        # 1. Synthesize a mock ultrasound scan
        mock_scan_path = os.path.join(WORKSPACE_PATH, "uploads", "test_ultrasound.jpg")
        os.makedirs(os.path.dirname(mock_scan_path), exist_ok=True)
        img_arr = np.random.randint(40, 200, (224, 224, 3)).astype(np.uint8)
        img = Image.fromarray(img_arr)
        img.save(mock_scan_path)
        
        # 2. Build model and predict
        model = build_gstnet_model()
        label, confidence = predict_ultrasound(model, mock_scan_path)
        self.assertIn(label, ["Normal", "Gallstone"])
        self.assertGreaterEqual(confidence, 0.5)
        
        # 3. Generate Grad-CAM map
        heatmap_path = os.path.join(WORKSPACE_PATH, "uploads", "test_heatmap.jpg")
        generate_gradcam(model, mock_scan_path, heatmap_path)
        self.assertTrue(os.path.exists(heatmap_path))
        
        # 4. Generate Clinical PDF report
        report_path = os.path.join(WORKSPACE_PATH, "reports", "test_report.pdf")
        generate_pdf_report(
            patient_name="Tester John",
            patient_age=34,
            patient_gender="Male",
            prediction=label,
            confidence=confidence,
            image_path=mock_scan_path,
            heatmap_path=heatmap_path,
            save_path=report_path,
            patient_id=1,
            prediction_id=1
        )
        self.assertTrue(os.path.exists(report_path))
        
        # Cleanup test files
        for p in [mock_scan_path, heatmap_path, report_path]:
            if os.path.exists(p):
                os.remove(p)
                
        print("OK: Core diagnostic pipeline elements (Grad-CAM, PDF) verified successfully.")

    def test_05_flask_api_endpoints(self):
        """Verifies Flask Blueprints and JSON endpoints status."""
        print("\n[Test 5] Verifying Flask API JSON endpoints status...")
        # Create Flask App Test Client
        app = create_app()
        app.config["TESTING"] = True
        client = app.test_client()
        
        # Test 5.1: Health check
        res = client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json["status"] == "healthy")
        
        # Test 5.2: Authentication login
        res = client.post("/api/login", json={"username": "admin", "password": "admin123"})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json["success"])
        self.assertEqual(res.json["token"], "gstnet-jwt-token-admin-2026")
        
        # Test 5.3: Authentication login failure
        res = client.post("/api/login", json={"username": "wrong", "password": "pass"})
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json["success"])
        
        # Test 5.4: History retrieval endpoint
        res = client.get("/api/history")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json["success"])
        self.assertIn("history", res.json)
        
        # Test 5.5: Dashboard statistics endpoint
        res = client.get("/api/dashboard")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json["success"])
        self.assertIn("stats", res.json)
        self.assertIn("recent_predictions", res.json)
        self.assertIn("caseload_trend", res.json)
        print("OK: Flask API REST JSON endpoints verified successfully.")

if __name__ == '__main__':
    unittest.main()
