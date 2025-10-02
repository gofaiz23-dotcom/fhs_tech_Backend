# Shipping Companies APIs Documentation

Base URL: `http://192.168.0.23:5000/api`

## 📋 Overview
Complete CRUD operations for shipping company management with support for single company, multiple companies, and bulk file upload (CSV/Excel).

---

## 🚚 Shipping Company Endpoints

### 1. Get All Shipping Companies

**Endpoint:** `GET /api/shipping`

**Description:** Get all shipping companies (filtered by user access for regular users, all companies for admin)

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Shipping companies retrieved successfully",
  "shippingCompanies": [
    {
      "id": 1,
      "name": "FedEx",
      "description": "International courier delivery services",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "DHL",
      "description": "German logistics company",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/shipping \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Specific Shipping Company

**Endpoint:** `GET /api/shipping/:id`

**Description:** Get details of a specific shipping company

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (integer): Shipping Company ID

**Response (Success - 200):**
```json
{
  "message": "Shipping company retrieved successfully",
  "shippingCompany": {
    "id": 1,
    "name": "FedEx",
    "description": "International courier delivery services",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "Shipping company not found"
}
```

**Response (Error - 403):**
```json
{
  "error": "Access denied to this shipping company"
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.23:5000/api/shipping/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Create Shipping Company(s) - Multiple Methods

**Endpoint:** `POST /api/shipping`

**Description:** Create shipping company(s) using JSON data or file upload (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

#### Method 1: Single Shipping Company (JSON)

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
  "name": "FedEx",
  "description": "International courier delivery services"
}
```

#### Method 2: Multiple Shipping Companies (JSON)

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
  "shippingCompanies": [
    {
      "name": "FedEx",
      "description": "International courier delivery services"
    },
    {
      "name": "DHL",
      "description": "German logistics company"
    },
    {
      "name": "UPS",
      "description": "American multinational shipping company"
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
FedEx,International courier delivery services
DHL,German logistics company
UPS,American multinational shipping company
Blue Dart,Indian courier delivery company
DTDC,Indian courier and cargo company
```

**Excel File Format:**
Same structure as CSV with columns:
- Column A: name
- Column B: description

**Response (Success - 201):**
```json
{
  "message": "Processed 5 shipping company(s)",
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
        "name": "FedEx",
        "description": "International courier delivery services",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": 2,
        "name": "DHL",
        "description": "German logistics company",
        "createdAt": "2024-01-15T10:01:00.000Z",
        "updatedAt": "2024-01-15T10:01:00.000Z"
      }
    ],
    "duplicates": [
      {
        "name": "UPS",
        "error": "Shipping company name already exists"
      }
    ],
    "errors": []
  }
}
```

**cURL Examples:**

**Single Shipping Company:**
```bash
curl -X POST http://192.168.0.23:5000/api/shipping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "FedEx",
    "description": "International courier delivery services"
  }'
```

**Multiple Shipping Companies:**
```bash
curl -X POST http://192.168.0.23:5000/api/shipping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "shippingCompanies": [
      {"name": "FedEx", "description": "International courier"},
      {"name": "DHL", "description": "German logistics"}
    ]
  }'
