import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revesta_backend.settings")
django.setup()

from admin_dashboard.models import PromoCard

print("--- Promo Cards ---")
promos = PromoCard.objects.all()
print(f"Total PromoCards: {promos.count()}")
for p in promos:
    print(f"ID: {p.id} | Title: {p.title} | Role: {p.target_role} | Active: {p.is_active} | Order: {p.order}")
