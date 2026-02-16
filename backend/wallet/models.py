from django.db import models
from django.conf import settings
import uuid
from decimal import Decimal

class CommissionRule(models.Model):
    """
    Configuration for commission rates per waste type.
    """
    material_type = models.CharField(max_length=100, unique=True, help_text="Must match material_type in PickupRequest")
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=20.00, help_text="Percentage (e.g., 20.00 for 20%)")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.material_type} - {self.commission_percent}%"

class Wallet(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='GHS')
    is_frozen = models.BooleanField(default=False, help_text="Lock wallet for suspicious activity")
    trust_score = models.IntegerField(default=100, help_text="0-100 score based on payment history")
    
    # Security Fields
    pin = models.CharField(max_length=128, blank=True, null=True, help_text="Hashed wallet PIN")
    pin_attempts = models.IntegerField(default=0)
    pin_locked_until = models.DateTimeField(null=True, blank=True)
    last_pin_change = models.DateTimeField(null=True, blank=True)
    
    # Limits
    daily_withdrawal_limit = models.DecimalField(max_digits=12, decimal_places=2, default=5000.00)
    transaction_withdrawal_limit = models.DecimalField(max_digits=12, decimal_places=2, default=2000.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_pin_locked(self):
        from django.utils import timezone
        if self.pin_locked_until and self.pin_locked_until > timezone.now():
            return True
        return False

    def __str__(self):
        return f"{self.user.username}'s Wallet ({self.currency} {self.balance})"
    
    def calculate_balance_from_ledger(self):
        """
        Recalculates balance from all COMPLETED transactions.
        Also deducts PENDING withdrawals to prevent double-spending.
        This is the single source of truth.
        """
        credits = self.transactions.filter(
            status='COMPLETED', 
            amount__gt=0
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        
        debits = self.transactions.filter(
            models.Q(status='COMPLETED', amount__lt=0) |
            models.Q(status='PENDING', transaction_type='WITHDRAWAL')
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        
        # Debits are negative in the DB, so we sum them correctly
        return credits + debits 

class SystemConfig(models.Model):
    key = models.CharField(max_length=50, unique=True)
    value = models.CharField(max_length=100) # Can be cast to bool/int
    description = models.CharField(max_length=200, blank=True)
    
    @staticmethod
    def get_bool(key, default=False):
        try:
            config = SystemConfig.objects.get(key=key)
            return config.value.lower() == 'true'
        except SystemConfig.DoesNotExist:
            return default

    def __str__(self):
        return f"{self.key}: {self.value}" 

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('DEPOSIT', 'Deposit'), # Manual top-up
        ('WITHDRAWAL', 'Withdrawal'), # Payout to user
        ('JOB_EARNING', 'Job Earning'), # Net earning from digital payment
        ('SALE_EARNING', 'Sale Earning'), # Earning from selling waste
        ('COMMISSION_DEDUCTION', 'Commission Deduction'), # Revesta's cut (from Cash or Digital)
        ('PENALTY', 'Penalty'), # Admin fine
        ('REFUND', 'Refund'),
    )
    
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    # Link to the job
    pickup = models.ForeignKey('logistics.PickupRequest', on_delete=models.SET_NULL, null=True, blank=True, related_name='wallet_transactions')
    
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Negative for debits, Positive for credits")
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='COMPLETED')
    description = models.TextField(blank=True)
    reference = models.CharField(max_length=100, unique=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"
