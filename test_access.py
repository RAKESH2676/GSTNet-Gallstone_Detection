import os
import requests
import json
import numpy as np
from PIL import Image

BASE_URL = "http://localhost:5000/api"

def run_tests():
    print("=== STARTING GSTNET SECURE REPORT ACCESS API TESTS ===")
    
    # 1. Create a mock ultrasound image scan
    mock_img_path = "mock_scan.jpg"
    img = Image.fromarray(np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8))
    img.save(mock_img_path)
    print(f"[+] Created mock scan image at {mock_img_path}")

    try:
        # 2. Run prediction with registration parameters
        print("\n[Test 1] Running prediction with secure patient registration...")
        payload = {
            "patient_name": "Secure Test Patient",
            "age": "34",
            "gender": "Female",
            "date_of_birth": "1992-08-14",
            "password": "securepassword123",
            "confirm_password": "securepassword123"
        }
        
        with open(mock_img_path, 'rb') as f:
            files = {'image': f}
            res = requests.post(f"{BASE_URL}/predict", data=payload, files=files)
            
        print("Status Code:", res.status_code)
        self_data = res.json()
        print("Response:", json.dumps(self_data, indent=2))
        
        assert res.status_code == 200
        assert self_data["success"] is True
        report_id = self_data["prediction"]["report_id"]
        patient_id = self_data["patient"]["patient_id"]
        dob = self_data["patient"]["date_of_birth"]
        print(f"OK: Prediction succeeded. Report ID: {report_id}, Patient ID: {patient_id}")

        # 3. Test report access with correct credentials
        print("\n[Test 2] Accessing report with correct Report ID, DOB, and Password...")
        access_payload = {
            "report_id": report_id,
            "date_of_birth": dob,
            "password": "securepassword123"
        }
        res = requests.post(f"{BASE_URL}/patient-report-access", json=access_payload)
        print("Status Code:", res.status_code)
        access_data = res.json()
        assert res.status_code == 200
        assert access_data["success"] is True
        assert access_data["report"]["report_id"] == report_id
        print("OK: Access granted successfully!")

        # 4. Test report access with incorrect password
        print("\n[Test 3] Accessing report with INCORRECT password...")
        bad_pass_payload = {
            "report_id": report_id,
            "date_of_birth": dob,
            "password": "wrongpassword"
        }
        res = requests.post(f"{BASE_URL}/patient-report-access", json=bad_pass_payload)
        print("Status Code (Expected 401):", res.status_code)
        bad_data = res.json()
        assert res.status_code == 401
        assert bad_data["success"] is False
        print("OK: Access denied successfully!")

        # 5. Test forgot password flow
        print("\n[Test 4] Verifying identity via Forgot Password workflow...")
        forgot_payload = {
            "report_id": report_id,
            "patient_name": "Secure Test Patient",
            "date_of_birth": dob
        }
        res = requests.post(f"{BASE_URL}/forgot-password", json=forgot_payload)
        print("Status Code:", res.status_code)
        forgot_data = res.json()
        assert res.status_code == 200
        assert forgot_data["success"] is True
        assert forgot_data["patient_id"] == patient_id
        print(f"OK: Identity verified! Patient ID returned: {forgot_data['patient_id']}")

        # 6. Test password reset flow
        print("\n[Test 5] Resetting password securely...")
        reset_payload = {
            "patient_id": patient_id,
            "password": "newsecurepassword456",
            "confirm_password": "newsecurepassword456"
        }
        res = requests.post(f"{BASE_URL}/reset-password", json=reset_payload)
        print("Status Code:", res.status_code)
        reset_data = res.json()
        assert res.status_code == 200
        assert reset_data["success"] is True
        print("OK: Password reset successfully!")

        # 7. Test access with the new password
        print("\n[Test 6] Accessing report using the NEW password...")
        new_access_payload = {
            "report_id": report_id,
            "date_of_birth": dob,
            "password": "newsecurepassword456"
        }
        res = requests.post(f"{BASE_URL}/patient-report-access", json=new_access_payload)
        print("Status Code:", res.status_code)
        new_data = res.json()
        assert res.status_code == 200
        assert new_data["success"] is True
        print("OK: Access granted with new password successfully!")

        # 8. Test old password fails
        print("\n[Test 7] Accessing report using the OLD password (should fail)...")
        res = requests.post(f"{BASE_URL}/patient-report-access", json=access_payload)
        print("Status Code (Expected 401):", res.status_code)
        assert res.status_code == 401
        print("OK: Old password correctly rejected!")

        print("\n=== ALL SECURE REPORT ACCESS API TESTS PASSED SUCCESSFULLY! ===")

    finally:
        if os.path.exists(mock_img_path):
            os.remove(mock_img_path)
            print("[+] Cleaned up mock scan image file.")

if __name__ == "__main__":
    run_tests()
