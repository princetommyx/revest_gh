from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Wallet

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        try:
            Wallet.objects.create(user=instance)
        except Exception as e:
            # Log the error but don't prevent user creation
            print(f"Warning: Failed to create wallet for user {instance.username}: {e}")
