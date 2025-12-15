import urllib.request
import urllib.parse
import json
import uuid

def test_registration():
    url = "http://localhost:8000/api/users/register/"
    suffix = uuid.uuid4().hex[:6]
    data = {
        "email": f"test_disposer_{suffix}@example.com",
        "password": "Password123!",
        "role": "SELLER", 
        "phone_number": "055" + suffix[:7],
        "city": "Accra",
    }
    
    import json
    
    headers = {'Content-Type': 'application/json'}
    json_data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=json_data, headers=headers, method='POST')
    
    print(f"Sending JSON data: {data}")
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status Code: {response.status}")
            print(f"Response Body: {response.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"Status Code: {e.code}")
        print(f"Response Body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_registration()
