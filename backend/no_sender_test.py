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

def no_sender_test():
    client_id = getattr(settings, 'HUBTEL_CLIENT_ID', None)
    client_secret = getattr(settings, 'HUBTEL_CLIENT_SECRET', None)
    phone = "233208842410"
    
    url = "https://smsc.hubtel.com/v1/messages/send"
    params = {
        'clientid': client_id,
        'clientsecret': client_secret,
        'to': phone,
        'content': "Final test: No sender specified. Does this arrive?"
    }
    
    try:
        print(f"Testing GET without 'from' parameter...")
        r = requests.get(url, params=params, timeout=10)
        print(f"  Status: {r.status_code}")
        print(f"  Response: {r.text}")
    except Exception as e:
        print(f"  Error: {e}")

if __name__ == "__main__":
    no_sender_test()
