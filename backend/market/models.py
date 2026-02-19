from django.db import models
from django.conf import settings

class Listing(models.Model):
    TRACK_CHOICES = (
        ('A', 'Paid Disposal (General Waste)'),
        ('B', 'Value Buyback (Recyclables)'),
    )

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='listings')
    title = models.CharField(max_length=200)
    material_type = models.CharField(max_length=100) # e.g. Plastics, Metals
    track = models.CharField(max_length=1, choices=TRACK_CHOICES, default='A', db_index=True)
    description = models.TextField()
    quantity = models.CharField(max_length=100) # e.g. "50kg" or "2 bags"
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) # Fee (A) or Incentive (B)
    is_free = models.BooleanField(default=False)
    location = models.CharField(max_length=255) # Text location for now
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    image = models.ImageField(upload_to='listings/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class TrackAServiceFee(models.Model):
    """
    Service fees for Track A disposal.
    """
    category = models.CharField(max_length=100, unique=True, help_text="e.g. Organic, Hazardous, General")
    fee_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, default='bag', help_text="e.g. bag, kg, liter")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.category}: {self.fee_per_unit} GHS/{self.unit}"

class MaterialMarketPrice(models.Model):
    MATERIAL_CHOICES = (
        ('PET', 'PET Bottles'),
        ('HDPE', 'HDPE Plastic'),
        ('ALUMINUM', 'Aluminum Cans'),
        ('PAPER', 'Paper/Cardboard'),
        ('ELECTRONICS', 'E-Waste'),
        ('METALS', 'Scrap Metal'),
    )
    material_type = models.CharField(max_length=50, choices=MATERIAL_CHOICES, unique=True)
    price_per_kg = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_material_type_display()}: {self.price_per_kg} GHS/kg"
