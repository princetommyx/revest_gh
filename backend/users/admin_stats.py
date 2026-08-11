from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from .models import User
from logistics.models import PickupRequest
from admin_dashboard.serializers import UserSummarySerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_dashboard_stats(request):
    """
    Get comprehensive dashboard statistics for admin panel.
    Returns user counts by role, active users, and recent registrations.
    """
    now = timezone.now()
    today = now.date()
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)
    
    # Total users by role
    total_users = User.objects.count()
    collectors_count = User.objects.filter(role=User.Role.COLLECTOR).count()
    sellers_count = User.objects.filter(role=User.Role.SELLER).count()
    recyclers_count = User.objects.filter(role=User.Role.RECYCLER).count()
    
    # Active users (logged in within last 24 hours)
    active_users_count = User.objects.filter(
        last_login__gte=now - timedelta(hours=24)
    ).count()

    # Active Pickups (not completed or cancelled)
    active_pickups_count = PickupRequest.objects.exclude(
        status__in=['COMPLETED', 'CANCELLED']
    ).count()
    
    # New registrations 
    new_today = User.objects.filter(date_joined__date=today).count()
    new_this_week = User.objects.filter(date_joined__gte=last_7_days).count()
    new_this_month = User.objects.filter(date_joined__gte=last_30_days).count()
    
    # Online collectors (collectors who are currently online)
    online_collectors = User.objects.filter(
        role=User.Role.COLLECTOR, 
        is_online=True
    ).count()
    
    # Calculate growth percentages
    prev_month_start = last_30_days - timedelta(days=30)
    prev_month_users = User.objects.filter(
        date_joined__gte=prev_month_start,
        date_joined__lt=last_30_days
    ).count()
    
    # Growth calculation
    if prev_month_users > 0:
        growth_percentage = round(((new_this_month - prev_month_users) / prev_month_users) * 100, 1)
    else:
        growth_percentage = 100.0 if new_this_month > 0 else 0.0
    
    return Response({
        'total_users': total_users,
        'collectors': collectors_count,
        'sellers': sellers_count,  # Disposers
        'recyclers': recyclers_count,
        'active_users': active_users_count,
        'active_pickups': active_pickups_count,
        'new_registrations': {
            'today': new_today,
            'this_week': new_this_week,
            'this_month': new_this_month
        },
        'online_collectors': online_collectors,
        'growth_percentage': growth_percentage
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def recent_users(request):
    """
    Get recently registered users (last 10).
    """
    users = User.objects.order_by('-date_joined')[:10]
    
    serializer = UserSummarySerializer(users, many=True)
    return Response(serializer.data)
