from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Q, Count, F
from django.utils import timezone
from datetime import timedelta
import logging

from .models import ActivityLog, SupportTicket, AdminNotification, SystemMetrics
from .serializers import (
    ActivityLogSerializer, SupportTicketSerializer,
    AdminNotificationSerializer, SystemMetricsSerializer,
    DashboardStatsSerializer, UserDetailSerializer, UserSummarySerializer
)
from .permissions import IsAdminUser, IsSuperAdmin
from users.models import User
from market.models import Listing
from logistics.models import PickupRequest

logger = logging.getLogger(__name__)


class DashboardStatsView(views.APIView):
    """
    GET /api/admin/stats/
    Returns comprehensive dashboard statistics.
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start - timedelta(days=30)
        
        # User statistics
        total_users = User.objects.count()
        total_collectors = User.objects.filter(role='COLLECTOR').count()
        total_sellers = User.objects.filter(role='SELLER').count()
        total_recyclers = User.objects.filter(role='RECYCLER').count()
        online_users = User.objects.filter(is_online=True).count()
        new_users_today = User.objects.filter(date_joined__gte=today_start).count()
        new_users_this_week = User.objects.filter(date_joined__gte=week_start).count()
        new_users_this_month = User.objects.filter(date_joined__gte=month_start).count()
        
        # Order statistics (Listings)
        total_orders = Listing.objects.count()
        active_orders = Listing.objects.count()  # All active listings
        completed_orders_today = 0  # Listings don't have status tracking yet
        
        # Ride statistics (PickupRequests)
        total_rides = PickupRequest.objects.count()
        active_rides = PickupRequest.objects.filter(status__in=['PENDING', 'ACCEPTED', 'ARRIVED']).count()
        completed_rides_today = PickupRequest.objects.filter(
            status='COMPLETED',
            created_at__gte=today_start
        ).count()
        
        # Support statistics
        total_tickets = SupportTicket.objects.count()
        open_tickets = SupportTicket.objects.filter(status='OPEN').count()
        in_progress_tickets = SupportTicket.objects.filter(status='IN_PROGRESS').count()
        resolved_tickets_today = SupportTicket.objects.filter(
            status='RESOLVED',
            resolved_at__gte=today_start
        ).count()
        
        # Activity statistics
        activities_today = ActivityLog.objects.filter(timestamp__gte=today_start).count()
        
        stats = {
            'total_users': total_users,
            'total_collectors': total_collectors,
            'total_sellers': total_sellers,
            'total_recyclers': total_recyclers,
            'online_users': online_users,
            'new_users_today': new_users_today,
            'new_users_this_week': new_users_this_week,
            'new_users_this_month': new_users_this_month,
            'total_orders': total_orders,
            'active_orders': active_orders,
            'completed_orders_today': completed_orders_today,
            'total_rides': total_rides,
            'active_rides': active_rides,
            'completed_rides_today': completed_rides_today,
            'total_tickets': total_tickets,
            'open_tickets': open_tickets,
            'in_progress_tickets': in_progress_tickets,
            'resolved_tickets_today': resolved_tickets_today,
            'activities_today': activities_today,
        }
        
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)


class UserListView(generics.ListAPIView):
    """
    GET /api/admin/users/
    List all users with filtering and search.
    """
    permission_classes = [IsAdminUser]
    serializer_class = UserSummarySerializer
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        
        # Filters
        role = self.request.query_params.get('role')
        is_verified = self.request.query_params.get('is_verified')
        is_online = self.request.query_params.get('is_online')
        search = self.request.query_params.get('search')
        
        if role:
            queryset = queryset.filter(role=role)
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified.lower() == 'true')
        if is_online is not None:
            queryset = queryset.filter(is_online=is_online.lower() == 'true')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search)
            )
        
        return queryset


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/admin/users/<id>/
    Get or update user details.
    """
    permission_classes = [IsAdminUser]
    serializer_class = UserDetailSerializer
    queryset = User.objects.all()


class UserActivityView(generics.ListAPIView):
    """
    GET /api/admin/users/<id>/activity/
    Get activity log for a specific user.
    """
    permission_classes = [IsAdminUser]
    serializer_class = ActivityLogSerializer
    
    def get_queryset(self):
        user_id = self.kwargs.get('pk')
        return ActivityLog.objects.filter(user_id=user_id).order_by('-timestamp')


class ActivityLogListView(generics.ListAPIView):
    """
    GET /api/admin/activity/
    List all system activities with filtering.
    """
    permission_classes = [IsAdminUser]
    serializer_class = ActivityLogSerializer
    
    def get_queryset(self):
        queryset = ActivityLog.objects.all().select_related('user')
        
        # Filters
        action = self.request.query_params.get('action')
        user_id = self.request.query_params.get('user_id')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if action:
            queryset = queryset.filter(action=action)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        
        return queryset[:100]  # Limit to recent 100


class SupportTicketListCreateView(generics.ListCreateAPIView):
    """
    GET/POST /api/admin/support/tickets/
    List all support tickets or create new one.
    """
    permission_classes = [IsAdminUser]
    serializer_class = SupportTicketSerializer
    
    def get_queryset(self):
        queryset = SupportTicket.objects.all().select_related('user', 'assigned_admin')
        
        # Filters
        status = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        assigned_to_me = self.request.query_params.get('assigned_to_me')
        
        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if assigned_to_me == 'true':
            queryset = queryset.filter(assigned_admin=self.request.user)
        
        return queryset


class SupportTicketDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/admin/support/tickets/<id>/
    Get or update a support ticket.
    """
    permission_classes = [IsAdminUser]
    serializer_class = SupportTicketSerializer
    queryset = SupportTicket.objects.all()


class AdminNotificationListView(generics.ListAPIView):
    """
    GET /api/admin/notifications/
    List notifications for the current admin.
    """
    permission_classes = [IsAdminUser]
    serializer_class = AdminNotificationSerializer
    
    def get_queryset(self):
        return AdminNotification.objects.filter(
            admin=self.request.user
        ).order_by('-created_at')[:50]


@api_view(['POST'])
@permission_classes([IsAdminUser])
def mark_notification_read(request, pk):
    """
    POST /api/admin/notifications/<id>/mark-read/
    Mark a notification as read.
    """
    try:
        notification = AdminNotification.objects.get(pk=pk, admin=request.user)
        notification.is_read = True
        notification.save()
        return Response({'status': 'success'})
    except AdminNotification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def mark_all_notifications_read(request):
    """
    POST /api/admin/notifications/mark-all-read/
    Mark all notifications as read for current admin.
    """
    AdminNotification.objects.filter(admin=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'success'})


class SystemMetricsView(generics.ListAPIView):
    """
    GET /api/admin/metrics/
    Get system metrics over time.
    """
    permission_classes = [IsAdminUser]
    serializer_class = SystemMetricsSerializer
    
    def get_queryset(self):
        # Get metrics for the last 24 hours
        time_limit = timezone.now() - timedelta(hours=24)
        return SystemMetrics.objects.filter(timestamp__gte=time_limit).order_by('-timestamp')
