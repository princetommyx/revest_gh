from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        PROVIDER = 'PROVIDER', 'Provider'
        COLLECTOR = 'COLLECTOR', 'Collector'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PROVIDER)
    
    # Collector specific fields
    vehicle_type = models.CharField(max_length=50, blank=True, null=True)
    license_plate = models.CharField(max_length=20, blank=True, null=True)
    
    # Live Location & Status
    current_lat = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    
    # Support Role
    is_support = models.BooleanField(default=False)

    def __str__(self):
        return self.username
