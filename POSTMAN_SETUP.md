# Postman Setup Guide for ReVesta API

## Prerequisites
- [Postman Desktop App](https://www.postman.com/downloads/) or Postman Web
- Running Django backend (local or production)

## Quick Start

### 1. Import API Schema

**Option A: Import from Swagger (Recommended)**
1. Start your Django server:
   ```bash
   cd backend
   python manage.py runserver
   ```
2. In Postman, click **Import** → **Link**
3. Enter: `http://localhost:8000/api/schema/`
4. Click **Continue** → **Import**

**Option B: Manual Collection Setup**
1. Download this collection (if provided separately)
2. Click **Import** → **File** → Select collection JSON

---

### 2. Create Environment Variables

**Local Development Environment:**
1. Click **Environments** (left sidebar) → **+** → Create new environment
2. Name it: `ReVesta Local`
3. Add variables:
   ```
   base_url: http://localhost:8000/api/v1
   access_token: (leave empty - will be set automatically)
   refresh_token: (leave empty - will be set automatically)
   ```

**Production Environment:**
1. Create another environment: `ReVesta Production`
2. Add variables:
   ```
   base_url: https://your-app.onrender.com/api/v1
   access_token: (leave empty)
   refresh_token: (leave empty)
   ```

---

### 3. Test Authentication Flow

#### Register New User
1. **Endpoint:** `POST {{base_url}}/auth/register/`
2. **Body (JSON):**
   ```json
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "SecureP@ss123",
     "password2": "SecureP@ss123",
     "role": "SELLER"
   }
   ```
3. **Expected Response:** `201 Created` with access & refresh tokens
4. **Auto-save tokens:** Add to Tests tab:
   ```javascript
   pm.test("Status code is 201", function () {
       pm.response.to.have.status(201);
   });
   
   var jsonData = pm.response.json();
   if (jsonData.access) {
       pm.environment.set("access_token", jsonData.access);
       pm.environment.set("refresh_token", jsonData.refresh);
   }
   ```

#### Login
1. **Endpoint:** `POST {{base_url}}/auth/login/`
2. **Body (JSON):**
   ```json
   {
     "username": "testuser",
     "password": "SecureP@ss123"
   }
   ```
3. **Expected Response:** `200 OK` with tokens
4. **Auto-save tokens:** Use same test script as registration

#### Get User Profile
1. **Endpoint:** `GET {{base_url}}/users/profile/`
2. **Authorization:** Bearer Token → `{{access_token}}`
3. **Expected Response:** `200 OK` with user data

#### Refresh Token
1. **Endpoint:** `POST {{base_url}}/auth/token/refresh/`
2. **Body (JSON):**
   ```json
   {
     "refresh": "{{refresh_token}}"
   }
   ```
3. **Expected Response:** `200 OK` with new access token

---

### 4. Test Core Features

#### Market - Create Listing
```http
POST {{base_url}}/market/listings/
Authorization: Bearer {{access_token}}
Content-Type: multipart/form-data

Form Data:
- title: "Plastic Bottles"
- material_type: "Plastics"
- description: "Clean PET bottles, 50kg available"
- quantity: "50kg"
- price: 25.00
- is_free: false
- location: "Accra, Ghana"
- image: [select file]
```

#### Market - List All Listings
```http
GET {{base_url}}/market/listings/?page=1&material_type=Plastics
Authorization: Bearer {{access_token}}
```

#### Logistics - Create Pickup Request
```http
POST {{base_url}}/logistics/pickups/
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "material_type": "Plastics",
  "quantity_estimate": "30kg",
  "latitude": 5.6037,
  "longitude": -0.1870
}
```

#### Chat - Send Message
```http
POST {{base_url}}/chat/messages/
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
  "receiver": 2,
  "content": "Hi, is this listing still available?"
}
```

#### Wallet - Check Balance
```http
GET {{base_url}}/wallet/balance/
Authorization: Bearer {{access_token}}
```

---

## Common Pitfalls & Troubleshooting

### 401 Unauthorized
- **Cause:** Token expired or missing
- **Fix:** Re-login or refresh token

### 403 Forbidden
- **Cause:** Insufficient permissions (e.g., non-admin accessing admin endpoints)
- **Fix:** Check user role in response

### 400 Bad Request
- **Cause:** Invalid data format or missing required fields
- **Fix:** Check request body matches API schema

### CORS Errors (Production)
- **Cause:** Frontend origin not in `CORS_ALLOWED_ORIGINS`
- **Fix:** Add frontend URL to backend settings

---

## Advanced Testing

### Test Pagination
```http
GET {{base_url}}/market/listings/?page=2&page_size=10
```

### Test Filtering & Search
```http
GET {{base_url}}/market/listings/?search=plastic&material_type=Plastics&ordering=-created_at
```

### Test File Upload Error Handling
Upload file > 5MB or invalid format to test validation

### Test Rate Limiting
Make 30 requests/minute to trigger throttling

---

## Automation with Collections

### Pre-request Script (Set in Collection settings)
Automatically attach token to all requests:
```javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('access_token')
});
```

### Environment Switching
Click environment dropdown → Select `ReVesta Local` or `ReVesta Production`

---

## Next Steps
1. ✅ Test all authentication flows
2. ✅ Test CRUD operations for each feature
3. ✅ Verify error responses
4. ✅ Test with mobile app
5. 📝 Document any API bugs or improvements needed
