from django.urls import path
from . import views

urlpatterns = [
    # Dashboard Statistics
    path('stats/', views.DashboardStatsView.as_view(), name='admin_stats'),
    
    # User Management
    path('users/', views.UserListView.as_view(), name='admin_users_list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='admin_user_detail'),
    path('users/<int:pk>/activity/', views.UserActivityView.as_view(), name='admin_user_activity'),
    path('users/<int:pk>/send-message/', views.SendUserMessageView.as_view(), name='admin_user_send_message'),
    
    # Activity Logs
    path('activity/', views.ActivityLogListView.as_view(), name='admin_activity_log'),
    
    # Support Tickets
    path('support/tickets/', views.SupportTicketListCreateView.as_view(), name='admin_tickets_list'),
    path('support/tickets/<int:pk>/', views.SupportTicketDetailView.as_view(), name='admin_ticket_detail'),
    
    # Notifications
    path('notifications/', views.AdminNotificationListView.as_view(), name='admin_notifications'),
    path('notifications/<int:pk>/mark-read/', views.mark_notification_read, name='mark_notification_read'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    
    # System Metrics
    path('metrics/', views.SystemMetricsView.as_view(), name='admin_metrics'),
    path('system/config/', views.SystemConfigView.as_view(), name='system_config'),
    
    # Promo Cards
    path('promos/', views.PromoCardViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin_promos_list'),
    path('promos/<int:pk>/', views.PromoCardViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin_promo_detail'),
    path('promos/public/', views.PublicPromoCardListView.as_view(), name='public_promos_list'),

    # Onboarding Screens
    path('onboarding/', views.OnboardingScreenViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin_onboarding_list'),
    path('onboarding/<int:pk>/', views.OnboardingScreenViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin_onboarding_detail'),
    path('onboarding/public/', views.PublicOnboardingListView.as_view(), name='public_onboarding_list'),
]
