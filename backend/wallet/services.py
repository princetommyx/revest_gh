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
    def request_withdrawal(user, amount, phone_number, network, account_name):
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
            
            description = f"Payout to {phone_number} ({network}) - {account_name}"
            
            # Create Transaction Record
            return Transaction.objects.create(
                wallet=wallet,
                amount=-amount,
                transaction_type='WITHDRAWAL',
                status='PENDING',
                description=description,
                reference=uuid.uuid4()
            )

    @staticmethod
    def payout_seller_for_waste(pickup_request):
        """
        Transfers waste price from escrow to seller when collector arrives.
        """
        waste_amount = pickup_request.waste_price or 0
        if waste_amount <= 0:
            return

        listing = pickup_request.listing
        seller = listing.seller if listing else None
        
        if not seller:
            return

        with transaction.atomic():
            seller_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=seller)
            seller_wallet.balance += waste_amount
            seller_wallet.save()
            
            Transaction.objects.create(
                wallet=seller_wallet,
                pickup=pickup_request,
                amount=waste_amount,
                transaction_type='SALE_EARNING',
                status='COMPLETED',
                description=f"Waste pickup confirmed (Job #{pickup_request.id})"
            )

    @staticmethod
    def payout_collector_for_delivery(pickup_request):
        """
        Transfers delivery fee from escrow to collector when job is completed.
        """
        delivery_amount = pickup_request.delivery_fee or 0
        if delivery_amount <= 0:
            return

        collector = pickup_request.collector
        if not collector:
            return

        with transaction.atomic():
            collector_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=collector)
            collector_wallet.balance += delivery_amount
            collector_wallet.save()
            
            Transaction.objects.create(
                wallet=collector_wallet,
                pickup=pickup_request,
                amount=delivery_amount,
                transaction_type='JOB_EARNING',
                status='COMPLETED',
                description=f"Delivery Fee for Job #{pickup_request.id}"
            )

    @staticmethod
    def process_job_completion(pickup_request):
        """
        Legacy method or for non-split flows. 
        In the new flow, we call the granular methods above.
        """
        # For safety/backward compatibility, we just call the collector payout here
        # since seller payout should have happened at 'ARRIVED'
        WalletService.payout_collector_for_delivery(pickup_request)

class PaystackService:
    @staticmethod
    def initialize_transaction(user, amount, email=None):
        """
        Initialize a transaction with Paystack.
        """
        secret_key = settings.PAYSTACK_SECRET_KEY
        
        # Debug logging
        print(f"🔑 PAYSTACK_SECRET_KEY loaded: {'Yes' if secret_key else 'NO - THIS IS THE PROBLEM!'}")
        print(f"💰 Initializing payment: amount={amount}, email={email or user.email}")
        
        if not secret_key:
            print("❌ CRITICAL: Paystack secret key is not configured!")
            return {
                'status': False, 
                'message': 'Payment system not configured. Please contact support.'
            }
        
        headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
        }
        
        if not email:
            email = user.email

        # Paystack amount is in kobo/pesewas
        amount_kobo = int(float(amount) * 100)
        
        data = {
            "email": email,
            "amount": amount_kobo,
            "currency": "GHS",
            "channels": ["mobile_money", "card"],
            "callback_url": "https://standard.paystack.co/close",
            "metadata": {
                "user_id": user.id,
                "full_name": user.get_full_name() or user.username,
                "phone_number": getattr(user, 'phone_number', ''),
                "custom_fields": [
                    {
                        "display_name": "Mobile Number",
                        "variable_name": "mobile_number",
                        "value": getattr(user, 'phone_number', '')
                    }
                ]
            }
        }
        
        try:
            print(f"📤 Sending request to Paystack API...")
            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            result = response.json()
            print(f"✅ Paystack response: {result.get('status')}, Message: {result.get('message')}")
            return result
        except requests.exceptions.RequestException as e:
            print(f"❌ Paystack API Error: {str(e)}")
            return {'status': False, 'message': f'Payment initialization failed: {str(e)}'}

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
