import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User

def check_users():
    print("Checking recent users...")
    users = User.objects.all().order_by('-date_joined')[:5]
    for u in users:
        print(f"User: {u.username}, Role: {u.role}, Staff: {u.is_staff}, Super: {u.is_superuser}")

if __name__ == "__main__":
    check_users()
