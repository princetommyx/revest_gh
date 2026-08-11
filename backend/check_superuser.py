import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User

def check_and_create_superuser():
    if User.objects.filter(is_superuser=True).exists():
        admin_user = User.objects.filter(is_superuser=True).first()
        print(f"Superuser exists: {admin_user.username} (Email: {admin_user.email})")
    else:
        print("No superuser found.")
        try:
            # Check if user 'admin' exists but isn't a superuser
            if User.objects.filter(username='admin').exists():
                print("User 'admin' exists but is not a superuser. Promoting...")
                u = User.objects.get(username='admin')
                u.is_superuser = True
                u.is_staff = True
                u.save()
                print("User 'admin' promoted to superuser.")
            else:
                print("Creating default 'admin'...")
                User.objects.create_superuser('admin', 'admin@example.com', 'admin')
                print("Superuser 'admin' created. Password: 'admin'")
        except Exception as e:
            print(f"Error creating superuser: {e}")

if __name__ == "__main__":
    check_and_create_superuser()
