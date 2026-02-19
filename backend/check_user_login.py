import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User
from django.db.models import Q

phone = '0208842410'
print(f"Checking for phone: {phone}")

users = User.objects.filter(Q(phone_number__icontains=phone[-9:]) | Q(username=phone))
if users.exists():
    for user in users:
        print(f"Found User: ID={user.id}, Username={user.username}, Email={user.email}, Phone={user.phone_number}, Role={user.role}")
else:
    print("No user found with that phone number (or similar).")

# Also list recent users
print("\nRecent 5 users:")
for user in User.objects.all().order_by('-date_joined')[:5]:
    print(f"ID={user.id}, Username={user.username}, Email={user.email}, Phone={user.phone_number}, Date={user.date_joined}")
