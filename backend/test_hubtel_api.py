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
