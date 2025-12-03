from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        COLLECTOR = 'COLLECTOR', 'Collector' # Formerly Provider (Driver)
        SELLER = 'SELLER', 'Seller'       # Formerly Collector (Waste Generator)
        RECYCLER = 'RECYCLER', 'Recycler' # New Role (Buyer)

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SELLER)
    
    # Collector (Driver) specific fields
    vehicle_type = models.CharField(max_length=50, blank=True, null=True)
    license_plate = models.CharField(max_length=20, blank=True, null=True)

    # Recycler (Company/Individual) specific fields
    company_name = models.CharField(max_length=100, blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    national_id = models.CharField(max_length=50, blank=True, null=True)
    
    # Common fields
    is_verified = models.BooleanField(default=False)
    
    # Live Location & Status
    current_lat = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    
    # Support Role
    is_support = models.BooleanField(default=False)

    def __str__(self):
        return self.username
