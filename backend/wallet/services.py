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

            # KYC Verification Check
            if user.role in ['COLLECTOR', 'RECYCLER']:
                if not hasattr(user, 'identity_verification') or user.identity_verification.status != 'VERIFIED':
                    raise ValueError("You must complete Identity Verification (KYC) before withdrawing funds.")

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

    @staticmethod
    def lock_escrow(pickup_request, payer, amount, track_type='A'):
        """
        Locks funds in escrow for a pickup request.
        """
        from .models import Escrow, Transaction
        from django.db import transaction
        
        with transaction.atomic():
            payer_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=payer)
            
            # For Track A, the provider (disposer) is the payer
            # For Track B, usually a Recycler or a System fund is the payer (to be expanded)
            
            if payer_wallet.balance < amount:
                raise ValueError("Insufficient funds to lock in escrow.")
                
            payer_wallet.balance -= amount
            payer_wallet.save()
            
            escrow = Escrow.objects.create(
                pickup=pickup_request,
                payer=payer,
                amount=amount,
                status='HELD',
                description=f"Escrow for {'Disposal' if track_type == 'A' else 'Recycling'} Job #{pickup_request.id}"
            )
            
            Transaction.objects.create(
                wallet=payer_wallet,
                pickup=pickup_request,
                amount=-amount,
                transaction_type='ESCROW_LOCK',
                status='COMPLETED',
                description=f"Locked funds in escrow for Job #{pickup_request.id}"
            )
            return escrow

    @staticmethod
    def process_track_a_completion(pickup_request):
        """
        Track A - Paid Disposal Logic:
        Release escrow: Collector (80%) + Platform (20%).
        """
        from .models import Escrow, Transaction
        
        try:
            escrow = Escrow.objects.get(pickup=pickup_request, status='HELD')
        except Escrow.DoesNotExist:
            # Fallback if no escrow but job completed (e.g. manual payment handled elsewhere)
            return

        total_fee = escrow.amount
        collector_share = (total_fee * Decimal('0.80')).quantize(Decimal('0.01'))
        platform_commission = total_fee - collector_share

        collector = pickup_request.collector
        if not collector:
            return

        with transaction.atomic():
            # 1. Payout Collector
            collector_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=collector)
            collector_wallet.balance += collector_share
            collector_wallet.save()
            
            Transaction.objects.create(
                wallet=collector_wallet,
                pickup=pickup_request,
                amount=collector_share,
                transaction_type='ESCROW_RELEASE',
                status='COMPLETED',
                description=f"Logistics Share for Job #{pickup_request.id} (Safe Disposal)"
            )

            # 2. Payout Platform (Revesta Commission)
            from django.contrib.auth import get_user_model
            User = get_user_model()
            platform_user = User.objects.filter(username='revesta').first()
            if platform_user:
                platform_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=platform_user)
                platform_wallet.balance += platform_commission
                platform_wallet.save()
                Transaction.objects.create(
                    wallet=platform_wallet,
                    pickup=pickup_request,
                    amount=platform_commission,
                    transaction_type='COMMISSION_DEDUCTION',
                    status='COMPLETED',
                    description=f"Commission for Job #{pickup_request.id} (Disposal Fee)"
                )
            
            # Mark Escrow as Released
            escrow.status = 'RELEASED'
            escrow.payee = collector
            escrow.save()

    @staticmethod
    def process_track_b_completion(pickup_request):
        """
        Track B - Value Buyback Logic:
        Release escrow: Disposer (Sachets/Bottles Price) + Collector (Logistics) + Platform.
        If no escrow exists (Seller-initiated), draw from platform wallet.
        """
        from .models import Escrow, Transaction
        from django.db import transaction
        
        waste_price = pickup_request.waste_price or Decimal('0.00')
        delivery_fee = pickup_request.delivery_fee or Decimal('0.00')
        total_value = escrow.amount if escrow else (waste_price + delivery_fee)
        
        # Flat Rate Logic (Requested by User)
        # Seller: Waste Price - 2
        # Collector: Delivery Fee - 5
        # Platform: Remainder (Includes 2 from Seller + 5 from Collector + 5 from Recycler if involved)
        
        waste_price = pickup_request.waste_price or Decimal('0.00')
        delivery_fee = pickup_request.delivery_fee or Decimal('0.00')
        
        disposer_incentive = (waste_price - Decimal('2.00')).max(Decimal('0.00'))
        collector_logistics = (delivery_fee - Decimal('5.00')).max(Decimal('0.00'))
        platform_commission = total_value - disposer_incentive - collector_logistics

        disposer = pickup_request.provider
        collector = pickup_request.collector

        with transaction.atomic():
            # If no escrow, we debit from Revesta system wallet to pay others
            from django.contrib.auth import get_user_model
            User = get_user_model()
            platform_user = User.objects.filter(username='revesta').first()
            
            if not escrow and platform_user:
                platform_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=platform_user)
                # Platform user pays the disposer_incentive and collector_logistics
                payout_total = disposer_incentive + collector_logistics
                if platform_wallet.balance < payout_total:
                    # In production, we might want to flag this but for now we proceed
                    # Or we could raise an error if system wallet is empty
                    pass
                platform_wallet.balance -= payout_total
                platform_wallet.save()

            # 1. Payout Disposer (If not already paid early)
            if not pickup_request.is_disposer_paid:
                disposer_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=disposer)
                disposer_wallet.balance += disposer_incentive
                disposer_wallet.save()
                Transaction.objects.create(
                    wallet=disposer_wallet,
                    pickup=pickup_request,
                    amount=disposer_incentive,
                    transaction_type='ESCROW_RELEASE',
                    status='COMPLETED',
                    description=f"Waste Incentive for Job #{pickup_request.id} (Track B)"
                )

            # 2. Payout Collector
            if collector:
                collector_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=collector)
                collector_wallet.balance += collector_logistics
                collector_wallet.save()
                Transaction.objects.create(
                    wallet=collector_wallet,
                    pickup=pickup_request,
                    amount=collector_logistics,
                    transaction_type='ESCROW_RELEASE',
                    status='COMPLETED',
                    description=f"Logistics Share for Job #{pickup_request.id} (Sell Recyclables)"
                )

            # 3. Payout Platform (Revesta Commission)
            # If escrow existed, platform_commission is the remainder. 
            # If NO escrow, the platform already "paid" the others, so we just log the commission.
            if platform_user:
                platform_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=platform_user)
                if escrow:
                    platform_wallet.balance += platform_commission
                    platform_wallet.save()
                
                Transaction.objects.create(
                    wallet=platform_wallet,
                    pickup=pickup_request,
                    amount=platform_commission,
                    transaction_type='COMMISSION_DEDUCTION',
                    status='COMPLETED',
                    description=f"Commission for Job #{pickup_request.id} (Buyback Value)"
                )
            
            # Mark Escrow as Released
            if escrow:
                escrow.status = 'RELEASED'
                escrow.payee = disposer # Principal payee is the disposer for Track B
                escrow.save()

    @staticmethod
    def process_track_c_completion(pickup_request):
        """
        Track C - Buy Materials Logic (Recycler buying from Seller):
        Release escrow: Seller (Material Value) + Collector (Delivery Fee) + Revesta (Commission).
        """
        from .models import Escrow, Transaction
        from decimal import Decimal
        from django.db import transaction
        
        try:
            escrow = Escrow.objects.get(pickup=pickup_request, status='HELD')
        except Escrow.DoesNotExist:
            return

        total_held = escrow.amount
        
        # Split logic:
        # Payer is Recycler.
        # Total logic: Material Price goes entirely to Seller (minus some commission if applicable)
        # Delivery Fee goes entirely to Collector (minus some commission if applicable)
        # Wait, the simplest logic is:
        # Let's say Revesta takes 10% of total transfer. The rest goes to Seller & Collector relative to their share.
        # But pickup_request has `waste_price` and `delivery_fee`.
        
        material_value = pickup_request.waste_price or Decimal('0.00')
        delivery_fee = pickup_request.delivery_fee or Decimal('0.00')
        
        # Flat Rate Logic (Requested by User)
        # Seller: Waste Price - 2
        # Collector: Delivery Fee - 5
        # Platform: Remainder
        
        seller_share = (material_value - Decimal('2.00')).max(Decimal('0.00'))
        collector_share = (delivery_fee - Decimal('5.00')).max(Decimal('0.00'))
        platform_commission = total_held - seller_share - collector_share

        seller = pickup_request.provider  # For Track C, provider is the Seller
        collector = pickup_request.collector

        with transaction.atomic():
            # 1. Payout Seller (If not already paid early)
            if seller and seller_share > 0 and not pickup_request.is_disposer_paid:
                seller_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=seller)
                seller_wallet.balance += seller_share
                seller_wallet.save()
                Transaction.objects.create(
                    wallet=seller_wallet,
                    pickup=pickup_request,
                    amount=seller_share,
                    transaction_type='ESCROW_RELEASE',
                    status='COMPLETED',
                    description=f"Material Sale for Job #{pickup_request.id} (Track C)"
                )

            # 2. Payout Collector
            if collector and collector_share > 0:
                collector_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=collector)
                collector_wallet.balance += collector_share
                collector_wallet.save()
                Transaction.objects.create(
                    wallet=collector_wallet,
                    pickup=pickup_request,
                    amount=collector_share,
                    transaction_type='ESCROW_RELEASE',
                    status='COMPLETED',
                    description=f"Logistics Share for Job #{pickup_request.id} (Material Delivery)"
                )

            # 3. Payout Platform (Revesta Commission)
            if platform_commission > 0:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                platform_user = User.objects.filter(username='revesta').first()
                if platform_user:
                    platform_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=platform_user)
                    platform_wallet.balance += platform_commission
                    platform_wallet.save()
                    Transaction.objects.create(
                        wallet=platform_wallet,
                        pickup=pickup_request,
                        amount=platform_commission,
                        transaction_type='COMMISSION_DEDUCTION',
                        status='COMPLETED',
                        description=f"Commission for Job #{pickup_request.id} (Track C)"
                    )
            
            # Mark Escrow as Released
            escrow.status = 'RELEASED'
            escrow.payee = seller # Principal payee is the seller
            escrow.save()

    @staticmethod
    def process_disposer_early_payout(pickup_request):
        """
        Immediately pays the Disposer/Seller their waste price (minus ₵2) 
        as soon as the Collector marks the job as ARRIVED.
        Applicable for Track B and Track C.
        """
        from .models import Escrow, Transaction, Wallet
        from django.db import transaction
        from decimal import Decimal
        from django.contrib.auth import get_user_model
        User = get_user_model()

        if pickup_request.is_disposer_paid:
            return

        waste_price = pickup_request.waste_price or Decimal('0.00')
        disposer_incentive = (waste_price - Decimal('2.00')).max(Decimal('0.00'))
        
        if disposer_incentive <= 0:
            return

        disposer = pickup_request.provider if pickup_request.track_type == 'C' else pickup_request.provider
        # Actually in both cases provider is the disposer/seller for now.
        
        escrow = Escrow.objects.filter(pickup=pickup_request, status='HELD').first()
        platform_user = User.objects.filter(username='revesta').first()

        with transaction.atomic():
            # 1. Payout Disposer
            disposer_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=disposer)
            disposer_wallet.balance += disposer_incentive
            disposer_wallet.save()
            
            Transaction.objects.create(
                wallet=disposer_wallet,
                pickup=pickup_request,
                amount=disposer_incentive,
                transaction_type='ESCROW_RELEASE',
                status='COMPLETED',
                description=f"Early Payout for Job #{pickup_request.id} (Collector Arrived)"
            )

            # 2. Debit from Source (Escrow or Platform Wallet)
            if escrow:
                # If escrow exists (Recycler pre-paid), the funds stay in escrow
                # but we've effectively 'promised' them from the total held.
                # To keep ledger balanced, we'll just track that the disposer is paid and 
                # deduct this from the final release.
                pass
            elif platform_user:
                # Seller-initiated Track B: Debit from platform wallet (system payment)
                platform_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=platform_user)
                platform_wallet.balance -= disposer_incentive
                platform_wallet.save()

            pickup_request.is_disposer_paid = True
            pickup_request.save()

class PaystackService:
    @staticmethod
    def initialize_transaction(user, amount, email=None):
        """
        Initialize a transaction with Paystack.
        """
        secret_key = settings.PAYSTACK_SECRET_KEY
        
        # Debug logging
        print(f"PAYSTACK_SECRET_KEY loaded: {'Yes' if secret_key else 'NO - THIS IS THE PROBLEM!'}")
        print(f"Initializing payment: amount={amount}, email={email or user.email}")
        
        if not secret_key:
            print("CRITICAL: Paystack secret key is not configured!")
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
            print(f"Sending request to Paystack API...")
            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                headers=headers,
                json=data
            )
            response.raise_for_status()
            result = response.json()
            print(f"Paystack response: {result.get('status')}, Message: {result.get('message')}")
            return result
        except requests.exceptions.RequestException as e:
            print(f"Paystack API Error: {str(e)}")
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
