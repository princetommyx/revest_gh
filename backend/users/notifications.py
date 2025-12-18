import random
import string
from django.core.mail import send_mail
from django.conf import settings

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_mock_sms(phone_number, message):
    # In production, use Twilio or similar
    print(f"========================================")
    print(f"[MOCK SMS] To: {phone_number}")
    print(f"Message: {message}")
    print(f"========================================")
    return True

def send_mock_email(email, subject, message):
    # In production, use standard Django send_mail
    print(f"========================================")
    print(f"[MOCK EMAIL] To: {email}")
    print(f"Subject: {subject}")
    print(f"Body: {message}")
    print(f"========================================")
    # Actually try to send if email backend is configured (e.g. console)
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL or 'noreply@revesta.com', [email], fail_silently=True)
    except:
        pass
    return True
