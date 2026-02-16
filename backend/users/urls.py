from django.urls import path
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, AdminRegisterView, UserDetailView, UserProfileView,
    UpdateLocationView, ChangePasswordView,
    PasswordResetRequestView, PasswordResetConfirmView, CustomTokenObtainPairView, 
    DebugEmailView, EmailHealthCheckView, GoogleLoginView,
    NotificationViewSet, DeviceTokenView, SendOTPView, VerifyOTPView,
    TestSMSView, HubtelTestView
)
from .admin_stats import admin_dashboard_stats, recent_users

# Authentication endpoints (for /api/v1/auth/)
urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('phone/send-otp/', SendOTPView.as_view(), name='send_otp'),
    path('phone/verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('admin-register/', AdminRegisterView.as_view(), name='admin_register'),
    
    # User Profile & Management
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('me/', UserDetailView.as_view(), name='user_detail'),
    path('location/', UpdateLocationView.as_view(), name='update_location'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('push-token/', DeviceTokenView.as_view(), name='update_push_token'),
    path('notifications/', NotificationViewSet.as_view({'get': 'list', 'patch': 'read_all'}), name='notification_list'),
    path('notifications/<int:pk>/', NotificationViewSet.as_view({'patch': 'read', 'delete': 'destroy'}), name='notification_detail'),
    
    # Admin stats
    path('admin/stats/', admin_dashboard_stats, name='admin_dashboard_stats'),
    path('admin/recent-users/', recent_users, name='admin_recent_users'),
    
    # Debug
    path('email-health/', EmailHealthCheckView.as_view(), name='email_health'),
    path('debug-email/', DebugEmailView.as_view(), name='debug_email'),
    path('test-sms/', TestSMSView.as_view(), name='test_sms'),
    path('test-hubtel/', HubtelTestView.as_view(), name='test_hubtel'),
]


