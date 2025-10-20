# Products APIs Documentation

Base URL: `http://192.168.0.22:5000/api`

## 📋 Overview
Complete CRUD operations for product management with support for single product, multiple products, bulk file upload (CSV/Excel), image uploads, and advanced SKU handling with comma-separated values.

---

## 🏷️ Product Endpoints

### 1. Get All Products (with Pagination)

**Endpoint:** `GET /api/products`

**Description:** Get all products with pagination and filtering (filtered by user access for regular users, all products for admin)

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 20)
- `brandId` (integer, optional): Filter by brand ID
- `category` (string, optional): Filter by category
- `minPrice` (number, optional): Minimum ecommerce price
- `maxPrice` (number, optional): Maximum ecommerce price
- `search` (string, optional): Search in title

**Response (Success - 200):**
```json
{
  "message": "Products retrieved successfully",
  "userAccess": {
    "userId": 1,
    "role": "ADMIN",
    "email": "admin@company.com"
  },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "products": [
    {
      "id": 1,
      "brandId": 1,
      "title": "Nike Air Max 270",
      "groupSku": "NIKE-AIRMAX-270",
      "subSku": "123ed,345Df,678gh",
      "category": "Shoes",
      "collections": "Air Max Series",
      "shipTypes": "Standard,Express",
      "singleSetItem": "Yes",
      "brandRealPrice": 120.00,
      "brandMiscellaneous": 5.00,
      "brandPrice": 125.00,
      "shippingPrice": 10.00,
      "commissionPrice": 15.00,
      "profitMarginPrice": 20.00,
      "ecommerceMiscellaneous": 5.00,
      "ecommercePrice": 175.00,
      "attributes": {
        "color": "Black",
        "size": ["8", "9", "10"],
        "material": "Mesh"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "brand": {
        "id": 1,
        "name": "Nike"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 200,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**cURL Example:**
```bash
curl -X GET "http://192.168.0.22:5000/api/products?page=1&limit=20&brandId=1&category=Shoes" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Postman Collection:**
```json
{
  "name": "Get All Products",
  "request": {
    "method": "GET",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{access_token}}",
        "type": "text"
      }
    ],
    "url": {
      "raw": "{{base_url}}/api/products?page=1&limit=20",
      "host": ["{{base_url}}"],
      "path": ["api", "products"],
      "query": [
        {
          "key": "page",
          "value": "1"
        },
        {
          "key": "limit",
          "value": "20"
        }
      ]
    }
  }
}
```

---

### 2. Get Product by Individual SKU

**Endpoint:** `GET /api/products/sku/:sku`

**Description:** Search for a product by individual SKU (handles comma-separated subSku values)

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `sku` (string): Individual SKU to search for

**Response (Success - 200):**
```json
{
  "message": "Product found successfully",
  "product": {
    "id": 1,
    "brandId": 1,
    "title": "Nike Air Max 270",
    "groupSku": "NIKE-AIRMAX-270",
    "subSku": "123ed,345Df,678gh",
    "category": "Shoes",
    "individualSkus": ["123ed", "345Df", "678gh"],
    "brand": {
      "id": 1,
      "name": "Nike"
    }
  },
  "searchedSku": "123ed"
}
```

**Response (Error - 404):**
```json
{
  "error": "Product not found",
  "message": "No product found with SKU: INVALID-SKU"
}
```

**cURL Example:**
```bash
curl -X GET http://192.168.0.22:5000/api/products/sku/123ed \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Postman Collection:**
```json
{
  "name": "Get Product by SKU",
  "request": {
    "method": "GET",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{access_token}}",
        "type": "text"
      }
    ],
    "url": {
      "raw": "{{base_url}}/api/products/sku/123ed",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "sku", "123ed"]
    }
  }
}
```

---

### 3. Create Product(s) - Multiple Methods

**Endpoint:** `POST /api/products`

**Description:** Create product(s) using JSON data or file upload

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

#### Method 1: Single Product (JSON)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "title": "Nike Air Max 270",
  "groupSku": "NIKE-AIRMAX-270",
  "subSku": "123ed,345Df,678gh",
  "category": "Shoes",
  "collections": "Air Max Series",
  "shipTypes": "Standard,Express",
  "singleSetItem": "Yes",
  "brandId": 1,
  "brandRealPrice": 120.00,
  "brandMiscellaneous": 5.00,
  "attributes": {
    "color": "Black",
    "size": ["8", "9", "10"],
    "material": "Mesh"
  }
}
```

