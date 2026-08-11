import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revesta_backend.settings")
django.setup()

from admin_dashboard.models import PromoCard
from users.models import User

# Activate all promos for testing
PromoCard.objects.all().update(is_active=True)
print("All PromoCards activated.")

# Check last user role
user = User.objects.order_by('-date_joined').first()
if user:
    print(f"Last User: {user.username} | Role: {user.role}")

# Check what SELLER would see
role = 'SELLER'
promos = PromoCard.objects.filter(is_active=True).filter(django.db.models.Q(target_role=role) | django.db.models.Q(target_role='ALL'))
print(f"Promos for {role}: {list(promos.values_list('title', flat=True))}")

# Check what RECYCLER would see
role = 'RECYCLER'
promos = PromoCard.objects.filter(is_active=True).filter(django.db.models.Q(target_role=role) | django.db.models.Q(target_role='ALL'))
print(f"Promos for {role}: {list(promos.values_list('title', flat=True))}")
