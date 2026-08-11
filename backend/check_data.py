import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revesta_backend.settings")
django.setup()

from market.models import Listing
from logistics.models import PickupRequest
from users.models import User

print(f"Total Users: {User.objects.count()}")
print(f"Total Listings: {Listing.objects.count()}")
print(f"Total PickupRequests: {PickupRequest.objects.count()}")
print(f"Pending PickupRequests: {PickupRequest.objects.filter(status='PENDING').count()}")
print(f"Users by Role: {list(User.objects.values('role').annotate(count=django.db.models.Count('id')))}")