```

**File Upload:**
```bash
curl -X POST http://192.168.0.23:5000/api/shipping \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@shipping_companies.csv"
```

---

### 4. Update Shipping Company

**Endpoint:** `PUT /api/shipping/:id`

**Description:** Update an existing shipping company (Admin only)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): Shipping Company ID

**Request Body:**
```json
{
  "name": "FedEx Updated",
  "description": "Updated description for FedEx shipping services"
}
```

**Response (Success - 200):**
```json
{
  "message": "Shipping company updated successfully",
  "shippingCompany": {
    "id": 1,
    "name": "FedEx Updated",
    "description": "Updated description for FedEx shipping services",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "Shipping company not found"
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.23:5000/api/shipping/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "FedEx Updated",
    "description": "Updated description for FedEx shipping services"
  }'
```

---

### 5. Delete Shipping Company

**Endpoint:** `DELETE /api/shipping/:id`

**Description:** Delete a shipping company (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): Shipping Company ID

**Response (Success - 200):**
```json
{
  "message": "Shipping company deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Shipping company not found"
}
```

**cURL Example:**
```bash
curl -X DELETE http://192.168.0.23:5000/api/shipping/1 \
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
| name | Yes | Shipping company name (unique) |
| description | No | Company description |

### File Processing
- Files are processed directly in memory (no disk storage)
- Empty rows are automatically filtered out
- Duplicate names are reported but don't stop processing
- Invalid rows are reported with specific error messages

---

## 🔒 Access Control

### Admin Users
- Can view all shipping companies
- Can create, update, and delete shipping companies
- Can upload files for bulk creation

### Regular Users
- Can only view shipping companies they have access to
- Cannot create, update, or delete shipping companies
- Access is controlled by admin through permission system

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid request format | Missing required fields |
| 400 | Shipping company name is required | Name field is empty |
| 400 | File validation failed | File format or content errors |
| 400 | File too large | File exceeds 10MB limit |
| 401 | Access token required | Missing authorization |
| 403 | Admin access required | User is not admin |
| 403 | Access denied to this shipping company | User lacks shipping access |
| 404 | Shipping company not found | Company ID doesn't exist |
| 500 | Failed to create shipping company(s) | Server error |

---

## 📊 Popular Shipping Companies Examples

### International Shipping Companies
```csv
name,description
FedEx,International courier delivery services
DHL,German logistics company
UPS,American multinational shipping company
TNT,Dutch courier delivery services
Aramex,Emirati multinational logistics company
DPD,European parcel delivery network
GLS,European logistics company
Hermes,German delivery company
Royal Mail,British postal service
Canada Post,Canadian postal service
```

### Indian Shipping Companies
```csv
name,description
Blue Dart,Indian courier delivery company
DTDC,Indian courier and cargo company
Delhivery,Indian logistics and supply chain company
Ecom Express,Indian e-commerce logistics company
Xpressbees,Indian logistics company
Shadowfax,Indian logistics startup
Ekart,Flipkart's logistics arm
India Post,Indian postal service
Gati,Indian express distribution company
Professional Couriers,Indian courier company
```

### Regional & Specialized Carriers
```csv
name,description
OnTrac,Regional package delivery company (US West Coast)
LaserShip,Regional package delivery (US East Coast)
Purolator,Canadian courier company
Australia Post,Australian postal corporation
Japan Post,Japanese postal service
China Post,Chinese postal service
Korea Post,South Korean postal service
Singapore Post,Singaporean postal service
Thailand Post,Thai postal service
Malaysia Post,Malaysian postal service
```

---

## 📱 Frontend Integration Example

```javascript
// Get user's accessible shipping companies
async function getShippingCompanies() {
  const response = await fetch('http://192.168.0.23:5000/api/shipping', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
}

// Create multiple shipping companies
async function createShippingCompanies(companies) {
  const response = await fetch('http://192.168.0.23:5000/api/shipping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ shippingCompanies: companies })
  });
  return response.json();
}

// Upload shipping companies file
async function uploadShippingFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://192.168.0.23:5000/api/shipping', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });
  return response.json();
}

// Update shipping company
async function updateShippingCompany(id, data) {
  const response = await fetch(`http://192.168.0.23:5000/api/shipping/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

// Delete shipping company
async function deleteShippingCompany(id) {
  const response = await fetch(`http://192.168.0.23:5000/api/shipping/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
}
```

---

## 🌍 Shipping Company Categories

### By Service Type
- **Express/Overnight:** FedEx, DHL, UPS
- **Standard Ground:** UPS Ground, FedEx Ground
- **International:** DHL, FedEx International, UPS Worldwide
- **Regional:** OnTrac, LaserShip, Regional carriers
- **Postal Services:** USPS, Royal Mail, India Post
- **E-commerce Focused:** Amazon Logistics, Flipkart Ekart

### By Coverage Area
- **Global:** FedEx, DHL, UPS
- **Regional:** OnTrac (US West), LaserShip (US East)
- **National:** Blue Dart (India), Canada Post (Canada)
- **Local:** City-specific courier services

### By Specialization
- **Documents:** DHL Express, FedEx Express
- **E-commerce:** Delhivery, Ecom Express, Amazon Logistics
- **Heavy Freight:** FedEx Freight, UPS Freight
- **Same-day:** Shadowfax, Dunzo, local couriers
