from rest_framework import serializers
from .models import Wallet, Transaction
from decimal import Decimal


class TransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for transaction details
    """
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = (
            'id', 'amount', 'transaction_type', 'transaction_type_display',
            'status', 'status_display', 'description', 'reference', 'created_at'
        )
        read_only_fields = ('reference', 'created_at', 'status')


class WalletSerializer(serializers.ModelSerializer):
    """
    Serializer for wallet with recent transactions
    """
    recent_transactions = serializers.SerializerMethodField()
    
    class Meta:
        model = Wallet
        fields = ('id', 'balance', 'currency', 'is_frozen', 'created_at', 'updated_at', 'recent_transactions')
        read_only_fields = ('balance', 'currency', 'is_frozen', 'created_at', 'updated_at')
    
    def get_recent_transactions(self, obj):
        """Get last 5 transactions"""
        transactions = obj.transactions.all()[:5]
        return TransactionSerializer(transactions, many=True).data


class DepositSerializer(serializers.Serializer):
    """
    Serializer for deposit requests
    """
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    description = serializers.CharField(max_length=200, required=False, allow_blank=True)
    
    def validate_amount(self, value):
        if value < Decimal('1.00'):
            raise serializers.ValidationError("Minimum deposit amount is 1.00")
        if value > Decimal('10000.00'):
            raise serializers.ValidationError("Maximum deposit amount is 10,000.00")
        return value


class WithdrawalSerializer(serializers.Serializer):
    """
    Serializer for withdrawal requests
    """
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('1.00'))
    description = serializers.CharField(max_length=200, required=False, allow_blank=True)
    
    def validate_amount(self, value):
        if value < Decimal('1.00'):
            raise serializers.ValidationError("Minimum withdrawal amount is 1.00")
        return value
    
    def validate(self, attrs):
        """Check if user has sufficient balance"""
        request = self.context.get('request')
        if request and hasattr(request.user, 'wallet'):
            wallet = request.user.wallet
            if wallet.is_frozen:
                 raise serializers.ValidationError("Wallet is frozen. Cannot withdraw.")
            if wallet.balance < attrs['amount']:
                raise serializers.ValidationError("Insufficient balance")
        return attrs

