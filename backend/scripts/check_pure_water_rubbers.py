# Running this file directly puts scripts/ on sys.path rather than backend/,
# so the project package would not be importable. Fixed here rather than by
# expecting everyone to remember to set PYTHONPATH first.
import os as _os
import sys as _sys

_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import os
import django
from decimal import Decimal
import uuid

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User
from market.models import Listing
from logistics.models import PickupRequest
from wallet.models import Wallet, Transaction, Escrow
from wallet.services import WalletService
from logistics.pricing import (
    BALE_SACK_EQUIVALENT,
    calculate_track_b_earnings,
    survey_adjusted_sack_rate,
)

def test_pure_water_rubbers_logic():
    print("--- Testing Pure Water Rubbers Logic ---")
    
    # 1. Test Pricing
    #
    # Asserts the invariants rather than the figure. The flat sack rate is no
    # longer the constant GHS 30.00 this used to hardcode - it moves with the
    # market survey (intelligence/market_signal.py) - so pinning the number
    # made this fail every time the survey shifted, which is the rate working
    # rather than the pricing breaking. What must stay true is that the rate
    # is the survey-adjusted one and that weight does not enter into it.
    expected = survey_adjusted_sack_rate()
    price = calculate_track_b_earnings('PURE_WATER_RUBBERS', 10) # weight shouldn't matter
    print(f"Pricing for Pure Water Rubbers: {price} GHS (Expected: {expected})")
    assert price == expected
    assert calculate_track_b_earnings('PURE_WATER_RUBBERS', 1) == price, "weight must not change a flat rate"
    
    # 2. Test Commission Splitting
    # Create mock data
    disposer, _ = User.objects.get_or_create(username='test_disposer', defaults={'role': 'SELLER'})
    collector, _ = User.objects.get_or_create(username='test_collector', defaults={'role': 'COLLECTOR'})
    revesta = User.objects.get(username='revesta')
    
    # Ensure wallets exist
    Wallet.objects.get_or_create(user=disposer)
    Wallet.objects.get_or_create(user=collector)
    Wallet.objects.get_or_create(user=revesta)
    
    listing = Listing.objects.create(
        seller=disposer,
        title="Test Pure Water Rubbers",
        material_type="PURE_WATER_RUBBERS",
        track='B',
        quantity="1 bag",
        price=Decimal('30.00'),
        location="Test Location",
        latitude=Decimal('5.6037'),
        longitude=Decimal('-0.1870')
    )
    
    pickup = PickupRequest.objects.create(
        listing=listing,
        provider=disposer,
        collector=collector,
        status='COMPLETED',
        waste_price=Decimal('30.00'),
        delivery_fee=Decimal('10.00'),
        latitude=5.6037,
        longitude=-0.1870,
        quantity_estimate="1 bag",
        material_type="PURE_WATER_RUBBERS"
    )
    
    # Mock Escrow
    total_escrow = Decimal('30.00') + Decimal('10.00') # Material + Delivery
    escrow = Escrow.objects.create(
        pickup=pickup,
        payer=revesta, # System usually pairs this
        amount=total_escrow,
        status='HELD'
    )
    
    print(f"Processing completion for Job #{pickup.id}...")
    
    # Initial Balances
    bal_disposer_init = Wallet.objects.get(user=disposer).balance
    bal_collector_init = Wallet.objects.get(user=collector).balance
    bal_revesta_init = Wallet.objects.get(user=revesta).balance
    
    # Run Service Logic
    WalletService.process_track_b_completion(pickup)
    
    # Final Balances
    bal_disposer_final = Wallet.objects.get(user=disposer).balance
    bal_collector_final = Wallet.objects.get(user=collector).balance
    bal_revesta_final = Wallet.objects.get(user=revesta).balance
    
    diff_disposer = bal_disposer_final - bal_disposer_init
    diff_collector = bal_collector_final - bal_collector_init
    diff_revesta = bal_revesta_final - bal_revesta_init
    
    print(f"Disposer Earnings: {diff_disposer} (Expected: 30.00)")
    print(f"Revesta Commission: {diff_revesta} (Expected: 5.00)")
    print(f"Collector Logistics: {diff_collector} (Expected: {total_escrow - 30 - 5})")
    
    assert diff_disposer == Decimal('30.00')
    assert diff_revesta == Decimal('5.00')
    
    print("--- Test Passed Successfully ---")

def test_pure_water_rubbers_bale_logic():
    print("\n--- Testing Pure Water Rubbers Bale Logic ---")
    
    # 1. Test Pricing
    # Likewise: a bale is defined as two sacks, so what matters is that it
    # tracks the sack rate rather than that it equals GHS 60.00.
    expected = (survey_adjusted_sack_rate() * BALE_SACK_EQUIVALENT).quantize(Decimal('0.01'))
    price = calculate_track_b_earnings('PURE_WATER_RUBBERS_BALE', 1)
    print(f"Pricing for Pure Water Rubbers Bale: {price} GHS (Expected: {expected})")
    assert price == expected
    
    # 2. Test Commission Splitting
    disposer = User.objects.get(username='test_disposer')
    collector = User.objects.get(username='test_collector')
    revesta = User.objects.get(username='revesta')
    
    listing = Listing.objects.create(
        seller=disposer,
        title="Test Pure Water Rubbers Bale",
        material_type="PURE_WATER_RUBBERS_BALE",
        track='B',
        quantity="1 bale",
        price=Decimal('60.00'),
        location="Test Location",
        latitude=5.6037,
        longitude=-0.1870
    )
    
    pickup = PickupRequest.objects.create(
        listing=listing,
        provider=disposer,
        collector=collector,
        status='COMPLETED',
        waste_price=Decimal('60.00'),
        delivery_fee=Decimal('15.00'),
        latitude=5.6037,
        longitude=-0.1870,
        quantity_estimate="1 bale",
        material_type="PURE_WATER_RUBBERS_BALE"
    )
    
    # Mock Escrow
    total_escrow = Decimal('60.00') + Decimal('15.00')
    escrow = Escrow.objects.create(
        pickup=pickup,
        payer=revesta,
        amount=total_escrow,
        status='HELD'
    )
    
    # Initial Balances
    bal_disposer_init = Wallet.objects.get(user=disposer).balance
    bal_revesta_init = Wallet.objects.get(user=revesta).balance
    
    # Run Service Logic
    WalletService.process_track_b_completion(pickup)
    
    # Final Balances
    bal_disposer_final = Wallet.objects.get(user=disposer).balance
    bal_revesta_final = Wallet.objects.get(user=revesta).balance
    
    diff_disposer = bal_disposer_final - bal_disposer_init
    diff_revesta = bal_revesta_final - bal_revesta_init
    
    print(f"Disposer Earnings: {diff_disposer} (Expected: 60.00)")
    print(f"Revesta Commission: {diff_revesta} (Expected: 7.00)")
    
    assert diff_disposer == Decimal('60.00')
    assert diff_revesta == Decimal('7.00')
    print("--- Bale Test Passed Successfully ---")

if __name__ == "__main__":
    try:
        test_pure_water_rubbers_logic()
        test_pure_water_rubbers_bale_logic()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()
