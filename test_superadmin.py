import requests

url = "http://localhost:8000/api/v1/auth/login/"
payload = {
    "username": "superadmin",
    "password": "password123"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
