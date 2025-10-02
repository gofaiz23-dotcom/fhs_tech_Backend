# Admin APIs Documentation

Base URL: `http://192.168.0.23:5000/api`

## 📋 Overview
Admin-only endpoints for user management, including viewing all users, updating user details, and managing user roles.

**Note:** All admin APIs require admin authentication token.

---

## 👥 Admin User Management

### 1. Get Users Basic Details Only

**Endpoint:** `GET /api/admin/users/basic`

**Description:** Get all users with basic information only (email, role) - no password returned

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Users basic details retrieved successfully",
  "count": 3,
  "users": [
    {
      "id": 1,
      "email": "employee1@company.com",
      "role": "USER",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "email": "employee2@company.com",
      "role": "USER",
      "createdAt": "2024-01-16T10:00:00.000Z",
      "updatedAt": "2024-01-16T10:00:00.000Z"
    },
    {
      "id": 3,
      "email": "admin@company.com",
      "role": "ADMIN",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "updatedAt": "2024-01-10T08:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/admin/users/basic \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json"
```

---

### 2. Get Users with Login History

**Endpoint:** `GET /api/admin/users/history`

**Description:** Get all users with their complete login history and statistics

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Users with login history retrieved successfully",
  "count": 2,
  "users": [
    {
      "id": 1,
      "email": "employee1@company.com",
      "role": "USER",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      
      "loginStats": {
        "totalSessions": 25,
        "totalLoginHours": 45.5,
        "lastLogin": "2024-01-20T14:30:00.000Z",
        "currentSession": {
          "loginTime": "2024-01-20T14:30:00.000Z",
          "ipAddress": "192.168.1.100",
          "networkType": "wifi",
          "isActive": true
        }
      },
      
      "loginHistory": [
        {
          "id": 1,
          "loginTime": "2024-01-20T14:30:00.000Z",
          "logoutTime": null,
          "sessionDuration": null,
          "ipAddress": "192.168.1.100",
          "networkType": "wifi",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "isActive": true,
          "createdAt": "2024-01-20T14:30:00.000Z"
        },
        {
          "id": 2,
          "loginTime": "2024-01-19T09:15:00.000Z",
          "logoutTime": "2024-01-19T17:45:00.000Z",
          "sessionDuration": 510,
          "ipAddress": "192.168.1.100",
          "networkType": "wifi",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "isActive": false,
          "createdAt": "2024-01-19T09:15:00.000Z"
        }
      ]
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/admin/users/history \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json"
```

---

### 3. Get Users with Brand Access

**Endpoint:** `GET /api/admin/users/brands`

**Description:** Get all users with their brand access permissions only

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Users with brand access retrieved successfully",
  "count": 2,
  "users": [
    {
      "id": 1,
      "email": "employee1@company.com",
      "role": "USER",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      
      "brandAccess": [
        {
          "id": 1,
          "name": "Nike",
          "description": "Sports brand",
          "isActive": true,
          "grantedAt": "2024-01-16T10:00:00.000Z"
        },
        {
          "id": 2,
          "name": "Adidas",
          "description": "Sports brand",
          "isActive": false,
          "grantedAt": "2024-01-17T10:00:00.000Z"
        }
      ],
      
      "brandSummary": {
        "totalBrands": 1,
        "totalGranted": 2,
        "hasActiveBrands": true
      }
    },
    {
      "id": 2,
      "email": "employee2@company.com",
      "role": "USER",
      "createdAt": "2024-01-16T10:00:00.000Z",
      "updatedAt": "2024-01-16T10:00:00.000Z",
      
      "brandAccess": [],
      
      "brandSummary": {
        "totalBrands": 0,
        "totalGranted": 0,
        "hasActiveBrands": false
      }
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/admin/users/brands \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json"
```

---

### 4. Get Specific User Details

**Endpoint:** `GET /api/admin/users/:id`

**Description:** Get detailed information for a specific user by ID

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "All users with complete access details retrieved successfully",
  "users": [
    {
      "id": 1,
      "email": "employee1@company.com",
      "role": "USER",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      
      "loginStats": {
        "totalSessions": 25,
        "totalLoginHours": 45.5,
        "lastLogin": "2024-01-20T14:30:00.000Z",
        "currentSession": {
          "loginTime": "2024-01-20T14:30:00.000Z",
          "ipAddress": "192.168.1.100",
          "networkType": "wifi",
          "isActive": true
        }
      },
      
      "loginHistory": [
        {
          "id": 1,
          "loginTime": "2024-01-20T14:30:00.000Z",
          "logoutTime": null,
          "sessionDuration": null,
          "ipAddress": "192.168.1.100",
          "networkType": "wifi",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "isActive": true,
          "createdAt": "2024-01-20T14:30:00.000Z"
        },
        {
          "id": 2,
          "loginTime": "2024-01-19T09:15:00.000Z",
          "logoutTime": "2024-01-19T17:45:00.000Z",
          "sessionDuration": 510,
          "ipAddress": "192.168.1.100",
          "networkType": "wifi",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "isActive": false,
          "createdAt": "2024-01-19T09:15:00.000Z"
        },
        {
          "id": 3,
          "loginTime": "2024-01-18T08:00:00.000Z",
          "logoutTime": "2024-01-18T16:30:00.000Z",
          "sessionDuration": 510,
          "ipAddress": "192.168.1.101",
          "networkType": "4g",
          "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
          "isActive": false,
          "createdAt": "2024-01-18T08:00:00.000Z"
        }
      ],
      
      "brandAccess": [
        {
          "id": 1,
          "name": "Nike",
          "description": "Sports brand",
          "isActive": true,
          "grantedAt": "2024-01-16T10:00:00.000Z"
        },
        {
          "id": 2,
          "name": "Adidas",
          "description": "Sports brand",
          "isActive": false,
          "grantedAt": "2024-01-17T10:00:00.000Z"
        }
      ],
      
      "marketplaceAccess": [
        {
          "id": 1,
          "name": "Amazon",
          "description": "E-commerce platform",
          "isActive": true,
          "grantedAt": "2024-01-16T10:00:00.000Z"
        },
        {
          "id": 2,
          "name": "Flipkart",
          "description": "Indian e-commerce",
          "isActive": true,
          "grantedAt": "2024-01-17T10:00:00.000Z"
        }
      ],
      
      "shippingAccess": [
        {
          "id": 1,
          "name": "FedEx",
          "description": "Express shipping",
          "isActive": true,
          "grantedAt": "2024-01-16T10:00:00.000Z"
        }
      ],
      
      "accessSummary": {
        "totalBrands": 1,
        "totalMarketplaces": 2,
        "totalShippingCompanies": 1,
        "hasAnyAccess": true
      }
    },
    {
      "id": 2,
      "email": "admin@company.com",
      "role": "ADMIN",
      "createdAt": "2024-01-10T09:00:00.000Z",
      "updatedAt": "2024-01-10T09:00:00.000Z",
      
      "loginStats": {
        "totalSessions": 50,
        "totalLoginHours": 120.75,
        "lastLogin": "2024-01-20T08:00:00.000Z",
        "currentSession": null
      },
      
      "brandAccess": [],
      "marketplaceAccess": [],
      "shippingAccess": [],
      
      "accessSummary": {
        "totalBrands": 0,
        "totalMarketplaces": 0,
        "totalShippingCompanies": 0,
        "hasAnyAccess": false
      }
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Specific User Details

**Endpoint:** `GET /api/admin/users/:id`

**Description:** Get detailed information about a specific user

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID

**Response (Success - 200):**
```json
{
  "message": "User details retrieved successfully",
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
        "description": "Sports brand",
        "isActive": true,
        "grantedAt": "2024-01-16T10:00:00.000Z"
      },
      {
        "id": 2,
        "name": "Adidas",
        "description": "German brand",
        "isActive": false,
        "grantedAt": "2024-01-17T10:00:00.000Z"
      }
    ],
    "marketplaceAccess": [
      {
        "id": 1,
        "name": "Amazon",
        "description": "E-commerce platform",
        "isActive": true,
        "grantedAt": "2024-01-16T10:00:00.000Z"
      }
    ],
    "shippingAccess": [
      {
        "id": 1,
        "name": "FedEx",
        "description": "Courier service",
        "isActive": true,
        "grantedAt": "2024-01-16T10:00:00.000Z"
      }
    ],
    "loginHistory": [
      {
        "id": 1,
        "loginTime": "2024-01-20T14:30:00.000Z",
        "logoutTime": "2024-01-20T16:30:00.000Z",
        "sessionDuration": 120,
        "ipAddress": "192.168.1.100",
        "networkType": "wifi",
        "userAgent": "Mozilla/5.0..."
      }
    ]
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "User not found"
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/admin/users/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Update User Email

**Endpoint:** `PUT /api/admin/users/:id/email`

**Description:** Update a user's email address

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "User email updated successfully",
  "user": {
    "id": 1,
    "email": "newemail@example.com",
    "role": "USER",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "error": "Email is already taken by another user"
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.23:5000/api/admin/users/1/email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "email": "newemail@example.com"
  }'
```

---

### 4. Update User Password

**Endpoint:** `PUT /api/admin/users/:id/password`

**Description:** Update a user's password

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

**Response (Success - 200):**
```json
{
  "message": "User password updated successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "USER",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.23:5000/api/admin/users/1/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "password": "newpassword123"
  }'
```

---

### 5. Update User Role

**Endpoint:** `PUT /api/admin/users/:id/role`

**Description:** Update a user's role (USER or ADMIN)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Response (Success - 200):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "ADMIN",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**Response (Error - 400):**
```json
{
  "error": "Cannot change your own role"
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.23:5000/api/admin/users/1/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "role": "ADMIN"
  }'
```

---

## 🔒 Security Notes

### Admin Access Requirements
- Must be authenticated with valid access token
- Must have `ADMIN` role
- Cannot modify own role (security measure)

### Validation Rules
- **Email:** Must be valid email format and unique
- **Password:** Minimum 6 characters
- **Role:** Must be either `USER` or `ADMIN`

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Validation failed | Invalid request data |
| 401 | Access token required | Missing authorization header |
| 403 | Admin access required | User is not admin |
| 404 | User not found | User ID doesn't exist |
| 400 | Cannot change your own role | Admin trying to change own role |
| 400 | Email is already taken | Email already exists |
| 500 | Failed to update user | Server error |

---

## 📊 User Statistics Explanation

### Login Statistics
- **totalLoginHours:** Total hours user has been logged in
- **totalSessions:** Number of login sessions
- **lastLogin:** Most recent login timestamp
- **currentSession:** Active session details (null if not logged in)

### Current Session Details
- **loginTime:** When current session started
- **isActive:** Whether user is currently logged in
- **ipAddress:** IP address of current session
- **networkType:** Network connection type (wifi, 4g, etc.)
- **currentDuration:** Minutes since login
