import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User

def reset_password():
    try:
        if User.objects.filter(username='admin').exists():
            u = User.objects.get(username='admin')
            u.set_password('admin123')
            u.save()
            print("Success: Password for 'admin' set to 'admin123'")
        else:
            # Should hopefully not happen given previous steps, but just in case
            User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
            print("Success: Created new superuser 'admin' with password 'admin123'")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_password()
