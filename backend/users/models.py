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
    business_certification = models.ImageField(upload_to='certifications/', blank=True, null=True)
    
    # Common fields
    phone_number = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    city = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    is_verified = models.BooleanField(default=False)
    
    # Live Location & Status
    current_lat = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    
    # Authentication Provider tracking
    class AuthProvider(models.TextChoices):
        EMAIL = 'EMAIL', 'Email'
        GOOGLE = 'GOOGLE', 'Google'
    
    auth_provider = models.CharField(
        max_length=20, 
        choices=AuthProvider.choices, 
        default=AuthProvider.EMAIL,
        db_index=True
    )
    google_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    profile_picture_url = models.URLField(max_length=500, blank=True, null=True)

    # Support Role
    is_support = models.BooleanField(default=False)
    
    # Notifications
    expo_push_token = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    # Activity tracking - powers daily re-engagement notifications
    last_active_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_reengagement_sent_at = models.DateTimeField(null=True, blank=True)

    # Security & Device Binding
    last_device_id = models.CharField(max_length=255, blank=True, null=True)
    mfa_enabled = models.BooleanField(default=False)

    # Self-service account deactivation. Deliberately separate from is_active:
    # is_active gates login entirely (used for deletion/bans) and stays True
    # here so a deactivated user can still log back in - doing so clears this
    # flag automatically (see VerifyLoginOTPView), the same "log back in to
    # reactivate" pattern most consumer apps use.
    is_deactivated = models.BooleanField(default=False)
    
    def __str__(self):
        return self.username

class Notification(models.Model):
    class Urgency(models.TextChoices):
        NORMAL = 'NORMAL', 'Normal'
        URGENT = 'URGENT', 'Urgent'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    urgency = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.NORMAL)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"

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

class PhoneVerification(models.Model):
    phone_number = models.CharField(max_length=20, db_index=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)

    def is_valid(self):
        from django.utils import timezone
        return self.otp and self.expires_at > timezone.now()

    def is_recently_verified(self):
        """Whether this number was successfully verified within the registration window."""
        from django.utils import timezone
        from datetime import timedelta
        return self.is_verified and self.created_at > timezone.now() - timedelta(minutes=30)

    def __str__(self):
        return f"Verification for {self.phone_number}"

class LoginOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    
    def is_valid(self):
        from django.utils import timezone
        return not self.is_verified and self.expires_at > timezone.now()

    def __str__(self):
        return f"Login OTP for {self.user.username}"


class IdentityVerification(models.Model):
    class Status(models.TextChoices):
        UNVERIFIED = 'UNVERIFIED', 'Unverified'
        PENDING = 'PENDING', 'Pending Review'
        VERIFIED = 'VERIFIED', 'Verified'
        REJECTED = 'REJECTED', 'Rejected'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='identity_verification')
    id_front_image = models.ImageField(upload_to='kyc/id_front/')
    id_back_image = models.ImageField(upload_to='kyc/id_back/')
    selfie_image = models.ImageField(upload_to='kyc/selfie/')
    
    # Store the encrypted Ghana Card PIN
    id_number_encrypted = models.BinaryField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UNVERIFIED, db_index=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KYC for {self.user.username} - {self.status}"


class UserFeedback(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='feedbacks')
    content = models.TextField()
    category = models.CharField(max_length=50, default='Improvement') # Improvement, Bug, Feature Request
    created_at = models.DateTimeField(auto_now_add=True)
    is_reviewed = models.BooleanField(default=False)

    def __str__(self):
        return f"Feedback from {self.user.username if self.user else 'Anonymous'} - {self.created_at}"

