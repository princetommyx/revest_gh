from django.db import models
from django.conf import settings
from django.utils import timezone


class ActivityLog(models.Model):
    """
    Tracks all significant activities in the system for admin monitoring.
    """
    ACTION_TYPES = [
        ('USER_REGISTERED', 'User Registered'),
        ('USER_LOGIN', 'User Login'),
        ('ORDER_CREATED', 'Order Created'),
        ('ORDER_COMPLETED', 'Order Completed'),
        ('RIDE_REQUESTED', 'Ride Requested'),
        ('RIDE_STARTED', 'Ride Started'),
        ('RIDE_COMPLETED', 'Ride Completed'),
        ('PAYMENT_MADE', 'Payment Made'),
        ('USER_VERIFIED', 'User Verified'),
        ('USER_SUSPENDED', 'User Suspended'),
        ('SUPPORT_TICKET_CREATED', 'Support Ticket Created'),
        ('SUPPORT_TICKET_RESOLVED', 'Support Ticket Resolved'),
        ('WALLET_PIN_CHANGED', 'Wallet PIN Changed'),
        ('WITHDRAWAL_REQUESTED', 'WithdrawAL Requested'),
        ('SECURITY_ALERT', 'Security Alert'),
        ('ADMIN_ACTION', 'Admin Action'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )
    action = models.CharField(max_length=50, choices=ACTION_TYPES, db_index=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp', 'action']),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'System'
        return f"{user_str} - {self.get_action_display()} at {self.timestamp}"


class SupportTicket(models.Model):
    """
    Customer support tickets that can be managed by admins.
    """
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    
    CATEGORY_CHOICES = [
        ('GENERAL', 'General Inquiry'),
        ('TECHNICAL', 'Technical Issue'),
        ('PAYMENT', 'Payment Issue'),
        ('ORDER', 'Order Issue'),
        ('RIDE', 'Ride Issue'),
        ('ACCOUNT', 'Account Issue'),
        ('OTHER', 'Other'),
    ]
    
    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_tickets'
    )
    assigned_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets'
    )
    
    subject = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='GENERAL')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN', db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)  # For additional info like device, app version, etc.
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['assigned_admin', 'status']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.ticket_number:
            # Generate ticket number: TICKET-YYYYMMDD-XXXX
            from django.utils import timezone
            date_str = timezone.now().strftime('%Y%m%d')
            last_ticket = SupportTicket.objects.filter(
                ticket_number__startswith=f'TICKET-{date_str}'
            ).order_by('-ticket_number').first()
            
            if last_ticket:
                last_num = int(last_ticket.ticket_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.ticket_number = f'TICKET-{date_str}-{new_num:04d}'
        
        # Set resolved_at when status changes to RESOLVED
        if self.status == 'RESOLVED' and not self.resolved_at:
            self.resolved_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.ticket_number} - {self.subject}"


class AdminNotification(models.Model):
    """
    Notifications for admin users about important events.
    """
    NOTIFICATION_TYPES = [
        ('NEW_USER', 'New User Registration'),
        ('NEW_ORDER', 'New Order'),
        ('NEW_RIDE', 'New Ride Request'),
        ('SUPPORT_TICKET', 'New Support Ticket'),
        ('URGENT_ISSUE', 'Urgent Issue'),
        ('SYSTEM_ALERT', 'System Alert'),
    ]
    
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_notifications'
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True)  # Link to relevant page
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['admin', 'is_read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {'Read' if self.is_read else 'Unread'}"


class SystemMetrics(models.Model):
    """
    Periodic snapshots of system metrics for analytics.
    """
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # User metrics
    total_users = models.IntegerField(default=0)
    online_users = models.IntegerField(default=0)
    new_users_today = models.IntegerField(default=0)
    
    # Activity metrics
    active_orders = models.IntegerField(default=0)
    active_rides = models.IntegerField(default=0)
    completed_orders_today = models.IntegerField(default=0)
    completed_rides_today = models.IntegerField(default=0)
    
    # Support metrics
    open_tickets = models.IntegerField(default=0)
    resolved_tickets_today = models.IntegerField(default=0)
    
    # System health
    api_response_time_ms = models.FloatField(null=True, blank=True)
    database_connections = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'System Metrics'
    
    def __str__(self):
        return f"Metrics at {self.timestamp}"