#### Method 2: Multiple Products (JSON)

**Request Body:**
```json
{
  "products": [
    {
      "title": "Nike Air Max 270",
      "groupSku": "NIKE-AIRMAX-270",
      "subSku": "123ed,345Df",
      "category": "Shoes",
      "brandId": 1,
      "brandRealPrice": 120.00,
      "attributes": {
        "color": "Black"
      }
    },
    {
      "title": "Adidas Ultraboost 22",
      "groupSku": "ADIDAS-UB-22",
      "subSku": "456ab,789cd",
      "category": "Shoes",
      "brandId": 2,
      "brandRealPrice": 180.00,
      "attributes": {
        "color": "White"
      }
    }
  ]
}
```

#### Method 3: File Upload (CSV/Excel)

**Headers:**
```json
{
  "Content-Type": "multipart/form-data",
  "Authorization": "Bearer <access_token>"
}
```

**Form Data:**
- `file`: CSV or Excel file (.csv, .xlsx, .xls)

**CSV File Format:**
```csv
title,groupSku,subSku,category,collections,shipTypes,singleSetItem,brandId,brandRealPrice,brandMiscellaneous
"Nike Air Max 270","NIKE-AIRMAX-270","123ed,345Df","Shoes","Air Max","Standard,Express","Yes",1,120.00,5.00
"Adidas Ultraboost","ADIDAS-UB-22","456ab,789cd","Shoes","Running","Standard","Yes",2,180.00,8.00
```

**Response (Success - 201):**
```json
{
  "message": "Processed 2 product(s)",
  "summary": {
    "total": 2,
    "created": 2,
    "duplicates": 0,
    "errors": 0
  },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "results": {
    "created": [
      {
        "id": 1,
        "brandId": 1,
        "title": "Nike Air Max 270",
        "groupSku": "NIKE-AIRMAX-270",
        "subSku": "123ed,345Df,678gh",
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "duplicates": [],
    "errors": []
  }
}
```

**cURL Examples:**

**Single Product:**
```bash
curl -X POST http://192.168.0.22:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Nike Air Max 270",
    "groupSku": "NIKE-AIRMAX-270",
    "subSku": "123ed,345Df,678gh",
    "category": "Shoes",
    "brandId": 1,
    "brandRealPrice": 120.00
  }'
```

**Multiple Products:**
```bash
curl -X POST http://192.168.0.22:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "products": [
      {
        "title": "Nike Air Max 270",
        "groupSku": "NIKE-AIRMAX-270",
        "subSku": "123ed,345Df",
        "category": "Shoes",
        "brandId": 1,
        "brandRealPrice": 120.00
      }
    ]
  }'
```

**File Upload:**
```bash
curl -X POST http://192.168.0.22:5000/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@products.csv"
```

**Postman Collection:**
```json
{
  "name": "Create Single Product",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "type": "text"
      },
      {
        "key": "Authorization",
        "value": "Bearer {{access_token}}",
        "type": "text"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"title\": \"Nike Air Max 270\",\n  \"groupSku\": \"NIKE-AIRMAX-270\",\n  \"subSku\": \"123ed,345Df,678gh\",\n  \"category\": \"Shoes\",\n  \"brandId\": 1,\n  \"brandRealPrice\": 120.00\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/products",
      "host": ["{{base_url}}"],
      "path": ["api", "products"]
    }
  }
}
```

---

### 4. Update Product

**Endpoint:** `PUT /api/products/:id`

**Description:** Update an existing product

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (integer): Product ID

**Request Body:**
```json
{
  "title": "Nike Air Max 270 Updated",
  "groupSku": "NIKE-AIRMAX-270",
  "subSku": "123ed,345Df,678gh,999new",
  "category": "Shoes",
  "collections": "Air Max Series Updated",
  "shipTypes": "Standard,Express,Premium",
  "singleSetItem": "Yes",
  "attributes": {
    "color": "Black",
    "size": ["8", "9", "10", "11"],
    "material": "Mesh",
    "updated": true
  }
}
```

