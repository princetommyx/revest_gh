from django.contrib import admin
from .models import Wallet, Transaction, CommissionRule

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'currency', 'is_frozen', 'updated_at')
    search_fields = ('user__username', 'user__email')
    list_filter = ('is_frozen', 'currency')
    readonly_fields = ('balance',)

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('reference', 'wallet', 'amount', 'transaction_type', 'status', 'created_at')
    list_filter = ('transaction_type', 'status', 'created_at')
    search_fields = ('reference', 'wallet__user__username')
    readonly_fields = ('reference', 'created_at')

@admin.register(CommissionRule)
class CommissionRuleAdmin(admin.ModelAdmin):
    list_display = ('material_type', 'commission_percent', 'active', 'updated_at')
    list_filter = ('active',)
    search_fields = ('material_type',)
