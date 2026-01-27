from decimal import Decimal
from django.db import transaction
from .models import Wallet, Transaction, CommissionRule
from rest_framework.exceptions import ValidationError

class WalletService:
    @staticmethod
    def get_commission_rate(material_type):
        """
        Get the commission percentage for a specific material type.
        Defaults to 20% if no rule exists.
        """
        try:
            rule = CommissionRule.objects.get(material_type=material_type, active=True)
            return rule.commission_percent
        except CommissionRule.DoesNotExist:
            return Decimal('20.00')

    @staticmethod
    def process_job_completion(pickup):
        """
        Handles the financial logic when a pickup is completed.
        - Cash: Deduct commission from collector wallet (can go negative).
        - Digital: Credit collector wallet (Price - Commission).
        """
        if not pickup.collector:
            raise ValidationError("No collector assigned to this pickup.")
            
        wallet, _ = Wallet.objects.get_or_create(user=pickup.collector)
        
        # Ensure we haven't already processed this pickup
        if Transaction.objects.filter(pickup=pickup).exists():
            return # Already processed

        amount = pickup.actual_price or pickup.estimated_price
        if not amount:
            raise ValidationError("Pickup must have a price to process transaction.")
            
        commission_rate = WalletService.get_commission_rate(pickup.material_type)
        commission_amount = (amount * commission_rate) / Decimal('100.00')
        
        with transaction.atomic():
            # Default to CASH if not specified (backward compatibility)
            method = pickup.payment_method or 'CASH'
            
            if method == 'CASH':
                # BOLT MODEL: Collector keeps cash. We deduct commission from their wallet.
                # Wallet balance decreases.
                Transaction.objects.create(
                    wallet=wallet,
                    pickup=pickup,
                    amount=-commission_amount, # Debit
                    transaction_type='COMMISSION_DEDUCTION',
                    status='COMPLETED',
                    description=f"Commission for Cash Job #{pickup.id} ({commission_rate}%)"
                )
                
            elif method == 'DIGITAL':
                # Standard Model: We hold money. We pay collector net earnings.
                # Earnings = Full Amount - Commission
                net_earnings = amount - commission_amount
                
                Transaction.objects.create(
                    wallet=wallet,
                    pickup=pickup,
                    amount=net_earnings, # Credit
                    transaction_type='JOB_EARNING',
                    status='COMPLETED',
                    description=f"Earnings for Digital Job #{pickup.id} (Net of {commission_rate}% comm.)"
                )
            
            # Recalculate and save wallet balance
            wallet.balance = wallet.calculate_balance_from_ledger()
            
            # Check for freezing condition (too much debt)
            # Example: Limit is -500 GHS
            DEBT_LIMIT = Decimal('-500.00')
            if wallet.balance < DEBT_LIMIT:
                wallet.is_frozen = True
            else:
                wallet.is_frozen = False
                
            wallet.save()

    @staticmethod
    def check_eligibility_for_job(user):
        """
        Check if collector is allowed to take new jobs.
        """
        # Create wallet if it doesn't exist
        wallet, created = Wallet.objects.get_or_create(user=user)
        
        # More lenient check: Only block if debt is extremely high (e.g., < -1000 GHS)
        # This allows collectors to work their way out of moderate debt
        EXTREME_DEBT_LIMIT = Decimal('-1000.00')
        
        if wallet.balance < EXTREME_DEBT_LIMIT:
            return False, f"Your wallet balance is too low (₵{wallet.balance}). Please contact support or top up to continue."
        
        # Even if frozen, allow them to work (they can pay off debt through work)
        return True, None

    @staticmethod
    def request_withdrawal(user, amount):
        """
        Process a withdrawal request.
        """
        wallet = user.wallet
        
        if wallet.balance < 0:
            raise ValidationError("Cannot withdraw with negative balance.")
            
        if amount > wallet.balance:
            raise ValidationError("Insufficient funds.")

        # Create Pending Transaction
        Transaction.objects.create(
            wallet=wallet,
            amount=-amount,
            transaction_type='WITHDRAWAL',
            status='PENDING',
            description="Withdrawal Request"
        )
        
        # Update balance immediately to reflect pending deduction
        wallet.balance = wallet.calculate_balance_from_ledger()
        wallet.save()