**Response (Success - 200):**
```json
{
  "message": "Product updated successfully",
  "productId": 1,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "product": {
    "id": 1,
    "title": "Nike Air Max 270 Updated",
    "groupSku": "NIKE-AIRMAX-270",
    "subSku": "123ed,345Df,678gh,999new",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.22:5000/api/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "title": "Nike Air Max 270 Updated",
    "subSku": "123ed,345Df,678gh,999new",
    "attributes": {
      "color": "Black",
      "size": ["8", "9", "10", "11"]
    }
  }'
```

**Postman Collection:**
```json
{
  "name": "Update Product",
  "request": {
    "method": "PUT",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json",
        "type": "text"
      },
      {
        "key": "Authorization",
        "value": "Bearer {{access_token}}",
        "type": "text"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"title\": \"Nike Air Max 270 Updated\",\n  \"subSku\": \"123ed,345Df,678gh,999new\",\n  \"attributes\": {\n    \"color\": \"Black\",\n    \"size\": [\"8\", \"9\", \"10\", \"11\"]\n  }\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/products/1",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "1"]
    }
  }
}
```

---

### 5. Delete Product

**Endpoint:** `DELETE /api/products/:id`

**Description:** Delete a product

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (integer): Product ID

**Response (Success - 200):**
```json
{
  "message": "Product deleted successfully"
}
```

**Response (Error - 404):**
```json
{
  "error": "Product not found"
}
```

**Response (Error - 403):**
```json
{
  "error": "Access denied",
  "message": "You don't have access to products from brand: Nike"
}
```

**cURL Example:**
```bash
curl -X DELETE http://192.168.0.22:5000/api/products/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Postman Collection:**
```json
{
  "name": "Delete Product",
  "request": {
    "method": "DELETE",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{access_token}}",
        "type": "text"
      }
    ],
    "url": {
      "raw": "{{base_url}}/api/products/1",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "1"]
    }
  }
}
```

---

### 6. Delete All Products (Admin Only)

**Endpoint:** `DELETE /api/products`

**Description:** Delete all products (Admin only)

**Headers:**
```json
{
  "Authorization": "Bearer <admin_access_token>"
}
```

**Response (Success - 200):**
```json
{
  "message": "All products deleted successfully",
  "deletedCount": 150
}
```

**cURL Example:**
```bash
curl -X DELETE http://192.168.0.22:5000/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 7. Upload Product Images

**Endpoint:** `POST /api/products/images`

**Description:** Upload product images via file upload or URL download

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Form Data:**
- `groupSku` (string, optional): Product group SKU
- `subSku` (string, optional): Product sub SKU
- `imageUrls` (string/array, optional): Comma-separated URLs or array of URLs
- `files` (files, optional): Multiple image files

**Request Body (JSON with URLs):**
```json
{
  "groupSku": "NIKE-AIRMAX-270",
  "subSku": "123ed",
  "imageUrls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Request Body (Form Data with Files):**
```
groupSku: NIKE-AIRMAX-270
subSku: 123ed
files: [Select multiple image files]
```

**Response (Success - 200):**
```json
{
  "message": "Image upload completed",
  "summary": {
    "uploadedFiles": 2,
    "downloadedUrls": 2,
    "failed": 0
  },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "results": {
    "uploadedFiles": [
      {
        "originalName": "nike1.jpg",
        "filename": "1642248000000_nike1.jpg",
        "url": "/uploads/images/1642248000000_nike1.jpg",
        "size": 245760
      }
    ],
    "downloadedUrls": [
      {
        "originalUrl": "https://example.com/image1.jpg",
        "filename": "1642248001000_image1.jpg",
        "url": "/uploads/images/1642248001000_image1.jpg"
      }
    ],
    "failed": []
  }
}
```

**cURL Example (File Upload):**
```bash
curl -X POST http://192.168.0.22:5000/api/products/images \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "groupSku=NIKE-AIRMAX-270" \
  -F "subSku=123ed" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

