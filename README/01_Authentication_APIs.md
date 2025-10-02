# Authentication APIs Documentation

Base URL: `http://192.168.0.23:5000/api`

## 📋 Overview
Complete authentication system with JWT tokens, role-based access control, and login history tracking.

---

## 🔐 Authentication Endpoints

### 1. User Registration (First Admin + Admin-Only)

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account. **First user** becomes admin (no token). After that, **only admin can register users** (token required).

**Headers for First Admin (No Token):**
```json
{
  "Content-Type": "application/json"
}
```

**Headers for Additional Users (Admin Token Required):**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "USER"
}
```

**Response (Success - 201) - First Admin:**
```json
{
  "message": "First admin registered successfully",
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "role": "ADMIN",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "isFirstAdmin": true
}
```

**Response (Success - 201) - Additional Users:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 2,
    "email": "employee@company.com",
    "role": "USER",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  "isFirstAdmin": false
}
```

**Response (Error - 400):**
```json
{
  "error": "User with this email already exists"
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "email": "newuser@example.com",
    "password": "securepassword123",
    "role": "USER"
  }'
```

---

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and get access token

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "networkType": "wifi"
}
```

**Response (Success - 200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJVU0VSIiwiZXhwIjoxNjQwOTk1MjAwLCJpYXQiOjE2NDA5MDg4MDAsImp0aSI6IjEyMzQ1Njc4LTkwYWItY2RlZi0xMjM0LTU2Nzg5MGFiY2RlZiJ9.signature",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "USER"
  }
}
```

**Response (Error - 401):**
```json
{
  "error": "Invalid email or password"
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "networkType": "wifi"
  }'
```

**Note:** Refresh token is automatically set as HttpOnly cookie

---

### 3. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Get new access token using refresh token

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:** None (refresh token sent automatically via cookie)

**Response (Success - 200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token_payload.new_signature"
}
```

**Response (Error - 401):**
```json
{
  "error": "Invalid refresh token"
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  --cookie "refreshToken=your_refresh_token_here"
```

---

### 4. User Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout user and invalidate tokens

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:** None

**Response (Success - 200):**
```json
{
  "message": "Logout successful"
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  --cookie "refreshToken=your_refresh_token_here"
```

---

### 5. Get User Profile

**Endpoint:** `GET /api/auth/profile`

**Description:** Get current user's profile and permissions

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "USER",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "brandAccess": [
      {
        "id": 1,
        "name": "Nike",
        "description": "Sports brand"
      }
    ],
    "marketplaceAccess": [
      {
        "id": 1,
        "name": "Amazon",
        "description": "E-commerce platform"
      }
    ],
    "shippingAccess": [
      {
        "id": 1,
        "name": "FedEx",
        "description": "Courier service"
      }
    ]
  }
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔑 Token Information

### Access Token
- **Lifetime:** 15 minutes
- **Storage:** Memory (JavaScript variable)
- **Usage:** Authorization header for API calls
- **Format:** `Bearer <token>`

### Refresh Token
- **Lifetime:** 7 days
- **Storage:** HttpOnly cookie (automatic)
- **Usage:** Automatic refresh when access token expires
- **Security:** Cannot be accessed by JavaScript

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Validation failed | Invalid request data |
| 401 | Access token required | Missing authorization header |
| 401 | Invalid token | Token is malformed or invalid |
| 401 | Token expired | Access token has expired |
| 403 | Admin access required | Endpoint requires admin role |
| 404 | User not found | User doesn't exist |
| 500 | Authentication failed | Server error |

---

## 📱 Frontend Integration Example

```javascript
// Login function
async function login(email, password) {
  const response = await fetch('http://192.168.0.23:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      email,
      password,
      networkType: navigator.connection?.effectiveType || 'unknown'
    })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store access token in memory
    localStorage.setItem('accessToken', data.accessToken);
    return data;
  } else {
    throw new Error(data.error);
  }
}

// API call with token
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('accessToken');
  
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include'
  });
}
```
