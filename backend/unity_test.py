import requests
from requests.auth import HTTPBasicAuth
import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from django.conf import settings

def unity_v2_test():
    client_id = getattr(settings, 'HUBTEL_CLIENT_ID', None)
    client_secret = getattr(settings, 'HUBTEL_CLIENT_SECRET', None)
    phone = "233208842410"
    
    # Trying the Unity API v2 format (often used via api.hubtel.com)
    # This might require an ApplicationId, but let's try with ClientId/Secret first
    url = "https://api.hubtel.com/v1/messages/send" # Actually v1 is Unity too
    
    payload = {
        "from": "Hubtel", # Try using their default brand
        "to": phone,
        "content": "UNITY TEST: Does this arrive?",
        "clientReference": "UNITY_TEST_01"
    }
    
    auth = HTTPBasicAuth(client_id, client_secret)
    
    try:
        print(f"Testing Unity API (POST): {url}")
        r = requests.post(url, json=payload, auth=auth, timeout=15)
        print(f"  Status: {r.status_code}")
        print(f"  Response: {r.text}")
    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    unity_v2_test()
