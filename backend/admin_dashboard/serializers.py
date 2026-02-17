from rest_framework import serializers
from .models import ActivityLog, SupportTicket, AdminNotification, SystemMetrics, PromoCard
from users.models import User
from market.models import Listing
from logistics.models import PickupRequest


class UserSummarySerializer(serializers.ModelSerializer):
    """Lightweight user serializer for admin views."""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'role_display', 'is_online', 'is_verified', 'date_joined', 'is_staff', 'is_superuser']


class ActivityLogSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_display', 'action', 'action_display', 'details', 
                  'ip_address', 'timestamp']
    
    def get_user_display(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'role': obj.user.role
            }
        return None


class SupportTicketSerializer(serializers.ModelSerializer):
    user_details = UserSummarySerializer(source='user', read_only=True)
    assigned_admin_details = UserSummarySerializer(source='assigned_admin', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = SupportTicket
        fields = ['id', 'ticket_number', 'user', 'user_details', 'assigned_admin', 
                  'assigned_admin_details', 'subject', 'description', 'category', 
                  'category_display', 'status', 'status_display', 'priority', 
                  'priority_display', 'created_at', 'updated_at', 'resolved_at', 'metadata']
        read_only_fields = ['ticket_number', 'created_at', 'updated_at', 'resolved_at']


class AdminNotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = AdminNotification
        fields = ['id', 'notification_type', 'notification_type_display', 'title', 
                  'message', 'link', 'is_read', 'created_at']
        read_only_fields = ['created_at']


class SystemMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemMetrics
        fields = '__all__'


class DashboardStatsSerializer(serializers.Serializer):
    """
    Serializer for dashboard overview statistics.
    """
    # User stats
    total_users = serializers.IntegerField()
    total_collectors = serializers.IntegerField()
    total_sellers = serializers.IntegerField()
    total_recyclers = serializers.IntegerField()
    online_users = serializers.IntegerField()
    new_users_today = serializers.IntegerField()
    new_users_this_week = serializers.IntegerField()
    new_users_this_month = serializers.IntegerField()
    
    # Activity stats
    total_orders = serializers.IntegerField()
    active_orders = serializers.IntegerField()
    completed_orders_today = serializers.IntegerField()
    total_rides = serializers.IntegerField()
    active_rides = serializers.IntegerField()
    completed_rides_today = serializers.IntegerField()
    
    # Support stats
    total_tickets = serializers.IntegerField()
    open_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    resolved_tickets_today = serializers.IntegerField()
    
    # Recent activity count
    activities_today = serializers.IntegerField()


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Detailed user information for admin user management.
    """
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    recent_activities = serializers.SerializerMethodField()
    total_orders = serializers.SerializerMethodField()
    total_rides = serializers.SerializerMethodField()
    open_tickets = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone_number', 'role', 'role_display',
                  'city', 'is_verified', 'is_online', 'is_active', 'is_support', 'is_staff', 'is_superuser', 
                  'current_lat', 'current_lon', 'date_joined', 'last_login',
                  'vehicle_type', 'license_plate', 'company_name', 'tax_id', 'national_id',
                  'auth_provider', 'google_id', 'profile_picture_url',
                  'recent_activities', 'total_orders', 'total_rides', 'open_tickets']
        read_only_fields = ['date_joined', 'last_login']
    
    def get_recent_activities(self, obj):
        activities = ActivityLog.objects.filter(user=obj).order_by('-timestamp')[:5]
        return ActivityLogSerializer(activities, many=True).data
    
    def get_total_orders(self, obj):
        if obj.role == 'SELLER':
            return Listing.objects.filter(seller=obj).count()
        return 0
    
    def get_total_rides(self, obj):
        if obj.role == 'COLLECTOR':
            return PickupRequest.objects.filter(collector=obj).count()
        elif obj.role in ['SELLER', 'RECYCLER']:
            return PickupRequest.objects.filter(provider=obj).count()
        return 0
    
    def get_open_tickets(self, obj):
        return SupportTicket.objects.filter(
            user=obj,
            status__in=['OPEN', 'IN_PROGRESS']
        ).count()


class PromoCardSerializer(serializers.ModelSerializer):
    """
    Serializer for promotional cards.
    """
    class Meta:
        model = PromoCard
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
