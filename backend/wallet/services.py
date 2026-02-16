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
    def verify_pin(wallet, pin):
        """
        Verify wallet PIN using Django's hasher.
        """
        from django.contrib.auth.hashers import check_password
        from django.utils import timezone
        
        if wallet.is_pin_locked:
            raise ValueError(f"Wallet PIN is locked until {wallet.pin_locked_until}. Too many failed attempts.")
            
        if not wallet.pin:
            raise ValueError("Wallet PIN is not set.")
            
        if check_password(pin, wallet.pin):
            # Reset attempts on success
            if wallet.pin_attempts > 0:
                wallet.pin_attempts = 0
                wallet.save()
            return True
        
        # Increment attempts on failure
        wallet.pin_attempts += 1
        if wallet.pin_attempts >= 5:
            # Lock for 30 minutes
            wallet.pin_locked_until = timezone.now() + timezone.timedelta(minutes=30)
            wallet.save()
            raise ValueError("Too many failed attempts. Wallet PIN locked for 30 minutes.")
        
        wallet.save()
        return False

    @staticmethod
    def set_pin(wallet, pin):
        """
        Set or update wallet PIN.
        """
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        wallet.pin = make_password(pin)
        wallet.last_pin_change = timezone.now()
        wallet.save()

    @staticmethod
    def request_withdrawal(user, amount, phone_number, network, account_name, pin=None, otp=None):
        """
        Request a withdrawal from the user's wallet.
        """
        from .models import SystemConfig
        if not SystemConfig.get_bool('GLOBAL_WITHDRAWAL_ENABLED', default=True):
            raise ValueError("Withdrawals are temporarily disabled by the system administrator.")
            
        from django.utils import timezone
        from django.db.models import Sum
        
        amount = Decimal(str(amount))
        
        with transaction.atomic():
            wallet, created = Wallet.objects.select_for_update().get_or_create(user=user)
            
            if wallet.is_frozen:
                raise ValueError("Your wallet is frozen. Please contact support.")

            # 4. Cooldown Checks
            # Rule: After PIN change (24h cooldown)
            if wallet.last_pin_change:
                cooldown_end = wallet.last_pin_change + timezone.timedelta(hours=24)
                if timezone.now() < cooldown_end:
                     raise ValueError(f"Withdrawal cooled down until {cooldown_end} due to recent PIN change.")

            # Rule: New Account Cooldown (e.g., 48h)
            account_cooldown_end = user.date_joined + timezone.timedelta(hours=48)
            if timezone.now() < account_cooldown_end:
                 raise ValueError(f"New accounts must wait 48 hours before first withdrawal. Cooldown ends {account_cooldown_end}.")

            # 1. Verify PIN
            if not WalletService.verify_pin(wallet, pin):
                 raise ValueError("Invalid wallet PIN.")
            
            # 2. Verify OTP (Logic to be implemented/called here)
            # if not verify_withdrawal_otp(user, otp):
            #     raise ValueError("Invalid withdrawal OTP.")

            # 3. Check Limits
            if amount > wallet.transaction_withdrawal_limit:
                raise ValueError(f"Amount exceeds per-transaction limit of {wallet.currency} {wallet.transaction_withdrawal_limit}")

            # Check daily limit
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            daily_total = Transaction.objects.filter(
                wallet=wallet,
                transaction_type='WITHDRAWAL',
                created_at__gte=today_start,
                status__in=['PENDING', 'COMPLETED']
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            # amount is positive here, but stored as negative in DB for withdrawals
            # so we use abs() or just be careful
            if (abs(daily_total) + amount) > wallet.daily_withdrawal_limit:
                 raise ValueError(f"Daily withdrawal limit of {wallet.currency} {wallet.daily_withdrawal_limit} exceeded.")

            if wallet.balance < amount:
                raise ValueError("Insufficient wallet balance.")
                
            # Debit wallet immediately for pending withdrawal to reserve funds
            wallet.balance -= amount
            wallet.save()
            
            description = f"Payout to {phone_number} ({network}) - {account_name}"
            
            # Create Transaction Record
            txn =  Transaction.objects.create(
                wallet=wallet,
                amount=-amount,
                transaction_type='WITHDRAWAL',
                status='PENDING',
                description=description,
                reference=uuid.uuid4()
            )

            # Send SMS Notification
            try:
                from users.sms_service import send_withdrawal_sms
                send_withdrawal_sms(phone_number, amount, wallet.currency)
            except Exception as e:
                # Log but don't fail the transaction if SMS fails
                logger.error(f"Failed to send withdrawal SMS to {phone_number}: {e}")

            return txn

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
