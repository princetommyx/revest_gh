from django.db import models
from django.conf import settings

class Listing(models.Model):
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='listings')
    title = models.CharField(max_length=200)
    material_type = models.CharField(max_length=100) # e.g. Plastics, Metals
    description = models.TextField()
    quantity = models.CharField(max_length=100) # e.g. "50kg" or "2 bags"
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True) # Null if free
    is_free = models.BooleanField(default=False)
    location = models.CharField(max_length=255) # Text location for now
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    image = models.ImageField(upload_to='listings/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
