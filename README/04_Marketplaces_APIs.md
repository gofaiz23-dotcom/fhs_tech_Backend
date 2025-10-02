# Marketplaces APIs Documentation

Base URL: `http://192.168.0.23:5000/api`

## 📋 Overview
Complete CRUD operations for marketplace management with support for single marketplace, multiple marketplaces, and bulk file upload (CSV/Excel).

---

## 🛒 Marketplace Endpoints

### 1. Get All Marketplaces

**Endpoint:** `GET /api/marketplaces`

**Description:** Get all marketplaces (filtered by user access for regular users, all marketplaces for admin)

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Marketplaces retrieved successfully",
  "marketplaces": [
    {
      "id": 1,
      "name": "Amazon",
      "description": "Global e-commerce platform",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Flipkart",
      "description": "Indian e-commerce company",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/marketplaces \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Specific Marketplace

**Endpoint:** `GET /api/marketplaces/:id`

**Description:** Get details of a specific marketplace

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (integer): Marketplace ID

**Response (Success - 200):**
```json
{
  "message": "Marketplace retrieved successfully",
  "marketplace": {
    "id": 1,
    "name": "Amazon",
    "description": "Global e-commerce platform",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "Marketplace not found"
}
```

**Response (Error - 403):**
```json
{
  "error": "Access denied to this marketplace"
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/marketplaces/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Create Marketplace(s) - Multiple Methods

**Endpoint:** `POST /api/marketplaces`

**Description:** Create marketplace(s) using JSON data or file upload (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

#### Method 1: Single Marketplace (JSON)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**Request Body:**
```json
{
  "name": "Amazon",
  "description": "Global e-commerce platform"
}
```

#### Method 2: Multiple Marketplaces (JSON)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**Request Body:**
```json
{
  "marketplaces": [
    {
      "name": "Amazon",
      "description": "Global e-commerce platform"
    },
    {
      "name": "Flipkart",
      "description": "Indian e-commerce company"
    },
    {
      "name": "Myntra",
      "description": "Fashion e-commerce platform"
    }
  ]
}
```

#### Method 3: File Upload (CSV/Excel)

**Headers:**
```json
{
  "Content-Type": "multipart/form-data",
  "Authorization": "Bearer <admin_access_token>"
}
```

**Form Data:**
- `file`: CSV or Excel file (.csv, .xlsx, .xls)

**CSV File Format:**
```csv
name,description
Amazon,Global e-commerce platform
Flipkart,Indian e-commerce company
Myntra,Fashion e-commerce platform
Snapdeal,Indian e-commerce platform
Paytm Mall,Indian e-commerce platform
```

**Excel File Format:**
Same structure as CSV with columns:
- Column A: name
- Column B: description

**Response (Success - 201):**
```json
{
  "message": "Processed 5 marketplace(s)",
  "summary": {
    "total": 5,
    "created": 4,
    "duplicates": 1,
    "errors": 0
  },
  "results": {
    "created": [
      {
        "id": 1,
        "name": "Amazon",
        "description": "Global e-commerce platform",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": 2,
        "name": "Flipkart",
        "description": "Indian e-commerce company",
        "createdAt": "2024-01-15T10:01:00.000Z",
        "updatedAt": "2024-01-15T10:01:00.000Z"
      }
    ],
    "duplicates": [
      {
        "name": "Myntra",
        "error": "Marketplace name already exists"
      }
    ],
    "errors": []
  }
}
```

**cURL Examples:**

**Single Marketplace:**
```bash
curl -X POST http://192.168.0.23:5000/api/marketplaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Amazon",
    "description": "Global e-commerce platform"
  }'
```

**Multiple Marketplaces:**
```bash
curl -X POST http://192.168.0.23:5000/api/marketplaces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "marketplaces": [
      {"name": "Amazon", "description": "Global platform"},
      {"name": "Flipkart", "description": "Indian platform"}
    ]
  }'
