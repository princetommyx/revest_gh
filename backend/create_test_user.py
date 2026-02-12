import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from wallet.models import Wallet

User = get_user_model()

def create_test_user():
    username = "testuser"
    email = "test@revesta.com"
    password = "password123"
    
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        print(f"User {username} already exists.")
    else:
        user = User.objects.create_user(username=username, email=email, password=password)
        user.role = 'COLLECTOR' # Assuming collector can withdraw
        user.save()
        print(f"User {username} created.")

    wallet, created = Wallet.objects.get_or_create(user=user)
    wallet.balance = Decimal('500.00')
    wallet.save()
    print(f"Wallet balance set to {wallet.balance} for {username}")

if __name__ == "__main__":
    create_test_user()
