import os
import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.models import User
from logistics.models import PickupRequest
from rest_framework.test import APIRequestFactory, force_authenticate
from logistics.views import PickupRequestViewSet

def test_location_filtering():
    print("--- Testing Location-Based Filtering ---")
    
    # 1. Setup Users
    collector, _ = User.objects.get_or_create(username='loc_collector', defaults={'role': 'COLLECTOR'})
    provider, _ = User.objects.get_or_create(username='loc_provider', defaults={'role': 'SELLER'})
    
    # 2. Setup Pickup Requests
    # Job A: Accra (Near Collector) - 5.6037, -0.1870
    job_near = PickupRequest.objects.create(
        provider=provider,
        material_type="PET",
        track_type='B',
        latitude=5.6037,
        longitude=-0.1870,
        status='PENDING',
        quantity_estimate="1 bag"
    )
    
    # Job B: Kumasi (Far from Collector) - 6.6666, -1.6163 (~250km away)
    job_far = PickupRequest.objects.create(
        provider=provider,
        material_type="HDPE",
        track_type='B',
        latitude=6.6666,
        longitude=-1.6163,
        status='PENDING',
        quantity_estimate="1 bag"
    )
    
    # Job C: Old Job (Pending but > 2 hours old)
    job_old = PickupRequest.objects.create(
        provider=provider,
        material_type="Metals",
        track_type='B',
        latitude=5.6037,
        longitude=-0.1870,
        status='PENDING',
        quantity_estimate="1 bag"
    )
    # Manually set created_at back 3 hours
    PickupRequest.objects.filter(id=job_old.id).update(created_at=timezone.now() - timedelta(hours=3))
    
    # 3. Test Request
    factory = APIRequestFactory()
    view = PickupRequestViewSet.as_view({'get': 'list'})
    
    # Simulate collector in Accra (near Job A)
    request = factory.get('/api/logistics/pickups/', {'lat': '5.6037', 'lon': '-0.1870'})
    force_authenticate(request, user=collector)
    
    response = view(request)
    if isinstance(response.data, dict) and 'results' in response.data:
        data = response.data['results']
    else:
        data = response.data
    
    print(f"Total jobs returned: {len(data)}")
    job_ids = [item['id'] for item in data]
    print(f"Job IDs returned: {job_ids}")
    
    # Should contain job_near, should NOT contain job_far or job_old
    assert job_near.id in job_ids, "Nearby job should be in the list"
    assert job_far.id not in job_ids, "Far job should be filtered out"
    assert job_old.id not in job_ids, "Old job should be filtered out"
    
    # Check distance_km presence
    near_item = next(item for item in data if item['id'] == job_near.id)
    print(f"Distance to nearby job: {near_item['distance_km']} km")
    assert near_item['distance_km'] is not None
    
    print("--- Location Filtering Test Passed ---")

if __name__ == "__main__":
    try:
        test_location_filtering()
    except Exception as e:
        print(f"Test Failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup test data if needed, but for now we just run it
        pass
