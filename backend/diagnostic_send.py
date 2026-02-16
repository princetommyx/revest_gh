import os
import django
import sys
import requests
from requests.auth import HTTPBasicAuth

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.sms_service import HubtelSMSService

def diagnostic_run():
    service = HubtelSMSService()
    phone = "233208842410"
    
    print(f"--- TEST 1: Sending with Sender ID: {service.sender} ---")
    success1 = service.send(phone, "Test 1: Standard 'Revesta' Sender ID. Did this arrive?")
    print(f"Result 1: {'SUCCESS' if success1 else 'FAILED'}")
    
    print("\n--- TEST 2: Sending with Numeric Sender ID (Less likely to be blocked) ---")
    service.sender = "233208842410"
    success2 = service.send(phone, "Test 2: Numeric Sender ID. Did this arrive?")
    print(f"Result 2: {'SUCCESS' if success2 else 'FAILED'}")
    
    print("\n--- TEST 3: Probing Managed OTP Endpoint ---")
    success3 = service.request_otp(phone)
    print(f"Result 3: {'SUCCESS' if success3 else 'FAILED'}")

if __name__ == "__main__":
    diagnostic_run()
