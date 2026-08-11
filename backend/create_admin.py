import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

User = get_user_model()
username = 'admin_test'
email = 'admin_test@example.com'
password = 'AdminPassword123'

user, created = User.objects.get_or_create(username=username, defaults={'email': email})
user.set_password(password)
user.is_staff = True
user.is_superuser = True
user.is_active = True
user.role = 'ADMIN'
user.save()

print(f"User '{username}' {'created' if created else 'updated'} successfully with password '{password}'")
