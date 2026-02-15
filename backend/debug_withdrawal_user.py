import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from wallet.models import Wallet

User = get_user_model()

try:
    user = User.objects.get(username='taylor')
    print(f"User found: {user.username} (ID: {user.id})")
    
    wallet, _ = Wallet.objects.get_or_create(user=user)
    print(f"Wallet Balance: {wallet.balance}")
    print(f"Wallet Frozen: {wallet.is_frozen}")
    
except User.DoesNotExist:
    print("User 'taylor' not found.")
except Exception as e:
    print(f"Error: {e}")
