from django.db import models
from django.conf import settings

class PickupRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('ARRIVED', 'Arrived'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    TRACK_CHOICES = (
        ('A', 'Safe Disposal (Pay to Clear)'),
        ('B', 'Sell Recyclables (Earn Cash)'),
    )

    BAG_SIZE_CHOICES = (
        ('SMALL', 'Small Bag'),
        ('MEDIUM', 'Medium Bag'),
        ('LARGE', 'Large Bag'),
        ('XLARGE', 'Extra Large / Bulk'),
    )

    provider = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pickup_requests')
    collector = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_pickups')
    material_type = models.CharField(max_length=100)
    track_type = models.CharField(max_length=1, choices=TRACK_CHOICES, default='A')
    
    # Track A Fields
    bag_size = models.CharField(max_length=20, choices=BAG_SIZE_CHOICES, null=True, blank=True)
    
    # Track B Fields
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Verification Fields
    verification_photo = models.ImageField(upload_to='verifications/', null=True, blank=True)
    manual_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ai_verified_weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    verification_data = models.JSONField(null=True, blank=True) # AI analysis results
    
    quantity_estimate = models.CharField(max_length=100)
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # For live tracking (simplified)
    current_lat = models.FloatField(null=True, blank=True)
    current_lon = models.FloatField(null=True, blank=True)

    # Destination Fields (Recycling Company)
    destination_latitude = models.FloatField(null=True, blank=True)
    destination_longitude = models.FloatField(null=True, blank=True)
    destination_address = models.CharField(max_length=255, null=True, blank=True)

    # Pricing Fields
    estimated_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    waste_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    distance_km = models.FloatField(null=True, blank=True)
    duration_min = models.FloatField(null=True, blank=True)
    
    # Link to Original Listing (to identify Seller)
    listing = models.ForeignKey('market.Listing', on_delete=models.SET_NULL, null=True, blank=True, related_name='pickup_requests')
    
    PAYMENT_METHOD_CHOICES = (
        ('CASH', 'Cash'),
        ('DIGITAL', 'Digital (In-App)'),
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='CASH')

    def __str__(self):
        return f"{self.get_track_type_display()} - {self.material_type} - {self.status}"
