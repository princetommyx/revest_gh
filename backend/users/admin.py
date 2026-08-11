from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Notification
from .notifications import send_push_notification

class CustomUserAdmin(UserAdmin):
    list_display = ('id', 'username', 'email', 'phone_number', 'role', 'city', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'city', 'date_joined')
    search_fields = ('username', 'email', 'phone_number', 'city')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Info', {'fields': ('role', 'phone_number', 'city', 'company_name', 'national_id', 'is_verified')}),
        ('Vehicle Info', {'fields': ('vehicle_type', 'license_plate')}),
        ('Location Info', {'fields': ('current_lat', 'current_lon', 'is_online')}),
        ('Notifications', {'fields': ('expo_push_token',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone_number', 'role', 'city'),
        }),
    )

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'urgency', 'is_read', 'created_at')
    list_filter = ('urgency', 'is_read', 'created_at')
    search_fields = ('user__username', 'title', 'body')
    actions = ['resend_push_notification']

    def resend_push_notification(self, request, queryset):
        for notification in queryset:
            send_push_notification(
                user=notification.user,
                title=notification.title,
                body=notification.body,
                data=notification.data,
                urgency=notification.urgency
            )
        self.message_user(request, f"Resent {queryset.count()} notifications.")
    resend_push_notification.short_description = "Resend Push Notification"

admin.site.register(User, CustomUserAdmin)
