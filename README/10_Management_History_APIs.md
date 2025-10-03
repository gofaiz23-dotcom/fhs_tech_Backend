# Management History APIs Documentation

Base URL: `http://192.168.0.23:5000/api`

## 📋 Overview
Complete management history tracking system for all admin operations including user management, brand management, marketplace management, and shipping management.

**Note:** All management history APIs require admin authentication token.

---

## 📊 Management History Endpoints

### 1. Get All Management History

**Endpoint:** `GET /api/management/history`

**Description:** Get complete management history for all admin operations (users, brands, marketplaces, shipping)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Management history retrieved successfully",
  "summary": {
    "totalUserActions": 15,
    "totalBrandActions": 8,
    "totalMarketplaceActions": 12,
    "totalShippingActions": 6,
    "totalActions": 41
  },
  "history": [
    {
      "id": 1,
      "type": "USER_MANAGEMENT",
      "action": "CREATE",
      "admin": {
        "id": 1,
        "username": "admin_user",
        "email": "admin@company.com",
        "role": "ADMIN"
      },
      "targetUser": {
        "id": 2,
        "username": "john_doe",
        "email": "john@company.com",
        "role": "USER"
      },
      "details": {
        "oldData": null,
        "newData": {
          "username": "john_doe",
          "email": "john@company.com",
          "role": "USER"
        },
        "timestamp": "2024-01-20T10:30:00.000Z"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": 2,
      "type": "BRAND_MANAGEMENT",
      "action": "UPDATE",
      "admin": {
        "id": 1,
        "username": "admin_user",
        "email": "admin@company.com",
        "role": "ADMIN"
      },
      "brand": {
        "id": 1,
        "name": "Nike",
        "description": "Sports brand"
      },
      "details": {
        "oldData": {
          "name": "Nike",
          "description": "Sports brand"
        },
        "newData": {
          "name": "Nike",
          "description": "Premium sports brand"
        },
        "timestamp": "2024-01-20T09:15:00.000Z"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "createdAt": "2024-01-20T09:15:00.000Z"
    },
    {
      "id": 3,
      "type": "MARKETPLACE_MANAGEMENT",
      "action": "DELETE",
      "admin": {
        "id": 1,
        "username": "admin_user",
        "email": "admin@company.com",
        "role": "ADMIN"
      },
      "marketplace": {
        "id": 1,
        "name": "Amazon",
        "description": "E-commerce platform"
      },
      "details": {
        "oldData": {
          "name": "Amazon",
          "description": "E-commerce platform"
        },
        "newData": null,
        "timestamp": "2024-01-20T08:45:00.000Z"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "createdAt": "2024-01-20T08:45:00.000Z"
    }
  ],
  "categorizedHistory": {
    "userManagement": [...],
    "brandManagement": [...],
    "marketplaceManagement": [...],
    "shippingManagement": [...]
  }
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/management/history \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json"
```

---

### 2. Get Management History Summary

**Endpoint:** `GET /api/management/history/summary`

**Description:** Get summary statistics and recent actions for management history

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Management history summary retrieved successfully",
  "summary": {
    "totalUserActions": 15,
    "totalBrandActions": 8,
    "totalMarketplaceActions": 12,
    "totalShippingActions": 6,
    "totalActions": 41
  },
  "recentActions": {
    "userManagement": [
      {
        "id": 1,
        "action": "CREATE",
        "admin": {
          "username": "admin_user",
          "email": "admin@company.com"
        },
        "targetUser": {
          "username": "john_doe",
          "email": "john@company.com"
        },
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "brandManagement": [
      {
        "id": 2,
        "action": "UPDATE",
        "admin": {
          "username": "admin_user",
          "email": "admin@company.com"
        },
        "brand": {
          "name": "Nike"
        },
        "createdAt": "2024-01-20T09:15:00.000Z"
      }
    ],
    "marketplaceManagement": [...],
    "shippingManagement": [...]
  }
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/management/history/summary \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json"
```

---

## 🔍 History Tracking Details

### **Tracked Actions:**

#### **User Management:**
- `CREATE` - User registration
- `UPDATE` - User details update
- `DELETE` - User deletion
- `ROLE_CHANGE` - Role modification
- `EMAIL_CHANGE` - Email update
- `PASSWORD_CHANGE` - Password reset

#### **Brand Management:**
- `CREATE` - Brand creation
- `UPDATE` - Brand details update
- `DELETE` - Brand deletion

#### **Marketplace Management:**
- `CREATE` - Marketplace creation
- `UPDATE` - Marketplace details update
- `DELETE` - Marketplace deletion

#### **Shipping Management:**
- `CREATE` - Shipping company creation
- `UPDATE` - Shipping company update
- `DELETE` - Shipping company deletion

### **History Data Structure:**

```json
{
  "id": 1,
  "type": "USER_MANAGEMENT|BRAND_MANAGEMENT|MARKETPLACE_MANAGEMENT|SHIPPING_MANAGEMENT",
  "action": "CREATE|UPDATE|DELETE|ROLE_CHANGE|EMAIL_CHANGE|PASSWORD_CHANGE",
  "admin": {
    "id": 1,
    "username": "admin_user",
    "email": "admin@company.com",
    "role": "ADMIN"
  },
  "targetUser|brand|marketplace|shipping": {
    "id": 1,
    "name": "Target Name",
    "email": "target@email.com" // for users
  },
  "details": {
    "oldData": { /* previous values */ },
    "newData": { /* new values */ },
    "timestamp": "2024-01-20T10:30:00.000Z",
    "additionalInfo": { /* any extra context */ }
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "createdAt": "2024-01-20T10:30:00.000Z"
}
```

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Validation failed | Invalid request data |
| 401 | Access token required | Missing authorization header |
| 403 | Admin access required | User is not admin |
| 500 | Failed to retrieve management history | Server error |

---

## 📊 Future Extensions

### **Planned History Tracking:**
- **Inventory History** - Product stock changes
- **Listing History** - Product listing modifications
- **Shipping History** - Shipment tracking
- **Order History** - Order processing
- **Payment History** - Transaction tracking

### **Advanced Features:**
- **Filtering** - Filter by action type, date range, admin
- **Search** - Search within history details
- **Export** - Export history to CSV/Excel
- **Analytics** - Management activity analytics
- **Notifications** - Real-time activity alerts

---

## 🔒 Security Features

### **Admin Access Requirements**
- Must be authenticated with valid access token
- Must have `ADMIN` role
- All actions are logged with admin identity

### **Data Privacy**
- IP addresses and user agents are logged for security
- Sensitive data (passwords) are not stored in history
- History records are immutable (cannot be modified)

### **Audit Trail**
- Complete audit trail of all admin operations
- Timestamp tracking for all actions
- Detailed change tracking (old vs new values)
- Admin accountability through identity tracking

---

## 📱 Frontend Integration Example

```javascript
// Get management history
const getManagementHistory = async () => {
  const response = await fetch('http://192.168.0.23:5000/api/management/history', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  const data = await response.json();
  return data;
};

// Get management summary
const getManagementSummary = async () => {
  const response = await fetch('http://192.168.0.23:5000/api/management/history/summary', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  const data = await response.json();
  return data;
};
```

---

**Note:** This management history system provides complete transparency and accountability for all admin operations, ensuring proper audit trails for compliance and security purposes.
