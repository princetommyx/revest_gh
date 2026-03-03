import os
import django
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Ensures the system user "revesta" exists with a wallet.'

    def handle(self, *args, **options):
        User = get_user_model()
        from wallet.models import Wallet
        
        username = 'revesta'
        email = 'finance@revesta.co'
        
        user, created = User.objects.get_or_create(
            username=username, 
            defaults={
                'email': email,
                'role': 'ADMIN',
                'is_staff': True
            }
        )
        
        if created:
            user.set_unusable_password()
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created platform user "{username}"'))
        else:
            self.stdout.write(f'Platform user "{username}" already exists.')
            
        wallet, w_created = Wallet.objects.get_or_create(user=user)
        if w_created:
            self.stdout.write(self.style.SUCCESS(f'Created wallet for "{username}"'))
        else:
            self.stdout.write(f'Wallet for "{username}" already exists.')