```

**File Upload:**
```bash
curl -X POST http://192.168.0.23:5000/api/marketplaces \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@marketplaces.csv"
```

---

### 4. Update Marketplace

**Endpoint:** `PUT /api/marketplaces/:id`

**Description:** Update an existing marketplace (Admin only)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): Marketplace ID

**Request Body:**
```json
{
  "name": "Amazon Updated",
  "description": "Updated description for Amazon marketplace"
}
```

**Response (Success - 200):**
```json
{
  "message": "Marketplace updated successfully",
  "marketplace": {
    "id": 1,
    "name": "Amazon Updated",
    "description": "Updated description for Amazon marketplace",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "Marketplace not found"
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.23:5000/api/marketplaces/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Amazon Updated",
    "description": "Updated description for Amazon marketplace"
  }'
```

---

### 5. Delete Marketplace

**Endpoint:** `DELETE /api/marketplaces/:id`

**Description:** Delete a marketplace (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): Marketplace ID

**Response (Success - 200):**
```json
{
  "message": "Marketplace deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Marketplace not found"
}
```

**cURL Example:**
```bash
curl -X DELETE http://192.168.0.23:5000/api/marketplaces/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📁 File Upload Specifications

### Supported File Types
- **CSV:** `.csv`
- **Excel:** `.xlsx`, `.xls`

### File Size Limit
- **Maximum:** 10MB per file

### Required Columns
| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Marketplace name (unique) |
| description | No | Marketplace description |

### File Processing
- Files are processed directly in memory (no disk storage)
- Empty rows are automatically filtered out
- Duplicate names are reported but don't stop processing
- Invalid rows are reported with specific error messages

---

## 🔒 Access Control

### Admin Users
- Can view all marketplaces
- Can create, update, and delete marketplaces
- Can upload files for bulk creation

### Regular Users
- Can only view marketplaces they have access to
- Cannot create, update, or delete marketplaces
- Access is controlled by admin through permission system

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid request format | Missing required fields |
| 400 | Marketplace name is required | Name field is empty |
| 400 | File validation failed | File format or content errors |
| 400 | File too large | File exceeds 10MB limit |
| 401 | Access token required | Missing authorization |
| 403 | Admin access required | User is not admin |
| 403 | Access denied to this marketplace | User lacks marketplace access |
| 404 | Marketplace not found | Marketplace ID doesn't exist |
| 500 | Failed to create marketplace(s) | Server error |

---

## 📊 Popular Marketplaces Examples

### Indian Marketplaces
```csv
name,description
Amazon India,Indian branch of global e-commerce platform
Flipkart,Leading Indian e-commerce company
Myntra,Fashion and lifestyle e-commerce platform
Snapdeal,Indian online marketplace
Paytm Mall,Digital commerce platform by Paytm
Shopclues,Indian online marketplace
Nykaa,Beauty and wellness e-commerce platform
BigBasket,Online grocery delivery platform
Grofers,Online grocery and essentials platform
Urban Ladder,Furniture and home decor e-commerce
```

### Global Marketplaces
```csv
name,description
Amazon,Global e-commerce and cloud computing company
eBay,American multinational e-commerce corporation
Alibaba,Chinese multinational technology company
Etsy,American e-commerce website for handmade items
Walmart,American multinational retail corporation
Target,American retail corporation
Best Buy,American multinational consumer electronics retailer
Wayfair,American e-commerce company selling furniture
Overstock,American internet retailer selling home goods
Newegg,American online retailer of computer hardware
```

---

## 📱 Frontend Integration Example

```javascript
// Get user's accessible marketplaces
async function getMarketplaces() {
  const response = await fetch('http://192.168.0.23:5000/api/marketplaces', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
}

// Create multiple marketplaces
async function createMarketplaces(marketplaces) {
  const response = await fetch('http://192.168.0.23:5000/api/marketplaces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ marketplaces })
  });
  return response.json();
}

// Upload marketplace file
async function uploadMarketplaceFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://192.168.0.23:5000/api/marketplaces', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  return response.json();
}
```
