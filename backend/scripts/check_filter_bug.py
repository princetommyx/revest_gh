# Body wrapped in main() so importing this module can never fire a live
# API call, SMS or database write. It used to run everything at import
# time, which meant `manage.py test` executed it as a side effect of
# discovering it - see scripts/README.md.

# Running this file directly puts scripts/ on sys.path rather than backend/,
# so the project package would not be importable. Fixed here rather than by
# expecting everyone to remember to set PYTHONPATH first.
import os as _os
import sys as _sys

_sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

def main():
    import os
    import django
    from django.conf import settings

    # Configure Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
    django.setup()

    from market.models import Listing
    from rest_framework.test import APIRequestFactory
    from market.views import ListingViewSet

    # Create some dummy listings if none exist
    if not Listing.objects.exists():
        Listing.objects.create(
            title="Test Plastic",
            material_type="Plastics",
            price=10.0,
            quantity="10kg",
            location="Accra"
        )

    factory = APIRequestFactory()
    view = ListingViewSet.as_view({'get': 'list'})

    # Test 1: No filter
    print("--- Test 1: No Filter ---")
    request = factory.get('/market/listings/')
    response = view(request)
    print(f"Count: {len(response.data['results'])}")

    # Test 2: Empty material_type filter
    print("\n--- Test 2: material_type='' ---")
    request = factory.get('/market/listings/?material_type=')
    response = view(request)
    print(f"Count: {len(response.data['results'])}")


if __name__ == "__main__":
    main()
