import requests
import sys

BASE_URL = 'http://localhost:8000/api'

def test_admin_registration():
    print("Testing Admin Registration...")
    
    # Unique username/email
    import time
    timestamp = int(time.time())
    username = f"admintest_{timestamp}"
    email = f"admin_{timestamp}@test.com"
    password = "TestPassword123!"
    
    # 1. Register
    reg_url = f"{BASE_URL}/users/admin-register/"
    data = {
        "username": username,
        "email": email,
        "password": password,
        "role": "COLLECTOR" # Should be ignored/overridden or just irrelevant for admin status
    }
    
    print(f"Sending registration request for {username}...")
    try:
        response = requests.post(reg_url, json=data)
        print(f"Registration Status: {response.status_code}")
        print(f"Registration Response: {response.text}")
        
        if response.status_code != 201:
            print("❌ Registration Failed")
            return

    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return

    # 2. Login to check permissions
    print("\nLogging in to verify permissions...")
    token_url = f"{BASE_URL}/users/token/"
    login_data = {"username": username, "password": password}
    
    try:
        login_resp = requests.post(token_url, json=login_data)
        if login_resp.status_code != 200:
            print(f"❌ Login Failed: {login_resp.status_code}")
            return
            
        tokens = login_resp.json()
        access_token = tokens['access']
        print("✅ Login Successful, got token")
        
        # 3. Get Me
        me_url = f"{BASE_URL}/users/me/"
        headers = {"Authorization": f"Bearer {access_token}"}
        me_resp = requests.get(me_url, headers=headers)
        
        if me_resp.status_code != 200:
            print(f"❌ Get Me Failed: {me_resp.status_code}")
            return
            
        user_data = me_resp.json()
        print("\nUser Data Verification:")
        print(f"Username: {user_data.get('username')}")
        print(f"Is Staff: {user_data.get('is_staff')}")
        print(f"Is Superuser: {user_data.get('is_superuser')}")
        
        if user_data.get('is_staff') and user_data.get('is_superuser'):
            print("\n✅ SUCCESS: User created with FULL ADMIN privileges")
        else:
            print("\n❌ FAILURE: User created but MISSING privileges")

    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    test_admin_registration()
