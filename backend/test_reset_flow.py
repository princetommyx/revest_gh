import urllib.request
import urllib.parse
import json
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User, PasswordResetOTP

def make_request(url, data=None):
    headers = {'Content-Type': 'application/json'}
    if data:
        data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method='POST' if data else 'GET')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8')
        print(f"HTTP ERROR {e.code}:\n{raw}")
        try:
            return e.code, json.loads(raw)
        except:
             return e.code, {}

def test_flow():
    base_url = "http://localhost:8000/api/v1/auth"
    
    # 1. Create a test user if not exists
    phone = "0558888888"
    if not User.objects.filter(phone_number=phone).exists():
        print("Creating test user...")
        User.objects.create_user(username="reset_test", phone_number=phone, password="OldPassword123!", email="reset@test.com")
    
    # 2. Request OTP
    print("Requesting OTP...")
    status, body = make_request(f"{base_url}/password-reset/", {"identifier": phone})
    print(f"Request Status: {status}")
    print(body)
    
    if status != 200:
        print("Failed to request OTP")
        return

    # 3. Retrieve OTP from DB (Simulating SMS)
    user = User.objects.get(phone_number=phone)
    otp_obj = PasswordResetOTP.objects.filter(user=user).last()
    
    if not otp_obj:
        print("No OTP found in DB!")
        return
        
    otp_code = otp_obj.otp
    print(f"Retrieved OTP from DB: {otp_code}")
    
    # 4. Confirm Reset
    print("Resetting Password...")
    new_pass = "NewPassword123!"
    status, body = make_request(f"{base_url}/password-reset/confirm/", {
        "identifier": phone,
        "otp": otp_code,
        "new_password": new_pass,
        "confirm_password": new_pass
    })
    
    print(f"Confirm Status: {status}")
    print(body)
    
    if status == 200:
        print("SUCCESS: Password reset flow verified.")
    else:
        print("FAILED: Verification failed.")

if __name__ == "__main__":
    test_flow()
