import random
import string
from django.core.mail import send_mail
from django.conf import settings
from .models import Notification

# Try to import SDK, but don't crash if not installed yet (for local dev)
try:
    from exponent_server_sdk import (
        PushClient,
        PushMessage,
        PushServerError,
        DeviceNotRegisteredError,
    )
except ImportError:
    PushClient = None

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def send_push_notification(user, title, body, data=None, urgency='NORMAL'):
    """
    Sends a push notification to the user and saves it in the database.
    """
    # 1. Save to Database
    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body,
        data=data or {},
        urgency=urgency
    )

    # 2. Send to Expo
    token = user.expo_push_token
    if not token or not PushClient:
        if not PushClient:
            print("WARNING: expo-server-sdk not installed.")
        return notification

    try:
        # Urgency Logic
        priority = 'high' if urgency == 'URGENT' else 'default'
        sound = 'default' # customize if needed
        
        response = PushClient().publish(
            PushMessage(
                to=token,
                title=title,
                body=body,
                data=data,
                priority=priority,
                sound=sound,
                channel_id='urgent-alerts' if urgency == 'URGENT' else 'default',
            )
        )
        # We can inspect response here if needed
    except Exception as exc:
        print(f"Error sending push notification: {exc}")
        
    return notification

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
