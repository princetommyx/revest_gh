import os
import django
import sys
from django.conf import settings

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "revesta_backend.settings")
django.setup()

from users.models import User
from rest_framework.test import APIClient

def test_deposit_scenarios():
    print("--- Starting Deposit Edge Case Debug ---")
    
    user = User.objects.first()
    if not user:
        print("No users found.")
        return

    client = APIClient()
    client.force_authenticate(user=user)
    endpoint = '/api/v1/wallet/initialize_payment/'
    
    scenarios = [
        ("Valid Request", {'amount': '10.0', 'email': user.email}),
        ("Missing Email in Body", {'amount': '10.0'}), 
        ("Invalid Amount String", {'amount': 'ten', 'email': user.email}),
        ("Amount with Comma", {'amount': '10,0', 'email': user.email}),
        ("Negative Amount", {'amount': '-5', 'email': user.email}),
        ("Zero Amount", {'amount': '0', 'email': user.email}),
        ("Missing Amount", {'email': user.email}),
    ]

    for name, data in scenarios:
        print(f"\nTesting: {name}")
        try:
            response = client.post(endpoint, data, format='json')
            print(f"Status: {response.status_code}")
            if response.status_code == 500:
                print("!!! FOUND 500 ERROR !!!")
            elif response.status_code == 400:
                print(f"Got 400 (Expected): {response.data}")
            else:
                print(f"Got {response.status_code}: {response.data}")
        except Exception as e:
            print(f"Exception calling client: {e}")

if __name__ == "__main__":
    test_deposit_scenarios()
