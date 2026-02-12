import requests
import uuid
from decimal import Decimal
from django.conf import settings
from .models import Wallet, Transaction
from django.db import transaction

class WalletService:
    @staticmethod
    def check_eligibility_for_job(user):
        """
        Check if user (Collector) is eligible to accept a job.
        For now, returns True. Future: Check min balance.
        """
        return True, None

    @staticmethod
    def request_withdrawal(user, amount):
        """
        Request a withdrawal from the user's wallet.
        """
        amount = Decimal(str(amount))
        with transaction.atomic():
            wallet, created = Wallet.objects.select_for_update().get_or_create(user=user)
            
            if wallet.balance < amount:
                raise ValueError("Insufficient wallet balance.")
                
            # Debit wallet immediately for pending withdrawal to reserve funds
            wallet.balance -= amount
            wallet.save()
            
            # Create Transaction Record
            return Transaction.objects.create(
                wallet=wallet,
                amount=-amount,
                transaction_type='WITHDRAWAL',
                status='PENDING',
                description="Payout Request",
                reference=uuid.uuid4()
            )

    @staticmethod
    def process_job_completion(pickup_request):
        """
        Handle payment distribution when a job is completed.
        """
        if pickup_request.payment_method == 'DIGITAL' and pickup_request.actual_price:
             amount = pickup_request.actual_price
             collector = pickup_request.collector
             
             if not collector:
                 return

             with transaction.atomic():
                 # Credit Collector
                 collector_wallet, _ = Wallet.objects.get_or_create(user=collector)
                 collector_wallet.balance += amount
                 collector_wallet.save()
                 
                 Transaction.objects.create(
                     wallet=collector_wallet,
                     pickup=pickup_request,
                     amount=amount,
                     transaction_type='JOB_EARNING',
                     status='COMPLETED',
                     description=f"Earning for Job #{pickup_request.id}"
                 )

class PaystackService:
    @staticmethod
    def initialize_transaction(email, amount):
        """
        Initialize a transaction with Paystack.
        """
        secret_key = settings.PAYSTACK_SECRET_KEY
        headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
        }
        
        # Paystack amount is in kobo/pesewas
        amount_kobo = int(float(amount) * 100)
        
        data = {
            "email": email,
            "amount": amount_kobo,
            "currency": "GHS",
            "channels": ["mobile_money", "card"],
            # "callback_url": "https://standard.paystack.co/close" # Standard close URL
            # We can use a custom scheme if we wanted deep linking, but standard is fine for interception
        }
        
        try:
            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'status': False, 'message': str(e)}

    @staticmethod
    def verify_transaction(reference, amount, user):
        """
        Verifies a transaction with Paystack and credits the user's wallet.
        """
        secret_key = settings.PAYSTACK_SECRET_KEY
        headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
        }
        
        try:
            response = requests.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            
            if data['status'] and data['data']['status'] == 'success':
                verified_amount = data['data']['amount'] / 100  # Paystack returns kobo/pesewas
                
                # Check if amount matches (optional but recommended)
                # if float(verified_amount) != float(amount):
                #     return False, "Amount mismatch"

                # Idempotency Check
                if Transaction.objects.filter(reference=reference).exists():
                    return True, "Transaction already processed"

                # Atomic Transaction to Credit Wallet
                with transaction.atomic():
                    wallet, _ = Wallet.objects.get_or_create(user=user)
                    
                    Transaction.objects.create(
                        wallet=wallet,
                        amount=verified_amount,
                        transaction_type='DEPOSIT',
                        status='COMPLETED',
                        description=f"Paystack Top-up: {reference}",
                        reference=reference
                    )
                    
                    wallet.balance += verified_amount
                    wallet.save()
                    
                return True, "Wallet credited successfully"
            
            return False, data['data'].get('gateway_response', 'Verification failed')
            
        except requests.exceptions.RequestException as e:
            return False, str(e)
