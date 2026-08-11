import random
import string
from django.core.mail import send_mail
from django.conf import settings
from .models import Notification

# Professional Push Notification SDK
from exponent_server_sdk import (
    PushClient,
    PushMessage,
    PushServerError,
    DeviceNotRegisteredError,
)
import threading
from requests.exceptions import ConnectionError, HTTPError

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

    def _send_task(user_id, token, title, body, data, urgency):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
            # Urgency Logic
            priority = 'high' if urgency == 'URGENT' else 'default'
            sound = 'default'
            
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
            
            # Check for errors in the individual response
            try:
                response.validate_response()
            except DeviceNotRegisteredError:
                user.expo_push_token = None
                user.save(update_fields=['expo_push_token'])
                print(f"DEBUG: Token {token} no longer valid. Removed from user.")
            except Exception as exc:
                print(f"DEBUG: Push notification delivery failed for {token}: {exc}")
                
        except (PushServerError, ConnectionError, HTTPError) as exc:
            print(f"ERROR: Expo Push Server error: {exc}")
        except Exception as exc:
            print(f"ERROR: Unexpected error sending push: {exc}")

    # 2. Send to Expo via background thread
    token = user.expo_push_token
    if token:
        thread = threading.Thread(
            target=_send_task, 
            args=(user.id, token, title, body, data, urgency),
            daemon=True
        )
        thread.start()
        
    return notification
        
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
