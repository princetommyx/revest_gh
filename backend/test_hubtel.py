import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'revesta_backend.settings')
django.setup()

from users.sms_service import HubtelSMSService

service = HubtelSMSService()
# Test with a dummy number, or just print the credentials configuration
print(f"Client ID Configured: {bool(service.client_id)}")
print(f"Client Secret Configured: {bool(service.client_secret)}")

# We can also attempt a quick network request to see what Hubtel returns 
# (we don't want to actually send an SMS, so we'll test with a malformed number to get an API response)
response = service.request_otp('0201234567')
print(f"OTP Request Response: {response}")
