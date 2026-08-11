import urllib.request
import urllib.parse
import json
import time

BASE_URL = 'http://localhost:8000/api'

def make_request(url, data=None, headers=None):
    if headers is None:
        headers = {}
    
    if data:
        data_bytes = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(url, data=data_bytes, headers=headers)
    else:
        req = urllib.request.Request(url, headers=headers)
        
    try:
        with urllib.request.urlopen(req) as response:
            return {
                'status': response.status,
                'data': json.loads(response.read().decode())
            }
    except urllib.error.HTTPError as e:
        return {
            'status': e.code,
            'data': json.loads(e.read().decode()) if e.read() else str(e)
        }
    except Exception as e:
        return {'status': 0, 'data': str(e)}

def test_admin_flow():
    print("Testing Admin Flow...")
    timestamp = int(time.time())
    username = f"admin_v2_{timestamp}"
    password = "TestPassword123!"
    
    # 1. Register
    print(f"\n1. Registering {username}...")
    reg_resp = make_request(
        f"{BASE_URL}/users/admin-register/",
        {
            "username": username,
            "email": f"{username}@test.com",
            "password": password
        }
    )
    print(f"Status: {reg_resp['status']}")
    
    if reg_resp['status'] != 201:
        print("❌ Registration Failed")
        print(reg_resp)
        return

    # 2. Login
    print("\n2. Logging in...")
    login_resp = make_request(
        f"{BASE_URL}/users/token/",
        {"username": username, "password": password}
    )
    
    if login_resp['status'] != 200:
        print("❌ Login Failed")
        return
        
    token = login_resp['data']['access']
    print("✅ Login Successful")

    # 3. Verify Perms
    print("\n3. Verifying Permissions...")
    me_resp = make_request(
        f"{BASE_URL}/users/me/",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    user = me_resp['data']
    print(f"is_staff: {user.get('is_staff')}")
    print(f"is_superuser: {user.get('is_superuser')}")
    
    if user.get('is_staff') and user.get('is_superuser'):
        print("\n✅ PASSED: Backend is working correctly!")
    else:
        print("\n❌ FAILED: Permissions missing!")

if __name__ == "__main__":
    test_admin_flow()
