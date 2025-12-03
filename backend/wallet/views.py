from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from decimal import Decimal
from .models import Wallet, Transaction
from .serializers import WalletSerializer, TransactionSerializer

class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)

    def get_object(self):
        # Ensure wallet exists for user
        wallet, created = Wallet.objects.get_or_create(user=self.request.user)
        return wallet

    @action(detail=False, methods=['post'])
    def deposit(self, request):
        amount = request.data.get('amount')
        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except ValueError:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            wallet = self.get_object()
            wallet.balance += Decimal(str(amount))
            wallet.save()

            Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type='DEPOSIT',
                status='COMPLETED',
                description='Manual deposit'
            )

        return Response(WalletSerializer(wallet).data)

    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        amount = request.data.get('amount')
        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError
        except ValueError:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        wallet = self.get_object()
        if wallet.balance < Decimal(str(amount)):
            return Response({'error': 'Insufficient funds'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            wallet.balance -= Decimal(str(amount))
            wallet.save()

            Transaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type='WITHDRAWAL',
                status='COMPLETED',
                description='Manual withdrawal'
            )

        return Response(WalletSerializer(wallet).data)