**cURL Example (URL Download):**
```bash
curl -X POST http://192.168.0.22:5000/api/products/images \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "groupSku": "NIKE-AIRMAX-270",
    "subSku": "123ed",
    "imageUrls": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ]
  }'
```

**Postman Collection:**
```json
{
  "name": "Upload Product Images",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{access_token}}",
        "type": "text"
      }
    ],
    "body": {
      "mode": "formdata",
      "formdata": [
        {
          "key": "groupSku",
          "value": "NIKE-AIRMAX-270",
          "type": "text"
        },
        {
          "key": "subSku",
          "value": "123ed",
          "type": "text"
        },
        {
          "key": "files",
          "type": "file",
          "src": []
        }
      ]
    },
    "url": {
      "raw": "{{base_url}}/api/products/images",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "images"]
    }
  }
}
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
| title | Yes | Product title |
| groupSku | Yes | Unique group SKU |
| subSku | No | Comma-separated individual SKUs |
| category | Yes | Product category |
| brandId | Yes | Brand ID (must exist) |
| brandRealPrice | Yes | Brand real price (decimal) |

### Optional Columns
| Column | Description |
|--------|-------------|
| collections | Product collections |
| shipTypes | Shipping types (comma-separated) |
| singleSetItem | Single set item indicator |
| brandMiscellaneous | Brand miscellaneous cost |
| attributes | JSON string of additional attributes |

---

## 🔑 SKU Management

### GroupSku Rules
- **Must be unique** across all products
- **Required field** for all products
- **Cannot be null or empty**

### SubSku Rules
- **Can be null or empty**
- **Supports comma-separated values**: `"123ed,345Df,678gh"`
- **No uniqueness requirement** - same subSku can exist in multiple products
- **Individual SKU search** available via `/api/products/sku/:sku`

### SKU Examples
```json
// Single SKU
{
  "groupSku": "NIKE-AIRMAX-270",
  "subSku": "123ABC"
}

// Multiple SKUs
{
  "groupSku": "NIKE-AIRMAX-270", 
  "subSku": "123ed,345Df,678gh,901ij"
}

// Null SKU
{
  "groupSku": "NIKE-AIRMAX-270",
  "subSku": null
}
```

---

## 🔒 Access Control

### Admin Users
- Can view all products
- Can create, update, and delete any product
- Can upload files for bulk creation
- Can delete all products

### Regular Users
- Can only view products from brands they have access to
- Can create products only for brands they have access to
- Can update/delete only products from brands they have access to
- Cannot delete all products

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid request format | Missing required fields |
| 400 | Brand Real Price is mandatory | brandRealPrice field missing |
| 400 | Group SKU already exists | Duplicate groupSku |
| 400 | Brand not found | Invalid brandId |
| 400 | Access denied to brand | User lacks brand access |
| 401 | Access token required | Missing authorization |
| 403 | Access denied | User lacks product access |
| 404 | Product not found | Product ID doesn't exist |
| 500 | Failed to create product(s) | Server error |

---

## 📊 Response Formats

### Pagination Response
```json
{
  "products": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalCount": 200,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Bulk Upload Response
```json
{
  "message": "Processed 5 product(s)",
  "summary": {
    "total": 5,
    "created": 4,
    "duplicates": 1,
    "errors": 0
  },
  "results": {
    "created": [...],
    "duplicates": [...],
    "errors": [...]
  }
}
```

---

## 🧪 Postman Environment Variables

Create these variables in your Postman environment:

```json
{
  "base_url": "http://192.168.0.22:5000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🔄 Testing Workflow

### 1. Authentication
1. Login to get access token
2. Set token in environment variable
3. Use token in Authorization header

### 2. Product Management
1. Create brand first (if not exists)
2. Create product with brandId
3. Update product details
4. Upload product images
5. Search by SKU
6. Delete product (if needed)

### 3. Bulk Operations
1. Prepare CSV/Excel file with correct format
2. Upload file via POST /api/products
3. Check response for created/duplicate/error counts
4. Handle any validation errors

---

**Note**: All timestamps are in ISO 8601 format (UTC). All APIs require proper authentication headers. File uploads support unlimited files and URLs.
