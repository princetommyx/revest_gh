from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import Wallet, Transaction
from .serializers import (
    WalletSerializer, TransactionSerializer, 
    DepositSerializer, WithdrawalSerializer
)
from decimal import Decimal

@extend_schema(tags=['wallet'])
@extend_schema_view(
    list=extend_schema(summary="Get wallet details", description="Get your wallet balance and recent transactions."),
)
class WalletViewSet(viewsets.GenericViewSet):
    # Only need list/retrieve really since it's 1-to-1
    permission_classes = [permissions.IsAuthenticated]
    queryset = Wallet.objects.all()
    serializer_class = WalletSerializer

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)
    
    @extend_schema(summary="Get my wallet")
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current user's wallet"""
        wallet, created = Wallet.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(wallet)
        return Response(serializer.data)

    @extend_schema(
        summary="Deposit funds",
        request=DepositSerializer,
        responses={200: WalletSerializer}
    )
    @action(detail=False, methods=['post'])
    def deposit(self, request):
        """Simulate a deposit (for testing/demo)"""
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        serializer = DepositSerializer(data=request.data)
        
        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            desc = serializer.validated_data.get('description', 'Deposit')
            
            # Create transaction
            Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type='DEPOSIT',
                status='COMPLETED',
                description=desc,
                reference=f"DEP-{status.HTTP_200_OK}" # Fake ref
            )
            
            # Update balance
            wallet.balance += amount
            wallet.save()
            
            return Response(self.get_serializer(wallet).data)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Withdraw funds",
        request=WithdrawalSerializer,
        responses={200: WalletSerializer}
    )
    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        """Request a withdrawal"""
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        serializer = WithdrawalSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            desc = serializer.validated_data.get('description', 'Withdrawal')
            
            # Create transaction
            Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type='WITHDRAWAL',
                status='PENDING', # Needs admin approval
                description=desc,
                reference=f"WTH-{status.HTTP_200_OK}"
            )
            
            # Deduct balance immediately or hold it? 
            # Usually deduct and hold, revert if cancelled. 
            wallet.balance -= amount
            wallet.save()
            
            return Response(self.get_serializer(wallet).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(summary="List transactions")
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """Get full transaction history"""
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')
        
        # Simple pagination if needed, but for now just list
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)
