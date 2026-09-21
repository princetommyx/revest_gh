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
    from dotenv import load_dotenv
    import requests
    from requests.auth import HTTPBasicAuth

    load_dotenv()

    client_id = os.environ.get('HUBTEL_CLIENT_ID')
    client_secret = os.environ.get('HUBTEL_CLIENT_SECRET')
    sender = os.environ.get('HUBTEL_FROM', 'Revesta')
    to = '+233541234567' # Sample number, we just want to see if Hubtel rejects it
    formatted_to = '233541234567'

    payload = {
        'From': sender,
        'To': formatted_to,
        'Content': 'Test Revesta SMS',
        'RegisteredId': ''
    }

    print(f"Sending to Hubtel with ClientID: {client_id}")
    response = requests.post(
        "https://smsc.hubtel.com/v1/messages/send", 
        json=payload, 
        auth=HTTPBasicAuth(client_id, client_secret),
        timeout=15
    )
    print("Status Code:", response.status_code)
    print("Response:", response.text)


if __name__ == "__main__":
    main()
