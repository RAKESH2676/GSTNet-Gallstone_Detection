import os
import requests
import numpy as np
from PIL import Image

print("=== STARTING GSTNET SECURE ADMIN DASHBOARD API TESTS ===")

BASE_URL = "http://localhost:5000"

# 1. Test unrestricted/public routes still work
print("[Test 1] Checking root route...")
try:
    res = requests.get(f"{BASE_URL}/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    print("OK: Root route accessible.")
except Exception as e:
    print(f"Error connecting to server: {e}")
    exit(1)

# 2. Test restricted routes WITHOUT token
print("[Test 2] Querying /api/admin/patients WITHOUT token...")
res = requests.get(f"{BASE_URL}/api/admin/patients")
assert res.status_code == 401, f"Expected 401, got {res.status_code}"
print("OK: Blocked unauthorized request.")

# 3. Test legacy admin login
print("[Test 3] Logging in as legacy admin...")
login_payload = {"username": "admin", "password": "admin123"}
res = requests.post(f"{BASE_URL}/api/login", json=login_payload)
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
admin_data = res.json()
assert admin_data["success"] is True
admin_token = admin_data["token"]
print(f"OK: Logged in! Admin Token: {admin_token}")

# 4. Test query patients with admin token
print("[Test 4] Querying /api/admin/patients WITH admin token...")
headers = {"Authorization": f"Bearer {admin_token}"}
res = requests.get(f"{BASE_URL}/api/admin/patients", headers=headers)
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
patients_data = res.json()
assert "patients" in patients_data
print(f"OK: Retrieve success. Total Patients in system: {len(patients_data['patients'])}")

# 5. Create a test patient with scan files and prediction record
print("[Test 5] Injecting new patient prediction scan...")
# Create a valid dummy image file
dummy_path = "mock_admin_scan.jpg"
img = Image.fromarray(np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8))
img.save(dummy_path)

try:
    with open(dummy_path, "rb") as img:
        predict_payload = {
            "patient_name": "Admin Test Patient",
            "age": "45",
            "gender": "Female",
            "date_of_birth": "1981-05-15",
            "password": "securepassword123",
            "confirm_password": "securepassword123"
        }
        res = requests.post(
            f"{BASE_URL}/api/predict",
            data=predict_payload,
            files={"image": img}
        )
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    pred_res = res.json()
    prediction = pred_res["prediction"]
    patient = pred_res["patient"]
    patient_id = patient["patient_id"]
    prediction_id = prediction["prediction_id"]
    print(f"OK: Created scan test case. Patient ID: {patient_id}, Prediction ID: {prediction_id}")
finally:
    if os.path.exists(dummy_path):
        os.remove(dummy_path)

# 6. Verify new patient is listed in admin console
print("[Test 6] Verifying new patient is searchable in patients registry...")
res = requests.get(
    f"{BASE_URL}/api/admin/patients?search=Admin Test Patient",
    headers=headers
)
assert res.status_code == 200
found_patients = res.json()["patients"]
assert len(found_patients) > 0, "Patient not found in registry"
assert found_patients[0]["patient_id"] == patient_id
print("OK: Patient found in admin query search.")

# 7. Verify new prediction is listed in predictions registry
print("[Test 7] Verifying new prediction is searchable in predictions registry...")
res = requests.get(
    f"{BASE_URL}/api/admin/predictions?search=Admin Test Patient",
    headers=headers
)
assert res.status_code == 200
found_preds = res.json()["predictions"]
assert len(found_preds) > 0, "Prediction not found in registry"
assert found_preds[0]["prediction_id"] == prediction_id
prediction_record = found_preds[0]
print("OK: Prediction found in admin query search.")

# Verify associated file paths exist
base_dir = os.path.dirname(os.path.abspath(__file__))
image_filepath = os.path.join(base_dir, prediction_record["image_path"].lstrip("/"))
heatmap_filepath = os.path.join(base_dir, prediction_record["heatmap_path"].lstrip("/"))
report_filepath = os.path.join(base_dir, prediction_record["report_path"].lstrip("/"))

assert os.path.exists(image_filepath), f"Original scan file not found: {image_filepath}"
assert os.path.exists(heatmap_filepath), f"Heatmap file not found: {heatmap_filepath}"
assert os.path.exists(report_filepath), f"PDF report file not found: {report_filepath}"
print("OK: Physical files verified on disk.")

# 8. Test delete patient cascade
print("[Test 8] Performing admin delete patient cascade...")
res = requests.delete(
    f"{BASE_URL}/api/admin/delete-patient/{patient_id}",
    headers=headers
)
assert res.status_code == 200, f"Expected 200, got {res.status_code}"
print("OK: Admin patient delete cascade API succeeded.")

# Verify database record deletions
res = requests.get(
    f"{BASE_URL}/api/admin/patients?search=Admin Test Patient",
    headers=headers
)
assert len(res.json()["patients"]) == 0, "Patient record was not deleted"

res = requests.get(
    f"{BASE_URL}/api/admin/predictions?search=Admin Test Patient",
    headers=headers
)
assert len(res.json()["predictions"]) == 0, "Prediction record was not cascade deleted"
print("OK: Database records completely pruned.")

# Verify physical file deletions
assert not os.path.exists(image_filepath), "Scan image file was not deleted"
assert not os.path.exists(heatmap_filepath), "Heatmap file was not deleted"
assert not os.path.exists(report_filepath), "PDF report file was not deleted"
print("OK: Disk storage space successfully reclaimed.")

print("=== ALL SECURE ADMIN DASHBOARD API TESTS PASSED SUCCESSFULLY! ===")
