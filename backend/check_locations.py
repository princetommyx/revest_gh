import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revesta_backend.settings")
django.setup()

from market.models import Listing

locations = Listing.objects.values_list('location', flat=True).distinct()
print(f"Distinct Locations: {list(locations)}")
