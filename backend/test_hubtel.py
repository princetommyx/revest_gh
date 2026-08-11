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

def probe():
    client_id = getattr(settings, 'HUBTEL_CLIENT_ID', None)
    client_secret = getattr(settings, 'HUBTEL_CLIENT_SECRET', None)
    sender = getattr(settings, 'HUBTEL_FROM', 'Revesta')
    phone = "233208842410" # Use the number from the screenshot
    
    auth = HTTPBasicAuth(client_id, client_secret)
    url = "https://api-otp.hubtel.com/v1/otp/send"
    
    # Try different field names
    payloads = [
        {"SenderId": sender, "PhoneNumber": phone},
        {"senderId": sender, "phoneNumber": phone},
        {"Sender": sender, "PhoneNumber": phone},
        {"sender": sender, "to": phone}
    ]
    
    for p in payloads:
        print(f"Testing Payload: {p}")
        try:
            r = requests.post(url, json=p, auth=auth, timeout=10)
            print(f"  Status: {r.status_code}")
            print(f"  Response: {r.text}")
        except Exception as e:
            print(f"  Error: {e}")
        print("-" * 30)

if __name__ == "__main__":
    probe()
