from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, AdminRegisterView, UserDetailView, UpdateLocationView, 
    PasswordResetRequestView, PasswordResetConfirmView, CustomTokenObtainPairView, 
    DebugEmailView, EmailHealthCheckView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('admin-register/', AdminRegisterView.as_view(), name='admin_register'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('me/location/', UpdateLocationView.as_view(), name='update_location'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('email-health/', EmailHealthCheckView.as_view(), name='email_health'),
    path('debug-email/', DebugEmailView.as_view(), name='debug_email'),  # Backwards compatibility
]

