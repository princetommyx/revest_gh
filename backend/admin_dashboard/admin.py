from django.contrib import admin
from .models import ActivityLog, SupportTicket, AdminNotification, SystemMetrics


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'timestamp', 'ip_address']
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'user__email', 'details']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_number', 'user', 'subject', 'status', 'priority', 'assigned_admin', 'created_at']
    list_filter = ['status', 'priority', 'category', 'created_at']
    search_fields = ['ticket_number', 'user__username', 'subject', 'description']
    readonly_fields = ['ticket_number', 'created_at', 'updated_at', 'resolved_at']
    raw_id_fields = ['user', 'assigned_admin']
    date_hierarchy = 'created_at'


@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = ['admin', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'admin__username']
    readonly_fields = ['created_at']
    raw_id_fields = ['admin']


@admin.register(SystemMetrics)
class SystemMetricsAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'total_users', 'online_users', 'active_orders', 'active_rides', 'open_tickets']
    list_filter = ['timestamp']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
