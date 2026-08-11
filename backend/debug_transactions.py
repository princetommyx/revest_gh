
from wallet.models import Wallet, Transaction
from users.models import User
from logistics.models import PickupRequest

print("--- DEBUGGING FINANCIAL DATA ---")

print(f"\nTotal Users: {User.objects.count()}")
print(f"Total Wallets: {Wallet.objects.count()}")
print(f"Total Transactions: {Transaction.objects.count()}")

print("\n--- RECENT TRANSACTIONS ---")
for t in Transaction.objects.all().order_by('-created_at')[:10]:
    print(f"ID: {t.id} | Type: {t.transaction_type} | Amount: {t.amount} | Wallet User: {t.wallet.user.username} | Status: {t.status}")

print("\n--- WALLET BALANCES ---")
for w in Wallet.objects.all():
    print(f"User: {w.user.username} ({w.user.role}) | Balance: {w.balance} | Frozen: {w.is_frozen}")

print(f"Total Pickups: {PickupRequest.objects.count()}")
print("\n--- ALL PICKUPS (LAST 10) ---")
for p in PickupRequest.objects.all().order_by('-created_at')[:10]:
    print(f"ID: {p.id} | Status: {p.status} | Collector: {p.collector.username if p.collector else 'None'} | Payment: {p.payment_method} | Price: {p.actual_price or p.estimated_price}")
