from django.urls import path
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, AdminRegisterView, UserDetailView, UserProfileView,
    UpdateLocationView, ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView, CustomTokenObtainPairView, 
    DebugEmailView, EmailHealthCheckView, GoogleLoginView
)

# Authentication endpoints (for /api/v1/auth/)
auth_urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]

# Admin registration enabled in all environments for now
auth_urlpatterns.append(
    path('admin-register/', AdminRegisterView.as_view(), name='admin_register')
)

# User profile endpoints (for /api/v1/users/)
user_urlpatterns = [
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('me/', UserDetailView.as_view(), name='user_detail'),  # Backward compatibility
    path('location/', UpdateLocationView.as_view(), name='update_location'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
]

# Debug/Health endpoints
debug_urlpatterns = [
    path('email-health/', EmailHealthCheckView.as_view(), name='email_health'),
    path('debug-email/', DebugEmailView.as_view(), name='debug_email'),
]

# Main urlpatterns - combine all
urlpatterns = auth_urlpatterns + user_urlpatterns + debug_urlpatterns
