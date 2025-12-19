from rest_framework import generics, permissions
from .serializers import UserSerializer
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import threading
import logging
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)
User = get_user_model()

def _send_login_alert_task(user_id):
    try:
        user = User.objects.get(pk=user_id)
        app_url = 'https://revesta.app'
        if hasattr(settings, 'CORS_ALLOWED_ORIGINS') and settings.CORS_ALLOWED_ORIGINS:
             app_url = settings.CORS_ALLOWED_ORIGINS[0]
             
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        context = {
            'user_name': user.username,
            'user_email': user.email,
            'login_time': current_time,
            'app_url': app_url,
        }
        
        html_message = render_to_string('emails/login_alert.html', context)
        plain_message = f"New login detected for {user.username} at {current_time}. Was this you?"
        
        send_mail(
            subject='Security Alert: New Login Detected',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info(f"Login alert sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to process login alert: {str(e)}")

def send_login_alert(user):
    """
    Schedule login alert in background thread.
    """
    if (not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD) and not getattr(settings, 'RESEND_API_KEY', None):
        logger.warning("Email configuration missing (neither SMTP nor Resend). Skipping login alert.")
        return

    try:
        # Pass ID instead of user object to avoid thread safety issues
        email_thread = threading.Thread(target=_send_login_alert_task, args=(user.pk,))
        email_thread.start()
        logger.info(f"Login alert scheduled for user {user.pk}")
    except Exception as e:
        logger.error(f"Failed to schedule login alert: {str(e)}")

def _send_welcome_email_task(user_id):
    try:
        user = User.objects.get(pk=user_id)
        app_url = 'https://revesta.app'
        if hasattr(settings, 'CORS_ALLOWED_ORIGINS') and settings.CORS_ALLOWED_ORIGINS:
             app_url = settings.CORS_ALLOWED_ORIGINS[0]
        
        context = {
            'user_name': user.username,
            'user_role': user.role,
            'app_url': app_url,
        }
        
        html_message = render_to_string('emails/welcome_email.html', context)
        plain_message = render_to_string('emails/welcome_email.txt', context)
        
        send_mail(
            subject='Welcome to ReVesta!',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info(f"Welcome email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to process welcome email: {str(e)}")

def send_welcome_email(user):
    """
    Schedule welcome email in background thread.
    """
    if (not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD) and not getattr(settings, 'RESEND_API_KEY', None):
        logger.warning("Email configuration missing (neither SMTP nor Resend). Skipping welcome email.")
        return

    try:
        logger.info(f"Preparing to spawn welcome email thread for user {user.pk}")
        email_thread = threading.Thread(target=_send_welcome_email_task, args=(user.pk,))
        email_thread.start()
        logger.info(f"Welcome email thread spawned for user {user.pk}")
    except Exception as e:
        logger.error(f"Failed to schedule welcome email: {str(e)}")

from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            # Get user from username
            try:
                username = request.data['username']
                user = User.objects.filter(
                    Q(username=username) | 
                    Q(email=username) | 
                    Q(phone_number=username)
                ).first()
                
                if user:
                    send_login_alert(user)
            except Exception as e:
                logger.error(f"Error sending login alert: {e}")
        return response


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserSerializer
    throttle_scope = 'register'
    
    def perform_create(self, serializer):
        # Save the new user
        serializer.save()
        # Send welcome email in background
        try:
            send_welcome_email(serializer.instance)
        except Exception as e:
            # Prevent email errors from failing registration
            logger.error(f"FATAL ERROR sending welcome email: {e}")


class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

class UpdateLocationView(generics.UpdateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        # Expecting 'lat', 'lon', 'is_online' in request.data
        # But serializer expects model fields.
        # We can just use the standard serializer if frontend sends correct field names.
        serializer.save()

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import PasswordResetOTP
from .notifications import generate_otp, send_mock_sms, send_mock_email


def _send_password_reset_email_task(user_id, reset_link, token):
    try:
        user = User.objects.get(pk=user_id)
        
        context = {
            'user_name': user.username,
            'reset_link': reset_link,
            'token': token
        }
        
        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = f"Reset your password here: {reset_link}\nOr use code: {token}"
        
        send_mail(
            subject='Reset Your Password',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info(f"Password reset email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to process password reset email: {str(e)}")

def send_password_reset_email(user, reset_link, token):
    """
    Schedule password reset email in background thread.
    """
    if (not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD) and not getattr(settings, 'RESEND_API_KEY', None):
        logger.warning("Email configuration missing (neither SMTP nor Resend). Skipping password reset email.")
        return

    try:
        email_thread = threading.Thread(target=_send_password_reset_email_task, args=(user.pk, reset_link, token))
        email_thread.start()
        logger.info(f"Password reset email scheduled for user {user.pk}")
    except Exception as e:
        logger.error(f"Failed to schedule password reset email: {str(e)}")

class PasswordResetRequestView(APIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        identifier = request.data.get('identifier') # email or phone
        if not identifier:
            return Response({"error": "Identifier is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine if email or phone
        is_email = '@' in identifier
        
        try:
            if is_email:
                user = User.objects.get(email=identifier)
                # Generate token link
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                
                # Determine frontend URL
                app_url = 'http://localhost:5173'
                if hasattr(settings, 'CORS_ALLOWED_ORIGINS') and settings.CORS_ALLOWED_ORIGINS:
                     # Use the first origin as base, typically production URL in prod
                     app_url = settings.CORS_ALLOWED_ORIGINS[0]
                     if app_url.endswith('/'):
                         app_url = app_url[:-1]
                
                reset_link = f"{app_url}/reset-password?uid={uid}&token={token}"
                
                # Send real email
                send_password_reset_email(user, reset_link, token)
                
                return Response({"message": "Password reset email sent"})
                
            else:
                # Assume phone
                # Remove spaces, etc for better matching if needed
                user = User.objects.get(phone_number__icontains=identifier) # Simple lookup
                
                # Generate OTP
                otp = generate_otp()
                expiry = timezone.now() + timedelta(minutes=10)
                
                # Save OTP (Invalidate old ones)
                PasswordResetOTP.objects.filter(user=user).delete()
                PasswordResetOTP.objects.create(user=user, otp=otp, expires_at=expiry)
                
                send_mock_sms(user.phone_number, f"Your Revesta password code is: {otp}")
                return Response({"message": "Password reset OTP sent (check console)", "mode": "otp", "phone": user.phone_number})
                
        except User.DoesNotExist:
            # Don't reveal user existence? Or maybe do for now
            return Response({"error": "User not found with this identifier"}, status=status.HTTP_404_NOT_FOUND)

class PasswordResetConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        mode = request.data.get('mode') # 'token' or 'otp'
        new_password = request.data.get('new_password')
        
        if not new_password:
            return Response({"error": "New password is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if mode == 'token':
            uidb64 = request.data.get('uid')
            token = request.data.get('token')
            try:
                uid = force_str(urlsafe_base64_decode(uidb64))
                user = User.objects.get(pk=uid)
                if default_token_generator.check_token(user, token):
                    user.set_password(new_password)
                    user.save()
                    return Response({"message": "Password reset successfully"})
                else:
                    return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

        elif mode == 'otp':
            otp_code = request.data.get('otp')
            phone = request.data.get('phone') # or username/identifier to find user
            
            if not otp_code or not phone:
                 return Response({"error": "OTP and Phone required"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Find user by phone first
                # In real app, we might send identifier in body
                user = User.objects.filter(phone_number__icontains=phone).first()
                if not user:
                    return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

                reset_otp = PasswordResetOTP.objects.filter(user=user, otp=otp_code).first()
                
                if reset_otp and reset_otp.is_valid():
                    user.set_password(new_password)
                    user.save()
                    reset_otp.delete() # Consume OTP
                    return Response({"message": "Password reset successfully"})
                else:
                    return Response({"error": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                

class DebugEmailView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        # 1. Check Env Vars
        email_user = settings.EMAIL_HOST_USER
        email_pass = settings.EMAIL_HOST_PASSWORD
        
        status_report = {
            "EMAIL_HOST_USER_CONFIGURED": bool(email_user),
            "EMAIL_HOST_PASSWORD_CONFIGURED": bool(email_pass),
            "EMAIL_HOST_USER_LENGTH": len(email_user) if email_user else 0,
            "EMAIL_HOST_PASSWORD_LENGTH": len(email_pass) if email_pass else 0,
        }

        # 2. Try Sending
        try:
            recipient = request.query_params.get('to', email_user)
            if not recipient:
                 return Response({"error": "No recipient email found (EMAIL_HOST_USER is empty and no 'to' param provided)", "config": status_report})

            send_mail(
                'ReVesta Debug Email',
                f'If you received this, your email configuration is working correctly!\nServer: {settings.EMAIL_HOST}',
                settings.DEFAULT_FROM_EMAIL,
                [recipient],
                fail_silently=False,
            )
            status_report["SEND_STATUS"] = "SUCCESS"
            status_report["MESSAGE"] = f"Email sent successfully to {recipient}"
        except Exception as e:
            status_report["SEND_STATUS"] = "FAILED"
            status_report["ERROR_MESSAGE"] = str(e)
            status_report["ERROR_TYPE"] = type(e).__name__
        
        return Response(status_report)
