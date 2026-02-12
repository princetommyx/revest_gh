from rest_framework import viewsets, permissions, filters, status, mixins
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
class WalletViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
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
            
            try:
                # Use Service
                from .services import WalletService
                WalletService.request_withdrawal(request.user, amount)
                
                # Refresh wallet to show updated balance (if we deducted immediately)
                wallet.refresh_from_db()
                return Response(self.get_serializer(wallet).data)
            except Exception as e:
                 return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
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

    @extend_schema(
        summary="Initialize Paystack Payment",
        description="Generates a Paystack checkout URL for the custom WebView flow.",
        request=None, 
        responses={200: WalletSerializer} # actually returns auth url
    )
    @action(detail=False, methods=['post'])
    def initialize_payment(self, request):
        """Initialize transaction to get authorization URL"""
        amount = request.data.get('amount')
        email = request.data.get('email', request.user.email)
        
        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .services import PaystackService
        # We need to add initialize_transaction to PaystackService or use a direct call here.
        # Ideally keeping logic in services. 
        # For now, let's assume we update Service too, or just write it here for speed if Service is simple.
        # Let's verify PaystackService has it. 
        # ... checking service file next ...
        # I will implement it in the service in the next step.
        
        try:
            result = PaystackService.initialize_transaction(email, amount)
            if result['status']:
                return Response(result['data'])
            return Response({'error': result.get('message', 'Initialization failed')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        summary="Verify Paystack Payment",
        description="Call this after successful payment on mobile to credit wallet.",
        request=None,
        responses={200: WalletSerializer}
    )
    @action(detail=False, methods=['post'])
    def verify_payment(self, request):
        """Verify Paystack transaction and credit wallet"""
        reference = request.data.get('reference')
        amount = request.data.get('amount') # Optional comparison
        
        if not reference:
            return Response({'error': 'Reference required'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .services import PaystackService
        success, message = PaystackService.verify_transaction(reference, amount, request.user)
        
        if success:
            wallet = Wallet.objects.get(user=request.user)
            return Response({
                'message': message, 
                'wallet': self.get_serializer(wallet).data
            })
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
