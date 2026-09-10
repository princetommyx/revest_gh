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


if __name__ == "__main__":
    main()
