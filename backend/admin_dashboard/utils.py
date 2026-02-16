from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import AdminNotification

def send_admin_notification(title, message, type='INFO', link='', data=None):
    """
    Creates a notification in the DB and sends it via WebSocket to all connected admins.
    """
    # Create DB entry (we associate it with specific admins? Or just broadcast?)
    # For now, let's just broadcast the socket event. 
    # To save to DB properly, we'd need to know *which* admin, or create one for ALL admins.
    # A better approach for "System Alerts" is to create one record per active admin, 
    # or just broadcast and let the frontend show it as a toast.
    
    # Send to WebSocket
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        'admin_notifications',
        {
            'type': 'admin_notification',
            'message': message,
            'notification_type': type,
            'data': {
                'title': title,
                'link': link,
                **(data or {})
            }
        }
    )

def log_activity(user, action, details=None, request=None):
    """
    Utility to record an activity log entry.
    """
    from .models import ActivityLog
    
    ip = None
    ua = ''
    if request:
        # Simple IP detection
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        ua = request.META.get('HTTP_USER_AGENT', '')

    ActivityLog.objects.create(
        user=user,
        action=action,
        details=details or {},
        ip_address=ip,
        user_agent=ua
    )
