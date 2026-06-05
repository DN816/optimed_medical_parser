import os
from supabase import create_client, Client

url: str = "https://idumctelwqwojpgcgqor.supabase.co"
key: str = "REDACTED_SUPABASE_SERVICE_KEY"

supabase: Client = create_client(url, key)

bucket_name = "optimed-bills"

try:
    print(f"Creating bucket {bucket_name}...")
    res = supabase.storage.create_bucket(bucket_name, options={"public": True})
    print(f"Bucket created successfully: {res}")
except Exception as e:
    print(f"Failed to create bucket (it might already exist): {e}")

try:
    print("Checking bucket details...")
    res = supabase.storage.get_bucket(bucket_name)
    print(f"Bucket exists: {res}")
except Exception as e:
    print(f"Error fetching bucket: {e}")
