import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import PasswordResetOTP

def get_latest_otp():
    otp = PasswordResetOTP.objects.order_by('-created_at').first()
    if otp:
        print(f"Latest OTP: {otp.otp} for user {otp.user.username}")
    else:
        print("No OTP found")

if __name__ == "__main__":
    get_latest_otp()
