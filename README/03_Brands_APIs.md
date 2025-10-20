# Brands APIs Documentation

Base URL: `http://192.168.0.22:5000/api`

## 📋 Overview
Complete CRUD operations for brand management with support for single brand, multiple brands, and bulk file upload (CSV/Excel).

---

## 🏷️ Brand Endpoints

### 1. Get All Brands

**Endpoint:** `GET /api/brands`

**Description:** Get all brands (filtered by user access for regular users, all brands for admin)

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "Brands retrieved successfully",
  "brands": [
    {
      "id": 1,
      "name": "Nike",
      "description": "Sports and athletic wear brand",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Adidas",
      "description": "German multinational corporation",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.22:5000/api/brands \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 2. Get Specific Brand

**Endpoint:** `GET /api/brands/:id`

**Description:** Get details of a specific brand

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (integer): Brand ID

**Response (Success - 200):**
```json
{
  "message": "Brand retrieved successfully",
  "brand": {
    "id": 1,
    "name": "Nike",
    "description": "Sports and athletic wear brand",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Response (Error - 404):**
```json
{
  "error": "Brand not found"
}
```

**Response (Error - 403):**
```json
{
  "error": "Access denied to this brand"
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.22:5000/api/brands/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3. Create Brand(s) - Multiple Methods

**Endpoint:** `POST /api/brands`

**Description:** Create brand(s) using JSON data or file upload (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

#### Method 1: Single Brand (JSON)

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
  "name": "Nike",
  "description": "Sports and athletic wear brand"
}
```

#### Method 2: Multiple Brands (JSON)

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
  "brands": [
    {
      "name": "Nike",
      "description": "Sports and athletic wear brand"
    },
    {
      "name": "Adidas",
      "description": "German multinational corporation"
    },
    {
      "name": "Puma",
      "description": "Athletic and casual footwear"
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
Nike,Sports and athletic wear brand
Adidas,German multinational corporation
Puma,Athletic and casual footwear
Sparx,Indian footwear brand
Reebok,Fitness and sports brand
```

**Excel File Format:**
Same structure as CSV with columns:
- Column A: name
- Column B: description

**Response (Success - 201):**
```json
{
  "message": "Processed 5 brand(s)",
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
        "name": "Nike",
        "description": "Sports and athletic wear brand",
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": 2,
        "name": "Adidas",
        "description": "German multinational corporation",
        "createdAt": "2024-01-15T10:01:00.000Z",
        "updatedAt": "2024-01-15T10:01:00.000Z"
      }
    ],
    "duplicates": [
      {
        "name": "Puma",
        "error": "Brand name already exists"
      }
    ],
    "errors": []
  }
}
```

**cURL Examples:**

**Single Brand:**
```bash
curl -X POST http://192.168.0.22:5000/api/brands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Nike",
    "description": "Sports and athletic wear brand"
  }'
```

**Multiple Brands:**
```bash
curl -X POST http://192.168.0.22:5000/api/brands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "brands": [
      {"name": "Nike", "description": "Sports brand"},
      {"name": "Adidas", "description": "German brand"}
    ]
  }'
```

**File Upload:**
```bash
curl -X POST http://192.168.0.22:5000/api/brands \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@brands.csv"
```

---

### 4. Update Brand

**Endpoint:** `PUT /api/brands/:id`

**Description:** Update an existing brand (Admin only)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): Brand ID

**Request Body:**
```json
{
  "name": "Nike Updated",
  "description": "Updated description for Nike brand"
}
```

**Response (Success - 200):**
```json
{
  "message": "Brand updated successfully",
  "brand": {
    "id": 1,
    "name": "Nike Updated",
    "description": "Updated description for Nike brand",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T15:00:00.000Z"
  }
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
curl -X PUT http://192.168.0.22:5000/api/brands/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Nike Updated",
    "description": "Updated description for Nike brand"
  }'
```

---

### 5. Delete Brand

**Endpoint:** `DELETE /api/brands/:id`

**Description:** Delete a brand (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**URL Parameters:**
- `id` (integer): Brand ID

**Response (Success - 200):**
```json
{
  "message": "Brand deleted successfully"
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
curl -X DELETE http://192.168.0.22:5000/api/brands/1 \
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
| name | Yes | Brand name (unique) |
| description | No | Brand description |

### File Processing
- Files are processed directly in memory (no disk storage)
- Empty rows are automatically filtered out
- Duplicate names are reported but don't stop processing
- Invalid rows are reported with specific error messages

---

## 🔒 Access Control

### Admin Users
- Can view all brands
- Can create, update, and delete brands
- Can upload files for bulk creation

### Regular Users
- Can only view brands they have access to
- Cannot create, update, or delete brands
- Access is controlled by admin through permission system

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid request format | Missing required fields |
| 400 | Brand name is required | Name field is empty |
| 400 | File validation failed | File format or content errors |
| 400 | File too large | File exceeds 10MB limit |
| 401 | Access token required | Missing authorization |
| 403 | Admin access required | User is not admin |
| 403 | Access denied to this brand | User lacks brand access |
| 404 | Brand not found | Brand ID doesn't exist |
| 500 | Failed to create brand(s) | Server error |

---

## 📊 Bulk Upload Response Format

### Summary Object
- **total:** Total number of items processed
- **created:** Number of successfully created brands
- **duplicates:** Number of duplicate names found
- **errors:** Number of validation errors

### Results Object
- **created:** Array of successfully created brand objects
- **duplicates:** Array of duplicate entries with error messages
- **errors:** Array of validation errors with row numbers

### Example Error Response
```json
{
  "error": "File validation failed",
  "details": [
    "Row 3: Brand name is required",
    "Row 5: Brand name is required"
  ]
}
```
