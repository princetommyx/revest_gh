import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from market.models import Listing

print("--- RECENT LISTINGS ---")
listings = Listing.objects.all().order_by('-created_at')[:5]
if not listings:
    print("No listings found.")
else:
    for l in listings:
        print(f"ID: {l.id} | Title: {l.title} | Image: {l.image} | Created: {l.created_at}")
print("-----------------------")
