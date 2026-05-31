import os
import urllib.request
import urllib.error
import mimetypes

def upload_to_supabase(bucket: str, file_path: str, filename: str) -> str:
    """
    Uploads a file to a Supabase Storage bucket and returns its public URL.
    
    Safety features:
    - Verifies upload success before deleting local temporary files.
    - If upload fails, logs the error and preserves the local temporary file.
    - Gracefully falls back to local relative paths if Supabase credentials are missing.
    """
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_key:
        print(f"[STORAGE WARNING] Supabase credentials missing. Storing file locally.")
        if bucket == "ultrasound-images" or bucket == "heatmaps":
            return f"/uploads/{filename}"
        else:
            return f"/reports/{filename}"

    supabase_url = supabase_url.rstrip('/')
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{filename}"
    
    # Resolve MIME type
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    headers = {
        "Authorization": f"Bearer {service_key}",
        "ApiKey": service_key,
        "Content-Type": mime_type
    }
    
    try:
        with open(file_path, "rb") as f:
            file_data = f.read()
            
        print(f"[STORAGE LOG] Uploading {filename} to Supabase bucket '{bucket}'...")
        
        req = urllib.request.Request(upload_url, data=file_data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                status_code = response.getcode()
                response_text = response.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            status_code = e.code
            response_text = e.read().decode("utf-8")
            
        if status_code == 200:
            public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{filename}"
            print(f"[STORAGE LOG] Successfully uploaded to Supabase. Public URL: {public_url}")
            
            # Clean up local temporary file after verified upload success
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"[STORAGE LOG] Cleaned up temporary local file: {file_path}")
            except Exception as clean_err:
                print(f"[STORAGE WARNING] Failed to clean up temp file {file_path}: {clean_err}")
                
            return public_url
        else:
            print(f"[STORAGE ERROR] Upload failed with status {status_code}: {response_text}")
            print(f"[STORAGE WARNING] Keeping local file on disk for fallback access.")
            if bucket == "ultrasound-images" or bucket == "heatmaps":
                return f"/uploads/{filename}"
            else:
                return f"/reports/{filename}"
            
    except Exception as e:
        print(f"[STORAGE ERROR] Exception during Supabase upload: {e}")
        print(f"[STORAGE WARNING] Keeping local file on disk for fallback access.")
        if bucket == "ultrasound-images" or bucket == "heatmaps":
            return f"/uploads/{filename}"
        else:
            return f"/reports/{filename}"


def delete_from_supabase(public_url: str):
    """
    Extracts the bucket and filename from a Supabase public URL
    and deletes the file from the corresponding Supabase Storage bucket.
    """
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_key or not public_url:
        return
        
    supabase_url = supabase_url.rstrip('/')
    public_marker = "/storage/v1/object/public/"
    
    if public_marker not in public_url:
        return
        
    try:
        # Extract everything after the public marker
        relative_path = public_url.split(public_marker, 1)[1]
        bucket, filename = relative_path.split("/", 1)
        
        delete_url = f"{supabase_url}/storage/v1/object/{bucket}/{filename}"
        headers = {
            "Authorization": f"Bearer {service_key}",
            "ApiKey": service_key
        }
        
        print(f"[STORAGE LOG] Deleting {filename} from Supabase bucket '{bucket}'...")
        req = urllib.request.Request(delete_url, headers=headers, method="DELETE")
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                status_code = response.getcode()
        except urllib.error.HTTPError as e:
            status_code = e.code
            
        if status_code == 200:
            print(f"[STORAGE LOG] Successfully deleted {filename} from Supabase Storage.")
        else:
            print(f"[STORAGE WARNING] Supabase delete returned status {status_code}")
    except Exception as e:
        print(f"[STORAGE ERROR] Exception deleting file from Supabase: {e}")
