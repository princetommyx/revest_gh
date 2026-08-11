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

def multi_test():
    client_id = getattr(settings, 'HUBTEL_CLIENT_ID', None)
    client_secret = getattr(settings, 'HUBTEL_CLIENT_SECRET', None)
    phone = "208842410" # Base number
    
    # Formats to try
    targets = [
        "233" + phone,
        "+233" + phone,
        "0" + phone,
    ]
    
    # Senders to try
    senders = [
        "Revesta",
        "INFO",
        "NOTICE",
        "233244000000" # Dummy numeric
    ]
    
    auth = HTTPBasicAuth(client_id, client_secret)
    url = "https://smsc.hubtel.com/v1/messages/send"
    
    for t in targets:
        for s in senders:
            print(f"Testing To: {t} | From: {s}")
            params = {
                'clientid': client_id,
                'clientsecret': client_secret,
                'from': s,
                'to': t,
                'content': f"Test from Revesta system. Target: {t}, Sender: {s}"
            }
            try:
                # Using GET as it is the most legacy/robust on smsc.hubtel.com
                r = requests.get(url, params=params, timeout=10)
                print(f"  Status: {r.status_code}")
                print(f"  Response: {r.text}")
            except Exception as e:
                print(f"  Error: {e}")
            print("-" * 20)

if __name__ == "__main__":
    multi_test()
