import os
import requests

# Try to load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Loaded .env file (if present)")
except ImportError:
    print("python-dotenv not installed, relying on system environment variables")

key = os.environ.get('PAYSTACK_SECRET_KEY')

if key:
    print(f"PAYSTACK_SECRET_KEY is set. Starts with: {key[:8]}...")
    if key.strip() != key:
        print("WARNING: Key has leading/trailing whitespace!")
else:
    print("ERROR: PAYSTACK_SECRET_KEY is NOT set in the environment.")
    exit(1)

# Test the key against Paystack API
print("\nTesting Paystack API with provided key...")
headers = {
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
}
data = {
    "email": "debug_test@revesta.com",
    "amount": "100", # 1 GHS
    "currency": "GHS",
}

try:
    response = requests.post("https://api.paystack.co/transaction/initialize", headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        print("\nSUCCESS: Paystack API key is valid and working.")
    elif response.status_code == 401:
        print("\nFAILURE: 401 Unauthorized. The key is invalid.")
    else:
        print(f"\nFAILURE: Verification failed with status {response.status_code}.")

except Exception as e:
    print(f"\nERROR: Exception occurred during request: {e}")
