from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        COLLECTOR = 'COLLECTOR', 'Collector' # Formerly Provider (Driver)
        SELLER = 'SELLER', 'Disposer'       # Formerly Collector (Waste Generator)
        RECYCLER = 'RECYCLER', 'Recycler' # New Role (Buyer)
        ADMIN = 'ADMIN', 'Administrator' # New Role for Staff

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SELLER, db_index=True)
    
    # Collector (Driver) specific fields
    vehicle_type = models.CharField(max_length=50, blank=True, null=True)
    license_plate = models.CharField(max_length=20, blank=True, null=True)

    # Recycler (Company/Individual) specific fields
    company_name = models.CharField(max_length=100, blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    national_id = models.CharField(max_length=50, blank=True, null=True)
    
    # Common fields
    phone_number = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    city = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    is_verified = models.BooleanField(default=False)
    
    # Live Location & Status
    current_lat = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    
    # Support Role
    is_support = models.BooleanField(default=False)

    def __str__(self):
        return self.username

class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    def is_valid(self):
        from django.utils import timezone
        return self.otp and self.expires_at > timezone.now()

    def __str__(self):
        return f"OTP for {self.user.username}"
