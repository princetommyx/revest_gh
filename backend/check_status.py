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

def check_status(msg_id):
    client_id = getattr(settings, 'HUBTEL_CLIENT_ID', None)
    client_secret = getattr(settings, 'HUBTEL_CLIENT_SECRET', None)
    
    url = f"https://smsc.hubtel.com/v1/messages/{msg_id}"
    auth = HTTPBasicAuth(client_id, client_secret)
    
    # Hubtel might use params or path for status check
    try:
        # Standard GET with credentials
        params = {'clientid': client_id, 'clientsecret': client_secret}
        r = requests.get(url, params=params, timeout=10)
        print(f"Status for {msg_id}:")
        print(f"  HTTP Status: {r.status_code}")
        print(f"  Response: {r.text}")
    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    # Latest message IDs from output
    m_ids = [
        "1131548b-6a24-4ce8-921b-85ad1c1ab9ea", # Revesta -> 233
        "d1eae367-893f-4992-87e4-64634ffa8de8", # INFO -> 233
        "ac238fd6-8ff1-486d-86da-aff27e0d3dea", # NOTICE -> 233
        "b41244dc-5eeb-4986-ad2e-35ca7eac88b8"  # Numeric -> 233
    ]
    for m in m_ids:
        check_status(m)
        print("-" * 20)
