import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User
from market.models import Listing
from rest_framework.test import APIRequestFactory, force_authenticate
from market.views import ListingViewSet
from decimal import Decimal

def test_market_location_filtering():
    print("--- Testing Market Location-Based Filtering ---")
    
    # 1. Setup Users
    recycler, _ = User.objects.get_or_create(username='test_recycler', defaults={'role': 'RECYCLER'})
    seller, _ = User.objects.get_or_create(username='test_seller', defaults={'role': 'SELLER'})
    
    # 2. Setup Listings
    # Listing A: Accra - 5.6037, -0.1870
    Listing.objects.create(
        seller=seller,
        title="Accra Plastic",
        material_type="PET",
        quantity="100kg",
        price=Decimal('50.00'),
        latitude=Decimal('5.6037'),
        longitude=Decimal('-0.1870'),
        location="Accra Central"
    )
    
    # Listing B: Kumasi - 6.6666, -1.6163
    Listing.objects.create(
        seller=seller,
        title="Kumasi Plastic",
        material_type="PET",
        quantity="50kg",
        price=Decimal('25.00'),
        latitude=Decimal('6.6666'),
        longitude=Decimal('-1.6163'),
        location="Kumasi Mall"
    )
    
    # 3. Test Request
    factory = APIRequestFactory()
    view = ListingViewSet.as_view({'get': 'list'})
    
    # Simulate recycler in Accra
    request = factory.get('/api/market/listings/', {'lat': '5.6037', 'lon': '-0.1870'})
    force_authenticate(request, user=recycler)
    
    response = view(request)
    if isinstance(response.data, dict) and 'results' in response.data:
        data = response.data['results']
    else:
        data = response.data
        
    print(f"Total listings returned: {len(data)}")
    for item in data:
        print(f"Listing: {item['title']}, Distance: {item.get('distance_km')} km")
        
    titles = [item['title'] for item in data]
    assert "Accra Plastic" in titles
    assert "Kumasi Plastic" not in titles
    
    print("--- Market Location Filtering Test Passed ---")

if __name__ == "__main__":
    try:
        test_market_location_filtering()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()
