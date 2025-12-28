from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserProfileSerializer,
    UserLocationSerializer, ChangePasswordSerializer, PublicUserSerializer
)
from .permissions import IsOwnerOrAdmin
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import threading
import logging
from django.conf import settings
from datetime import datetime
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
import os

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
        
        html_content = render_to_string('emails/login_alert.html', context)
        text_content = strip_tags(html_content)
        
        send_mail(
            subject='New Login Detected - ReVesta',
            message=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_content,
            fail_silently=False,
        )
        logger.info(f"Login alert sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send login alert: {e}")

def send_login_alert(user):
    """Trigger background task to send login alert"""
    thread = threading.Thread(target=_send_login_alert_task, args=(user.id,))
    thread.start()

def _send_welcome_email_task(user_id):
    try:
        user = User.objects.get(pk=user_id)
        app_url = 'https://revesta.app'
        
        context = {
            'user_name': user.username,
            'app_url': app_url,
            'login_url': f"{app_url}/login"
        }
        
        html_content = render_to_string('emails/welcome.html', context)
        text_content = strip_tags(html_content)
        
        send_mail(
            subject='Welcome to ReVesta!',
            message=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_content,
            fail_silently=False,
        )
        logger.info(f"Welcome email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")

def send_welcome_email(user):
    """Trigger background task to send welcome email"""
    thread = threading.Thread(target=_send_welcome_email_task, args=(user.id,))
    thread.start()


@extend_schema(
    tags=['auth'],
    summary="Register new user",
    description="Create a new user account with email and password. Returns JWT tokens on success.",
)
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer
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
        response = super().create(request, *args, **kwargs)
        # Add JWT tokens to response
        if response.status_code == status.HTTP_201_CREATED:
            user = User.objects.get(email=request.data.get('email'))
            refresh = RefreshToken.for_user(user)
            response.data['tokens'] = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
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


@extend_schema(
    tags=['users'],
    summary="Get/Update user profile",
    description="Retrieve or update the authenticated user's profile information.",
)
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated, IsOwnerOrAdmin)

    def get_object(self):
        return self.request.user


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
        email = request.data.get('email')
        if not email:
            return Response(
                {'error': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user = User.objects.get(email=email)
            # Generate reset token (using simplejwt or default token generator)
            # For simplicity, we'll use a placeholder logic or a proper token
            # In production, use django.contrib.auth.tokens.default_token_generator
            
            # Send email
            send_mail(
                'Password Reset Request',
                'Click here to reset your password: (link)',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            return Response({'status': 'Password reset email sent'})
        except User.DoesNotExist:
            # Don't reveal user existence
            return Response({'status': 'Password reset email sent'})
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            return Response(
                {'error': 'Failed to send email'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PasswordResetConfirmView(views.APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        # Implementation for password reset confirmation
        return Response({'status': 'Password reset successful'})

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
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
        
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # First attempt: Verify as an ID Token (credential)
            id_info = None
            try:
                id_info = id_token.verify_oauth2_token(token, requests.Request())
            except Exception as e:
                logger.debug(f"ID Token verification failed, trying UserInfo API: {e}")
                # Second attempt: Treat as Access Token and fetch UserInfo
                userinfo_res = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'}
                )
                if userinfo_res.status_code == 200:
                    id_info = userinfo_res.json()
                else:
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
