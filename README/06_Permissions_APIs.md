# Permissions APIs Documentation

Base URL: `http://192.168.0.23:5000/api`

## 📋 Overview
Permission management system for controlling user access to brands, marketplaces, and shipping companies. Only admins can manage permissions.

---

## 🔐 Permission Management Endpoints

### Brand Permissions

#### 1. Get User's Brand Access

**Endpoint:** `GET /api/users/:id/brands`

**Description:** Get all brand permissions for a specific user (Admin only)

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
  "message": "User brand access retrieved successfully",
  "brandAccess": [
    {
      "id": 1,
      "name": "Nike",
      "description": "Sports and athletic wear brand",
      "isActive": true,
      "grantedAt": "2024-01-16T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Adidas",
      "description": "German multinational corporation",
      "isActive": false,
      "grantedAt": "2024-01-17T10:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/users/1/brands \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 2. Grant Brand Access

**Endpoint:** `POST /api/users/:id/brands`

**Description:** Grant brand access to a user (Admin only)

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
  "brandId": 1
}
```

**Response (Success - 201):**
```json
{
  "message": "Brand access granted successfully",
  "access": {
    "userId": 1,
    "brandId": 1,
    "isActive": true,
    "grantedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "User not found"
}
```

**Response (Error - 404):**
```json
{
  "error": "Brand not found"
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/users/1/brands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "brandId": 1
  }'
```

---

#### 3. Toggle Brand Access

**Endpoint:** `POST /api/users/:id/brands/:brandId/toggle`

**Description:** Toggle brand access on/off for a user (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID
- `brandId` (integer): Brand ID

**Response (Success - 200):**
```json
{
  "message": "Brand access enabled successfully",
  "access": {
    "userId": 1,
    "brandId": 1,
    "isActive": true,
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/users/1/brands/1/toggle \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Marketplace Permissions

#### 4. Get User's Marketplace Access

**Endpoint:** `GET /api/users/:id/marketplaces`

**Description:** Get all marketplace permissions for a specific user (Admin only)

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
  "message": "User marketplace access retrieved successfully",
  "marketplaceAccess": [
    {
      "id": 1,
      "name": "Amazon",
      "description": "Global e-commerce platform",
      "isActive": true,
      "grantedAt": "2024-01-16T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Flipkart",
      "description": "Indian e-commerce company",
      "isActive": false,
      "grantedAt": "2024-01-17T10:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/users/1/marketplaces \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 5. Grant Marketplace Access

**Endpoint:** `POST /api/users/:id/marketplaces`

**Description:** Grant marketplace access to a user (Admin only)

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
  "marketplaceId": 1
}
```

**Response (Success - 201):**
```json
{
  "message": "Marketplace access granted successfully",
  "access": {
    "userId": 1,
    "marketplaceId": 1,
    "isActive": true,
    "grantedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/users/1/marketplaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "marketplaceId": 1
  }'
```

---

#### 6. Toggle Marketplace Access

**Endpoint:** `POST /api/users/:id/marketplaces/:marketplaceId/toggle`

**Description:** Toggle marketplace access on/off for a user (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID
- `marketplaceId` (integer): Marketplace ID

**Response (Success - 200):**
```json
{
  "message": "Marketplace access disabled successfully",
  "access": {
    "userId": 1,
    "marketplaceId": 1,
    "isActive": false,
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/users/1/marketplaces/1/toggle \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Shipping Permissions

#### 7. Get User's Shipping Access

**Endpoint:** `GET /api/users/:id/shipping`

**Description:** Get all shipping company permissions for a specific user (Admin only)

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
  "message": "User shipping access retrieved successfully",
  "shippingAccess": [
    {
      "id": 1,
      "name": "FedEx",
      "description": "International courier delivery services",
      "isActive": true,
      "grantedAt": "2024-01-16T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "DHL",
      "description": "German logistics company",
      "isActive": false,
      "grantedAt": "2024-01-17T10:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/users/1/shipping \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 8. Grant Shipping Access

**Endpoint:** `POST /api/users/:id/shipping`

**Description:** Grant shipping company access to a user (Admin only)

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
  "shippingCompanyId": 1
}
```

**Response (Success - 201):**
```json
{
  "message": "Shipping access granted successfully",
  "access": {
    "userId": 1,
    "shippingCompanyId": 1,
    "isActive": true,
    "grantedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/users/1/shipping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "shippingCompanyId": 1
  }'
```

---

#### 9. Toggle Shipping Access

**Endpoint:** `POST /api/users/:id/shipping/:shippingId/toggle`

**Description:** Toggle shipping company access on/off for a user (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): User ID
- `shippingId` (integer): Shipping Company ID

**Response (Success - 200):**
```json
{
  "message": "Shipping access enabled successfully",
  "access": {
    "userId": 1,
    "shippingCompanyId": 1,
    "isActive": true,
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.23:5000/api/users/1/shipping/1/toggle \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔒 Permission System Overview

### How Permissions Work

#### 1. Default State
- New users have **NO permissions** by default
- Users can only see entities they have active access to
- Admin users can see **ALL entities** regardless of permissions

#### 2. Permission States
- **Active (isActive: true):** User can access the entity
- **Inactive (isActive: false):** User cannot access the entity (soft disabled)

#### 3. Toggle System
- Permissions are **never deleted**, only toggled on/off
- This maintains audit trail and allows easy re-enabling
- Admin can see full permission history

### Access Control Matrix

| User Role | View All | Create | Update | Delete | Manage Permissions |
|-----------|----------|--------|--------|--------|--------------------|
| **Admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **User** | ❌ No (filtered) | ❌ No | ❌ No | ❌ No | ❌ No |

---

## 📊 Permission Management Scenarios

### Scenario 1: New Employee Onboarding
```bash
# 1. Admin creates user
curl -X POST http://192.168.0.23:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"email": "employee@company.com", "password": "temp123", "role": "USER"}'

# 2. Grant brand access
curl -X POST http://192.168.0.23:5000/api/users/1/brands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"brandId": 1}'

# 3. Grant marketplace access
curl -X POST http://192.168.0.23:5000/api/users/1/marketplaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"marketplaceId": 1}'

# 4. Grant shipping access
curl -X POST http://192.168.0.23:5000/api/users/1/shipping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"shippingCompanyId": 1}'
```

### Scenario 2: Temporary Access Suspension
```bash
# Disable brand access (without deleting permission)
curl -X POST http://192.168.0.23:5000/api/users/1/brands/1/toggle \
  -H "Authorization: Bearer <admin_token>"

# Later, re-enable access
curl -X POST http://192.168.0.23:5000/api/users/1/brands/1/toggle \
  -H "Authorization: Bearer <admin_token>"
```

### Scenario 3: Role Change
```bash
# Check current permissions
curl -X GET http://192.168.0.23:5000/api/users/1/brands \
  -H "Authorization: Bearer <admin_token>"

# Promote to admin (gets access to everything)
curl -X PUT http://192.168.0.23:5000/api/admin/users/1/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"role": "ADMIN"}'
```

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid request format | Missing required fields |
| 401 | Access token required | Missing authorization |
| 403 | Admin access required | User is not admin |
| 404 | User not found | User ID doesn't exist |
| 404 | Brand not found | Brand ID doesn't exist |
| 404 | Marketplace not found | Marketplace ID doesn't exist |
| 404 | Shipping company not found | Shipping company ID doesn't exist |
| 500 | Failed to grant access | Server error |
| 500 | Failed to toggle access | Server error |

---

## 📱 Frontend Integration Example

```javascript
// Permission management class
class PermissionManager {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'http://192.168.0.23:5000/api';
  }

  // Get user's brand permissions
  async getUserBrandPermissions(userId) {
    const response = await fetch(`${this.baseUrl}/users/${userId}/brands`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    return response.json();
  }

  // Grant brand access
  async grantBrandAccess(userId, brandId) {
    const response = await fetch(`${this.baseUrl}/users/${userId}/brands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ brandId })
    });
    return response.json();
  }

  // Toggle brand access
  async toggleBrandAccess(userId, brandId) {
    const response = await fetch(`${this.baseUrl}/users/${userId}/brands/${brandId}/toggle`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    return response.json();
  }

  // Bulk permission management
  async setupUserPermissions(userId, permissions) {
    const results = [];
    
    // Grant brand permissions
    for (const brandId of permissions.brands || []) {
      const result = await this.grantBrandAccess(userId, brandId);
      results.push({ type: 'brand', brandId, result });
    }
    
    // Grant marketplace permissions
    for (const marketplaceId of permissions.marketplaces || []) {
      const result = await this.grantMarketplaceAccess(userId, marketplaceId);
      results.push({ type: 'marketplace', marketplaceId, result });
    }
    
    // Grant shipping permissions
    for (const shippingId of permissions.shipping || []) {
      const result = await this.grantShippingAccess(userId, shippingId);
      results.push({ type: 'shipping', shippingId, result });
    }
    
    return results;
  }
}

// Usage example
const permissionManager = new PermissionManager(adminToken);

// Setup new employee with specific permissions
await permissionManager.setupUserPermissions(newUserId, {
  brands: [1, 2, 3],        // Nike, Adidas, Puma
  marketplaces: [1, 2],     // Amazon, Flipkart
  shipping: [1, 2, 3]       // FedEx, DHL, UPS
});
```

---

## 🎯 Best Practices

### 1. Principle of Least Privilege
- Grant only necessary permissions
- Start with minimal access and add as needed
- Regular permission audits

### 2. Permission Lifecycle
- **Grant:** When user needs access
- **Toggle Off:** For temporary suspension
- **Toggle On:** To restore access
- **Never Delete:** Maintain audit trail

### 3. Bulk Operations
- Use batch API calls for multiple permissions
- Implement error handling for partial failures
- Provide clear feedback on operation results

### 4. Monitoring
- Track permission changes
- Log access attempts
- Monitor for unusual permission patterns
