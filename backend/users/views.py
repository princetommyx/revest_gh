from django.db import models
from rest_framework import generics, permissions, status, views, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserProfileSerializer,
    UserLocationSerializer, ChangePasswordSerializer, PublicUserSerializer,
    NotificationSerializer, DeviceTokenSerializer
)
from .permissions import IsOwnerOrAdmin
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging
from django.conf import settings
from datetime import datetime, timedelta
import random
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
import os
import threading

# Import from new modular email service
from .email_service import send_welcome_email, send_login_alert

logger = logging.getLogger(__name__)
User = get_user_model()


from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

@extend_schema(
    tags=['auth'],
    summary="Register new user",
    description="Create a new user account with email and password. Returns JWT tokens on success.",
)
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    throttle_scope = 'register'
    
    def perform_create(self, serializer):
        # Save the new user
        user = serializer.save()
        # Send welcome email in background
        try:
            send_welcome_email(user)
        except Exception as e:
            logger.error(f"FATAL ERROR sending welcome email: {e}")

        # Send admin notification
        try:
            from admin_dashboard.utils import send_admin_notification
            send_admin_notification(
                title="New User Registered",
                message=f"User {user.username} ({user.email}) has joined.",
                type="NEW_USER",
                link=f"/admin/users/{user.id}"
            )
        except Exception as e:
            logger.error(f"Error sending admin notification: {e}")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            print(f"DEBUG: Registration validation failed: {errors}")
            # Flatten errors for the frontend to show a nice message
            error_details = []
            for field, messages in errors.items():
                if isinstance(messages, list):
                    error_details.append(f"{field}: {messages[0]}")
                else:
                    error_details.append(f"{field}: {messages}")
            
            return Response({
                "detail": f"Registration failed. {', '.join(error_details)}",
                "errors": errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        response = super().create(request, *args, **kwargs)
        # Add JWT tokens to response and structure it like login
        if response.status_code == status.HTTP_201_CREATED:
            # Safer lookup using the ID from the created serializer
            user_id = response.data.get('id')
            user = User.objects.get(id=user_id)
            refresh = RefreshToken.for_user(user)
            
            # Re-structure the response to match what frontend expects
            user_data = response.data
            response.data = {
                'user': user_data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }
        return response


class AdminRegisterView(generics.CreateAPIView):
    """
    Special endpoint for creating admin accounts.
    Note: In production, this should be secured or removed.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)  # Open for initial setup
    serializer_class = UserSerializer
    
    def perform_create(self, serializer):
        # Create user with admin privileges
        user = serializer.save()
        user.is_staff = True
        user.is_superuser = True
        user.is_verified = True  # Auto-verify admin accounts
        user.role = 'ADMIN' # Explicitly set role
        user.save()
        logger.info(f"Admin account created: {user.username}")
        
        # Optionally send welcome email - DISABLED for speed
        # try:
        #     send_welcome_email(user)
        # except Exception as e:
        #     logger.error(f"Error sending admin welcome email: {e}")


@extend_schema(
    tags=['users'],
    summary="Get/Update current user (legacy)",
    description="Retrieve or update the authenticated user's profile. Use /users/profile/ instead.",
)
class UserDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

@extend_schema(
    tags=['users'],
    summary="Get/Update user profile",
    description="Retrieve or update the authenticated user's profile information.",
)
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwnerOrAdmin)
    parser_classes = (MultiPartParser, FormParser, JSONParser)  # Explicitly allow file uploads

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        with open('profile_debug.log', 'a') as f:
            f.write(f"\n--- Update at {timezone.now()} ---\n")
            f.write(f"User: {request.user.username}\n")
            f.write(f"Content-Type: {request.content_type}\n")
            f.write(f"Data: {request.data}\n")
            f.write(f"Files: {request.FILES}\n")
            if 'profile_picture' in request.FILES:
                file = request.FILES['profile_picture']
                f.write(f"Profile Picture: {file.name}, size: {file.size}\n")
        
        print(f"DEBUG: UserProfileView update called by {request.user.username}")
        # print(f"DEBUG: Content-Type: {request.content_type}")
        # print(f"DEBUG: request.data keys: {list(request.data.keys())}")
        # print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}")
        return super().update(request, *args, **kwargs)


@extend_schema(
    tags=['users'],
    summary="Update user location",
    description="Update the current user's GPS coordinates and online status. Used for real-time tracking.",
)
class UpdateLocationView(generics.UpdateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserLocationSerializer
    throttle_scope = 'user'

    def get_object(self):
        return self.request.user


@extend_schema(
    tags=['users'],
    summary="Change password",
    description="Change the authenticated user's password. Requires old password verification.",
)
class ChangePasswordView(views.APIView):
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Set new password
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            
            logger.info(f"Password changed for user {request.user.username}")
            
            return Response({
                'status': 'success',
                'message': 'Password changed successfully'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = 'anon'

    def post(self, request):
        identifier = request.data.get('identifier') # Can be email or phone
        if not identifier:
            return Response(
                {'error': 'Email or phone number is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Normalize identifier
        identifier = "".join(identifier.split())
        
        # Try to find user by email or phone
        user = User.objects.filter(models.Q(email=identifier) | models.Q(phone_number__icontains=identifier.lstrip('+'))).first()
        
        if user:
            # Generate OTP
            otp_code = str(random.randint(100000, 999999))
            expires_at = timezone.now() + timedelta(minutes=15)
            
            # Save OTP
            from .models import PasswordResetOTP
            PasswordResetOTP.objects.filter(user=user).delete()
            PasswordResetOTP.objects.create(user=user, otp=otp_code, expires_at=expires_at)
            
            # Send OTP via available methods
            sent_to = []
            
            # 1. Email
            if user.email:
                try:
                    def _async_mail(email, otp):
                        send_mail(
                            'Revesta Password Reset',
                            f'Your password reset verification code is: {otp}',
                            settings.DEFAULT_FROM_EMAIL,
                            [email],
                            fail_silently=True
                        )
                    threading.Thread(target=_async_mail, args=(user.email, otp_code), daemon=True).start()
                    sent_to.append("email")
                except Exception as e:
                    logger.error(f"Failed to send reset email: {e}")

            # 2. SMS (if phone exists)
            if user.phone_number:
                try:
                    from .sms_service import send_otp_sms
                    send_otp_sms(user.phone_number, otp_code)
                    sent_to.append("SMS")
                except Exception as e:
                    logger.error(f"Failed to send reset SMS: {e}")

            # 3. Push
            if user.expo_push_token:
                try:
                    from .notifications import send_push_notification
                    send_push_notification(
                        user,
                        "Password Reset",
                        f"Your reset code is: {otp_code}",
                        data={"type": "password_reset", "otp": otp_code},
                        urgency='URGENT'
                    )
                    sent_to.append("push notification")
                except Exception as e:
                    logger.error(f"Failed to send reset push: {e}")

            # CRITICAL: Print to console for testing
            print("\n" + "*"*40)
            print(f"PASSWORD RESET CODE FOR {user.username} ({identifier}): {otp_code}")
            print("*"*40 + "\n")

            return Response({
                'status': 'success',
                'message': f"Verification code sent via {', '.join(sent_to)}",
                'identifier': identifier
            })
        
        # Security: Don't reveal user existence, but let them know we processed the request
        return Response({
            'status': 'success',
            'message': 'If an account exists with that identifier, a reset code has been sent.'
        })

class PasswordResetConfirmView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        identifier = request.data.get('identifier')
        otp = request.data.get('otp')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not all([identifier, otp, new_password, confirm_password]):
            return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize identifier
        identifier = "".join(identifier.split())

        # Find user
        user = User.objects.filter(models.Q(email=identifier) | models.Q(phone_number__icontains=identifier.lstrip('+'))).first()
        if not user:
            return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP
        from .models import PasswordResetOTP
        reset_otp = PasswordResetOTP.objects.filter(user=user, otp=otp).first()
        
        if not reset_otp or not reset_otp.is_valid():
            return Response({'error': 'Invalid or expired verification code'}, status=status.HTTP_400_BAD_REQUEST)

        # Update password
        user.set_password(new_password)
        user.save()

        # Delete OTP
        reset_otp.delete()

        logger.info(f"Password reset successful for user {user.username}")

        return Response({
            'status': 'success',
            'message': 'Your password has been reset successfully. You can now login.'
        })

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        print(f"DEBUG: Validating credentials for: {attrs.get('username')}")
        try:
            data = super().validate(attrs)
            print(f"DEBUG: Validation successful for {self.user.username}")
        except Exception as e:
            print(f"DEBUG: Validation FAILED: {e}")
            raise e
        
        # Add extra data to response
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
            'is_staff': self.user.is_staff,
            'is_superuser': self.user.is_superuser
        }
        
        # Trigger login alert
        send_login_alert(self.user)
        
        # Security: Device Binding & Alerts
        request = self.context.get('request')
        if request:
             device_id = request.data.get('device_id')
             if device_id:
                 from admin_dashboard.utils import log_activity
                 if self.user.last_device_id and self.user.last_device_id != device_id:
                     # New Device Detected
                     log_activity(
                         self.user, 
                         'SECURITY_ALERT', 
                         details={'event': 'NEW_DEVICE_LOGIN', 'old_device': self.user.last_device_id, 'new_device': device_id},
                         request=request
                     )
                     # In a full MFA flow, we would require OTP here. 
                     # For now, we alert and bind the new device.
                 
                 self.user.last_device_id = device_id
                 self.user.save(update_fields=['last_device_id'])

        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        # First, validate credentials normally
        serializer = self.get_serializer(data=request.data)
        
        try:
            # We don't want to actually return tokens yet, so we just validate
            serializer.is_valid(raise_exception=True)
            user = serializer.user
        except Exception as e:
            # Re-raise or return same error as standard login
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            
        # If user is admin (is_staff), skip OTP and return tokens immediately
        if user.is_staff:
            print(f"DEBUG: Admin user {user.username} logged in, bypassing OTP.")
            # Trigger login alert (still good for security)
            send_login_alert(user)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        # If credentials are valid, generate and send OTP
        # In a real app, you might only do this for certain users/devices
        # But per user request: "every time they tap on login"
        
        otp_code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timedelta(minutes=10)
        
        # Save OTP to DB
        from .models import LoginOTP
        LoginOTP.objects.filter(user=user).delete() # Remove old ones
        LoginOTP.objects.create(user=user, otp=otp_code, expires_at=expires_at)
        
        # Send OTP via Preferred Methods (SMS, Email, AND Push)
        sent_to = []
        
        # 1. Try SMS
        if user.phone_number:
            try:
                from .sms_service import send_otp_sms
                send_otp_sms(user.phone_number, otp_code)
                sent_to.append(f"phone {user.phone_number}")
                print(f"DEBUG: Sent login OTP {otp_code} to {user.phone_number}")
            except Exception as e:
                logger.error(f"Failed to send SMS OTP: {e}")
        
        # 2. Try Email
        if user.email:
            try:
                def _async_mail(email, otp):
                    send_mail(
                        'Revesta Login Verification',
                        f'Your login verification code is: {otp}',
                        settings.DEFAULT_FROM_EMAIL,
                        [email],
                        fail_silently=True
                    )
                threading.Thread(target=_async_mail, args=(user.email, otp_code), daemon=True).start()
                
                sent_to.append(f"email {user.email}")
                print(f"DEBUG: Sent login OTP {otp_code} to {user.email} (Async)")
            except Exception as e:
                logger.error(f"Failed to send Email OTP: {e}")

        # 3. ALWAYS try Push if token exists
        if user.expo_push_token:
            try:
                from .notifications import send_push_notification
                send_push_notification(
                    user, 
                    "Login Verification", 
                    f"Your Revesta login code is: {otp_code}",
                    data={"type": "login_otp", "otp": otp_code},
                    urgency='URGENT'
                )
                sent_to.append("push notification")
                print(f"DEBUG: Sent login OTP {otp_code} via push to {user.username}")
            except Exception as e:
                logger.error(f"Failed to send Push OTP: {e}")

        if not sent_to:
             return Response({
                "detail": "No valid contact method found to send verification code."
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "status": "verification_required",
            "message": f"Login verification code sent to your {', '.join(sent_to)}",
            "user_id": user.id,
            "channel": "phone" if user.phone_number else "email"
        }, status=status.HTTP_200_OK)

class VerifyLoginOTPView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        user_id = request.data.get('user_id')
        otp_code = request.data.get('otp')
        
        if not user_id or not otp_code:
            return Response({"detail": "user_id and otp are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            from .models import User, LoginOTP
            user = User.objects.get(id=user_id)
            verification = LoginOTP.objects.get(user=user)
            
            if not verification.is_valid():
                return Response({"detail": "OTP has expired or already used"}, status=status.HTTP_400_BAD_REQUEST)
                
            if verification.otp == otp_code:
                # Success! Finally issue tokens
                verification.is_verified = True
                verification.save()
                
                refresh = RefreshToken.for_user(user)
                
                # Structure exactly like the successful login serializer did
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'role': user.role,
                        'is_staff': user.is_staff,
                        'is_superuser': user.is_superuser
                    }
                })
            else:
                return Response({"detail": "Invalid verification code"}, status=status.HTTP_400_BAD_REQUEST)
                
        except (User.DoesNotExist, LoginOTP.DoesNotExist):
            return Response({"detail": "Invalid verification session"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DebugEmailView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    
    def get(self, request):
        try:
            logger.info("Debug email requested")
            send_mail(
                'Debug Email Test',
                'If you see this, email is working!',
                settings.DEFAULT_FROM_EMAIL,
                ['revesta3@gmail.com'],  # Hardcoded for test
                fail_silently=False,
            )
            return Response({'status': 'Email sent', 'backend': settings.EMAIL_BACKEND})
        except Exception as e:
            logger.error(f"Debug email failed: {e}")
            return Response({'error': str(e)}, status=500)

class EmailHealthCheckView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    
    def get(self, request):
        status_data = {
            'backend': settings.EMAIL_BACKEND,
            'from_email': settings.DEFAULT_FROM_EMAIL,
            'has_resend_key': bool(os.environ.get('RESEND_API_KEY')),
            'host': getattr(settings, 'EMAIL_HOST', 'N/A'),
            'port': getattr(settings, 'EMAIL_PORT', 'N/A'),
            'cors_origins': settings.CORS_ALLOWED_ORIGINS if hasattr(settings, 'CORS_ALLOWED_ORIGINS') else 'Not Set'
        }
        return Response(status_data)

class GoogleLoginView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = 'login'

    def post(self, request):
        token = request.data.get('token')
        role = request.data.get('role', 'SELLER')
        
        print(f"DEBUG: Google Login Attempt - Role: {role}, Token Length: {len(token) if token else 0}")
        
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # First attempt: Verify as an ID Token (credential)
            id_info = None
            try:
                print("DEBUG: Attempting to verify token as Google ID Token...")
                # Verify token and check audience matches our Client ID
                id_info = id_token.verify_oauth2_token(
                    token, 
                    requests.Request(), 
                    audience='132479987352-q4qc0odon0kcvb1vbs5gb8m385soge6v.apps.googleusercontent.com'
                )
                print("DEBUG: ID Token verification successful")
            except Exception as e:
                print(f"DEBUG: ID Token verification failed ({e}), attempting Access Token /userinfo fallack...")
                # Second attempt: Treat as Access Token and fetch UserInfo
                userinfo_res = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'}
                )
                if userinfo_res.status_code == 200:
                    id_info = userinfo_res.json()
                    print("DEBUG: Access Token UserInfo fetch successful")
                else:
                    print(f"DEBUG: Access Token fetch failed: {userinfo_res.text}")
                    raise ValueError(f"Failed to fetch userinfo: {userinfo_res.text}")

            if not id_info:
                return Response({'error': 'Invalid or expired Google token'}, status=status.HTTP_400_BAD_REQUEST)

            email = id_info.get('email')
            name = id_info.get('name', '')
            picture = id_info.get('picture', '')
            google_id = id_info.get('sub') # This is the unique Google ID
            
            if not email:
                return Response({'error': 'Email not found in Google response'}, status=status.HTTP_400_BAD_REQUEST)

            # Check if user exists
            try:
                user = User.objects.filter(email=email).first()
                if not user:
                    raise User.DoesNotExist
                
                # Update existing user if they haven't been linked to google yet
                if not user.google_id:
                    user.google_id = google_id
                    user.auth_provider = User.AuthProvider.GOOGLE
                    if picture:
                        user.profile_picture_url = picture
                    user.save()

            except User.DoesNotExist:
                # Create new user
                username = email.split('@')[0]
                # Handle username collision
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                # Use provided role or default to SELLER
                role = request.data.get('role', 'SELLER')
                if role not in ['COLLECTOR', 'SELLER', 'RECYCLER']:
                    role = 'SELLER'

                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=None, # Unusable password
                    role=role, 
                    is_verified=True, # Google verified email
                    auth_provider=User.AuthProvider.GOOGLE,
                    google_id=google_id,
                    profile_picture_url=picture
                )
                
                # Send welcome email
                try:
                    send_welcome_email(user)
                    
                    # Notify admin
                    from admin_dashboard.utils import send_admin_notification
                    send_admin_notification(
                        title="New User via Google",
                        message=f"User {user.username} ({user.email}) signed up with Google.",
                        type="NEW_USER",
                        link=f"/admin/users/{user.id}"
                    )
                except Exception as e:
                    logger.error(f"Error in new Google user notification: {e}")

            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            # Send login alert
            try:
                send_login_alert(user)
            except Exception as e:
                logger.error(f"Failed to send login alert: {e}")

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'is_staff': user.is_staff
                }
            })

        except ValueError as e:
            return Response({'error': f'Token verification failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Google login error: {e}")
            return Response({'error': f'Login failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from .models import Notification

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = (permissions.IsAuthenticated,)
    http_method_names = ['get', 'patch', 'delete']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'marked as read'})

    @action(detail=False, methods=['patch'])
    def read_all(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})

class DeviceTokenView(views.APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        serializer = DeviceTokenSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['push_token']
            request.user.expo_push_token = token
            request.user.save()
            return Response({'status': 'token updated'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from .models import PhoneVerification

class SendOTPView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        phone_number = request.data.get('phone_number')
        if not phone_number:
            return Response({'error': 'Phone number is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Normalize phone number (remove spaces, etc.)
        phone_number = "".join(phone_number.split())
        
        # Internal OTP Generation (More reliable than Managed Verification for many accounts)
        otp_code = str(random.randint(100000, 999999))
        expires_at = timezone.now() + timedelta(minutes=10)
        
        # Save or update verification in our DB
        from .models import PhoneVerification
        PhoneVerification.objects.update_or_create(
            phone_number=phone_number,
            defaults={'otp': otp_code, 'expires_at': expires_at}
        )
        
        # CRITICAL: Print to console for testing
        print("\n" + "="*40)
        print(f"VERIFICATION CODE FOR {phone_number}: {otp_code}")
        print("="*40 + "\n")
        
        # Send via Push AND SMS
        sent_methods = []
        
        # 1. Send via Push if user exists for this phone number
        user = User.objects.filter(phone_number=phone_number).first()
        if user and user.expo_push_token:
            try:
                from .notifications import send_push_notification
                send_push_notification(
                    user, 
                    "Verification Code", 
                    f"Your code is: {otp_code}",
                    data={"type": "otp", "otp": otp_code},
                    urgency='URGENT'
                )
                sent_methods.append("Push")
                print(f"DEBUG: Sent register OTP {otp_code} via push to {user.username}")
            except Exception as e:
                logger.error(f"Failed to send Push OTP during register: {e}")

        # 2. Send via Hubtel SMS
        try:
            from .sms_service import send_otp_sms
            send_otp_sms(phone_number, otp_code)
            sent_methods.append("SMS")
            
            return Response({
                'status': 'success',
                'message': f"Verification code sent ({' & '.join(sent_methods)})"
            })
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Failed to trigger SMS for {phone_number}: {e}")
            return Response({
                'status': 'error',
                'error': str(e),
                'message': f"Failed to send SMS. {'Push was sent.' if 'Push' in sent_methods else ''}",
                'traceback': error_details
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdminSendPushView(views.APIView):
    """
    Testing endpoint for Admins to send manual push notifications.
    """
    permission_classes = (permissions.IsAdminUser,)

    def post(self, request):
        user_id = request.data.get('user_id')
        title = request.data.get('title', 'Admin Notification')
        body = request.data.get('body', 'This is a test notification.')
        data = request.data.get('data', {})
        urgency = request.data.get('urgency', 'NORMAL')

        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            if not user.expo_push_token:
                return Response({'error': 'User has no push token registered'}, status=status.HTTP_400_BAD_REQUEST)

            from .notifications import send_push_notification
            send_push_notification(user, title, body, data, urgency)
            
            return Response({'status': 'success', 'message': f'Notification sent to {user.username}'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyOTPView(views.APIView):
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        phone_number = request.data.get('phone_number')
        otp_code = request.data.get('otp')
        
        if not phone_number or not otp_code:
            return Response({'error': 'Phone number and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize
        phone_number = "".join(phone_number.split())
        
        # Test Bypass for local testing if needed
        if otp_code == '123456':
             return Response({'status': 'success', 'message': 'Phone verified (Test Bypass)'})

        try:
            from .models import PhoneVerification
            verification = PhoneVerification.objects.get(phone_number=phone_number)
            
            if not verification.is_valid():
                return Response({'error': 'OTP has expired'}, status=status.HTTP_400_BAD_REQUEST)
                
            if verification.otp == otp_code:
                # Mark as verified (optional: update user model if linked)
                return Response({'status': 'success', 'message': 'Phone verified internally'})
            else:
                return Response({
                    'status': 'error',
                    'error': 'Invalid OTP code',
                    'message': 'The code you entered is incorrect.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except PhoneVerification.DoesNotExist:
            return Response({
                'status': 'error',
                'error': 'No verification request found for this number',
                'message': 'Please request a new OTP.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Internal verification error: {e}")
            return Response({'error': f'Verification error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TestSMSView(views.APIView):
    """
    Temporary endpoint to test Hubtel SMS integration.
    """
    permission_classes = (permissions.IsAdminUser,) # Restricted to admins
    
    def post(self, request):
        phone_number = request.data.get('phone_number')
        content = request.data.get('content', 'This is a test message from Revesta Hubtel Integration.')
        
        if not phone_number:
            return Response({'error': 'phone_number is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .sms_service import HubtelSMSService
        service = HubtelSMSService()
        success = service.send(phone_number, content)
        
        if success:
            return Response({'status': 'success', 'message': f'SMS sent to {phone_number}'})
        else:
            return Response({'status': 'error', 'message': 'Failed to send SMS. Check backend logs.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class HubtelTestView(views.APIView):
    """
    Dedicated endpoint to test Hubtel features directly.
    """
    permission_classes = (permissions.IsAdminUser,)
    
    def post(self, request):
        phone_number = request.data.get('phone_number')
        mode = request.data.get('mode', 'sms') # 'sms' or 'managed'
        test_sender = request.data.get('sender_id')
        
        if not phone_number:
            return Response({'error': 'phone_number is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .sms_service import HubtelSMSService
        service = HubtelSMSService()
        if test_sender:
            service.sender = test_sender
        
        if mode == 'managed':
            success = service.request_otp(phone_number)
            method = "Managed Verification"
        else:
            success = service.send(phone_number, "Test message from Revesta Hubtel Hub.")
            method = "Standard SMS"
            
        if success:
            return Response({
                'status': 'success', 
                'message': f'Test successful using {method}'
            })
        else:
            return Response({
                'status': 'error', 
                'message': f'Test failed using {method}. Check backend logs.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
