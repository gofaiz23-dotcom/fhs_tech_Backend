# Product Pricing APIs Documentation

Base URL: `http://192.168.0.22:5000/api`

## 📋 Overview
Complete pricing management system for products with support for brand pricing, ecommerce pricing, bulk pricing updates, and comprehensive pricing calculations.

---

## 💰 Pricing Endpoints

### 1. Get All Product Pricing (with Pagination)

**Endpoint:** `GET /api/products/pricing`

**Description:** Get all product pricing information with pagination and filtering

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
- `minBrandPrice` (number, optional): Minimum brand price
- `maxBrandPrice` (number, optional): Maximum brand price
- `minEcommercePrice` (number, optional): Minimum ecommerce price
- `maxEcommercePrice` (number, optional): Maximum ecommerce price

**Response (Success - 200):**
```json
{
  "message": "Product pricing retrieved successfully",
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
      "brandRealPrice": 120.00,
      "brandMiscellaneous": 5.00,
      "brandPrice": 125.00,
      "shippingPrice": 10.00,
      "commissionPrice": 15.00,
      "profitMarginPrice": 20.00,
      "ecommerceMiscellaneous": 5.00,
      "ecommercePrice": 175.00,
      "pricingBreakdown": {
        "brandTotal": 125.00,
        "ecommerceTotal": 175.00,
        "profitMargin": 50.00,
        "profitPercentage": 28.57
      },
      "brand": {
        "id": 1,
        "name": "Nike"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
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
curl -X GET "http://192.168.0.22:5000/api/products/pricing?page=1&limit=20&brandId=1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Postman Collection:**
```json
{
  "name": "Get All Product Pricing",
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
      "raw": "{{base_url}}/api/products/pricing?page=1&limit=20",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "pricing"],
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

### 2. Get Product Pricing by ID

**Endpoint:** `GET /api/products/pricing/:id`

**Description:** Get detailed pricing information for a specific product

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
  "message": "Product pricing retrieved successfully",
  "product": {
    "id": 1,
    "brandId": 1,
    "title": "Nike Air Max 270",
    "groupSku": "NIKE-AIRMAX-270",
    "subSku": "123ed,345Df,678gh",
    "category": "Shoes",
    "brandRealPrice": 120.00,
    "brandMiscellaneous": 5.00,
    "brandPrice": 125.00,
    "shippingPrice": 10.00,
    "commissionPrice": 15.00,
    "profitMarginPrice": 20.00,
    "ecommerceMiscellaneous": 5.00,
    "ecommercePrice": 175.00,
    "pricingBreakdown": {
      "brandTotal": 125.00,
      "ecommerceTotal": 175.00,
      "profitMargin": 50.00,
      "profitPercentage": 28.57,
      "costBreakdown": {
        "brandRealPrice": 120.00,
        "brandMiscellaneous": 5.00,
        "shippingPrice": 10.00,
        "commissionPrice": 15.00,
        "profitMarginPrice": 20.00,
        "ecommerceMiscellaneous": 5.00
      }
    },
    "brand": {
      "id": 1,
      "name": "Nike"
    }
  }
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
curl -X GET http://192.168.0.22:5000/api/products/pricing/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Postman Collection:**
```json
{
  "name": "Get Product Pricing by ID",
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
      "raw": "{{base_url}}/api/products/pricing/1",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "pricing", "1"]
    }
  }
}
```

---

### 3. Update Product Pricing

**Endpoint:** `PUT /api/products/pricing/:id`

**Description:** Update pricing information for a specific product

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `id` (integer): Product ID

**Request Body (Brand Pricing):**
```json
{
  "brandRealPrice": 130.00,
  "brandMiscellaneous": 8.00,
  "brandPrice": 138.00
}
```

**Request Body (Ecommerce Pricing):**
```json
{
  "shippingPrice": 12.00,
  "commissionPrice": 18.00,
  "profitMarginPrice": 25.00,
  "ecommerceMiscellaneous": 7.00,
  "ecommercePrice": 200.00
}
```

**Request Body (Complete Pricing):**
```json
{
  "brandRealPrice": 130.00,
  "brandMiscellaneous": 8.00,
  "brandPrice": 138.00,
  "shippingPrice": 12.00,
  "commissionPrice": 18.00,
  "profitMarginPrice": 25.00,
  "ecommerceMiscellaneous": 7.00,
  "ecommercePrice": 200.00
}
```

**Response (Success - 200):**
```json
{
  "message": "Product pricing updated successfully",
  "productId": 1,
  "timestamp": "2024-01-15T10:00:00.000Z",
  "updatedPricing": {
    "brandRealPrice": 130.00,
    "brandMiscellaneous": 8.00,
    "brandPrice": 138.00,
    "shippingPrice": 12.00,
    "commissionPrice": 18.00,
    "profitMarginPrice": 25.00,
    "ecommerceMiscellaneous": 7.00,
    "ecommercePrice": 200.00,
    "pricingBreakdown": {
      "brandTotal": 138.00,
      "ecommerceTotal": 200.00,
      "profitMargin": 62.00,
      "profitPercentage": 31.00
    }
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.22:5000/api/products/pricing/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "brandRealPrice": 130.00,
    "brandMiscellaneous": 8.00,
    "shippingPrice": 12.00,
    "commissionPrice": 18.00,
    "profitMarginPrice": 25.00,
    "ecommerceMiscellaneous": 7.00,
    "ecommercePrice": 200.00
  }'
```

**Postman Collection:**
```json
{
  "name": "Update Product Pricing",
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
      "raw": "{\n  \"brandRealPrice\": 130.00,\n  \"brandMiscellaneous\": 8.00,\n  \"shippingPrice\": 12.00,\n  \"commissionPrice\": 18.00,\n  \"profitMarginPrice\": 25.00,\n  \"ecommerceMiscellaneous\": 7.00,\n  \"ecommercePrice\": 200.00\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/products/pricing/1",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "pricing", "1"]
    }
  }
}
```

---

### 4. Bulk Update Product Pricing

**Endpoint:** `PUT /api/products/pricing/bulk`

**Description:** Update pricing for multiple products at once

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
  "updates": [
    {
      "productId": 1,
      "pricing": {
        "brandRealPrice": 130.00,
        "shippingPrice": 12.00,
        "commissionPrice": 18.00,
        "profitMarginPrice": 25.00,
        "ecommercePrice": 200.00
      }
    },
    {
      "productId": 2,
      "pricing": {
        "brandRealPrice": 150.00,
        "shippingPrice": 15.00,
        "commissionPrice": 20.00,
        "profitMarginPrice": 30.00,
        "ecommercePrice": 250.00
      }
    }
  ]
}
```

**Response (Success - 200):**
```json
{
  "message": "Bulk pricing update completed",
  "summary": {
    "total": 2,
    "updated": 2,
    "errors": 0
  },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "results": {
    "updated": [
      {
        "productId": 1,
        "title": "Nike Air Max 270",
        "groupSku": "NIKE-AIRMAX-270",
        "ecommercePrice": 200.00
      },
      {
        "productId": 2,
        "title": "Adidas Ultraboost 22",
        "groupSku": "ADIDAS-UB-22",
        "ecommercePrice": 250.00
      }
    ],
    "errors": []
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.22:5000/api/products/pricing/bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "updates": [
      {
        "productId": 1,
        "pricing": {
          "brandRealPrice": 130.00,
          "ecommercePrice": 200.00
        }
      }
    ]
  }'
```

**Postman Collection:**
```json
{
  "name": "Bulk Update Product Pricing",
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
      "raw": "{\n  \"updates\": [\n    {\n      \"productId\": 1,\n      \"pricing\": {\n        \"brandRealPrice\": 130.00,\n        \"ecommercePrice\": 200.00\n      }\n    }\n  ]\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/products/pricing/bulk",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "pricing", "bulk"]
    }
  }
}
```

---

### 5. Update Pricing by Brand

**Endpoint:** `PUT /api/products/pricing/brand/:brandId`

**Description:** Update pricing for all products of a specific brand

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**URL Parameters:**
- `brandId` (integer): Brand ID

**Request Body:**
```json
{
  "pricingType": "percentage",
  "value": 10,
  "fields": ["brandRealPrice", "brandPrice"],
  "description": "10% price increase for Nike products"
}
```

**Alternative Request (Fixed Amount):**
```json
{
  "pricingType": "fixed",
  "value": 5.00,
  "fields": ["shippingPrice"],
  "description": "Add $5 shipping cost to all Nike products"
}
```

**Response (Success - 200):**
```json
{
  "message": "Brand pricing update completed",
  "brandId": 1,
  "brandName": "Nike",
  "summary": {
    "totalProducts": 25,
    "updatedProducts": 25,
    "errors": 0
  },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "updateDetails": {
    "pricingType": "percentage",
    "value": 10,
    "fields": ["brandRealPrice", "brandPrice"],
    "description": "10% price increase for Nike products"
  },
  "results": {
    "updated": [
      {
        "productId": 1,
        "title": "Nike Air Max 270",
        "oldBrandRealPrice": 120.00,
        "newBrandRealPrice": 132.00,
        "oldBrandPrice": 125.00,
        "newBrandPrice": 137.50
      }
    ],
    "errors": []
  }
}
```

**cURL Example:**
```bash
curl -X PUT http://192.168.0.22:5000/api/products/pricing/brand/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "pricingType": "percentage",
    "value": 10,
    "fields": ["brandRealPrice", "brandPrice"],
    "description": "10% price increase for Nike products"
  }'
```

**Postman Collection:**
```json
{
  "name": "Update Pricing by Brand",
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
      "raw": "{\n  \"pricingType\": \"percentage\",\n  \"value\": 10,\n  \"fields\": [\"brandRealPrice\", \"brandPrice\"],\n  \"description\": \"10% price increase for Nike products\"\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/products/pricing/brand/1",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "pricing", "brand", "1"]
    }
  }
}
```

---

### 6. Calculate Pricing

**Endpoint:** `POST /api/products/pricing/calculate`

**Description:** Calculate pricing breakdown without saving to database

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
  "brandRealPrice": 120.00,
  "brandMiscellaneous": 5.00,
  "shippingPrice": 10.00,
  "commissionPrice": 15.00,
  "profitMarginPrice": 20.00,
  "ecommerceMiscellaneous": 5.00
}
```

**Response (Success - 200):**
```json
{
  "message": "Pricing calculation completed",
  "calculation": {
    "input": {
      "brandRealPrice": 120.00,
      "brandMiscellaneous": 5.00,
      "shippingPrice": 10.00,
      "commissionPrice": 15.00,
      "profitMarginPrice": 20.00,
      "ecommerceMiscellaneous": 5.00
    },
    "calculated": {
      "brandPrice": 125.00,
      "ecommercePrice": 175.00,
      "profitMargin": 50.00,
      "profitPercentage": 28.57
    },
    "breakdown": {
      "brandTotal": 125.00,
      "ecommerceTotal": 175.00,
      "costBreakdown": {
        "brandRealPrice": 120.00,
        "brandMiscellaneous": 5.00,
        "shippingPrice": 10.00,
        "commissionPrice": 15.00,
        "profitMarginPrice": 20.00,
        "ecommerceMiscellaneous": 5.00
      }
    }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://192.168.0.22:5000/api/products/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "brandRealPrice": 120.00,
    "brandMiscellaneous": 5.00,
    "shippingPrice": 10.00,
    "commissionPrice": 15.00,
    "profitMarginPrice": 20.00,
    "ecommerceMiscellaneous": 5.00
  }'
```

**Postman Collection:**
```json
{
  "name": "Calculate Pricing",
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
      "raw": "{\n  \"brandRealPrice\": 120.00,\n  \"brandMiscellaneous\": 5.00,\n  \"shippingPrice\": 10.00,\n  \"commissionPrice\": 15.00,\n  \"profitMarginPrice\": 20.00,\n  \"ecommerceMiscellaneous\": 5.00\n}"
    },
    "url": {
      "raw": "{{base_url}}/api/products/pricing/calculate",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "pricing", "calculate"]
    }
  }
}
```

---

### 7. Get Pricing Analytics

**Endpoint:** `GET /api/products/pricing/analytics`

**Description:** Get pricing analytics and statistics

**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
```

**Query Parameters:**
- `brandId` (integer, optional): Filter by brand ID
- `category` (string, optional): Filter by category
- `dateRange` (string, optional): Date range (last7days, last30days, last90days)

**Response (Success - 200):**
```json
{
  "message": "Pricing analytics retrieved successfully",
  "analytics": {
    "summary": {
      "totalProducts": 150,
      "averageBrandPrice": 125.50,
      "averageEcommercePrice": 180.75,
      "averageProfitMargin": 55.25,
      "averageProfitPercentage": 30.58
    },
    "priceRanges": {
      "brandPrice": {
        "under50": 10,
        "50to100": 45,
        "100to200": 60,
        "200to500": 30,
        "over500": 5
      },
      "ecommercePrice": {
        "under100": 15,
        "100to200": 70,
        "200to400": 50,
        "400to800": 12,
        "over800": 3
      }
    },
    "profitAnalysis": {
      "highProfit": 25,
      "mediumProfit": 80,
      "lowProfit": 45
    },
    "brandComparison": [
      {
        "brandId": 1,
        "brandName": "Nike",
        "productCount": 45,
        "averagePrice": 180.00,
        "averageProfit": 65.00
      },
      {
        "brandId": 2,
        "brandName": "Adidas",
        "productCount": 35,
        "averagePrice": 165.00,
        "averageProfit": 55.00
      }
    ]
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X GET "http://192.168.0.22:5000/api/products/pricing/analytics?brandId=1&dateRange=last30days" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Postman Collection:**
```json
{
  "name": "Get Pricing Analytics",
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
      "raw": "{{base_url}}/api/products/pricing/analytics?brandId=1",
      "host": ["{{base_url}}"],
      "path": ["api", "products", "pricing", "analytics"],
      "query": [
        {
          "key": "brandId",
          "value": "1"
        }
      ]
    }
  }
}
```

---

## 💰 Pricing Structure

### Brand Pricing Fields
| Field | Type | Description |
|-------|------|-------------|
| brandRealPrice | Decimal | Base brand price (required) |
| brandMiscellaneous | Decimal | Additional brand costs |
| brandPrice | Decimal | Total brand price (calculated) |

### Ecommerce Pricing Fields
| Field | Type | Description |
|-------|------|-------------|
| shippingPrice | Decimal | Shipping cost |
| commissionPrice | Decimal | Platform commission |
| profitMarginPrice | Decimal | Desired profit margin |
| ecommerceMiscellaneous | Decimal | Additional ecommerce costs |
| ecommercePrice | Decimal | Final selling price (calculated) |

### Pricing Calculations
```javascript
// Brand Price Calculation
brandPrice = brandRealPrice + brandMiscellaneous

// Ecommerce Price Calculation
ecommercePrice = brandPrice + shippingPrice + commissionPrice + profitMarginPrice + ecommerceMiscellaneous

// Profit Margin Calculation
profitMargin = ecommercePrice - brandPrice
profitPercentage = (profitMargin / ecommercePrice) * 100
```

---

## 🔒 Access Control

### Admin Users
- Can view all product pricing
- Can update any product pricing
- Can perform bulk pricing updates
- Can update pricing by brand
- Can access pricing analytics

### Regular Users
- Can only view pricing for products from brands they have access to
- Can update pricing only for products from brands they have access to
- Cannot perform bulk operations across multiple brands
- Cannot access analytics for restricted brands

---

## 🚨 Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid pricing data | Invalid decimal values |
| 400 | Missing required fields | Required pricing fields missing |
| 401 | Access token required | Missing authorization |
| 403 | Access denied | User lacks product access |
| 404 | Product not found | Product ID doesn't exist |
| 404 | Brand not found | Brand ID doesn't exist |
| 500 | Failed to update pricing | Server error |

---

## 📊 Bulk Update Types

### Percentage Update
```json
{
  "pricingType": "percentage",
  "value": 10,
  "fields": ["brandRealPrice", "brandPrice"],
  "description": "10% price increase"
}
```

### Fixed Amount Update
```json
{
  "pricingType": "fixed",
  "value": 5.00,
  "fields": ["shippingPrice"],
  "description": "Add $5 shipping cost"
}
```

### Supported Fields for Bulk Updates
- `brandRealPrice`
- `brandMiscellaneous`
- `brandPrice`
- `shippingPrice`
- `commissionPrice`
- `profitMarginPrice`
- `ecommerceMiscellaneous`
- `ecommercePrice`

---

## 🧪 Testing Scenarios

### 1. Single Product Pricing Update
1. Get product pricing by ID
2. Update specific pricing fields
3. Verify updated pricing
4. Check pricing breakdown

### 2. Bulk Pricing Update
1. Prepare bulk update data
2. Execute bulk update
3. Verify all products updated
4. Check for any errors

### 3. Brand-wide Pricing Update
1. Select brand for update
2. Choose percentage or fixed amount
3. Execute brand update
4. Verify all brand products updated

### 4. Pricing Calculation
1. Input pricing components
2. Calculate pricing breakdown
3. Verify calculations
4. Use calculated values for updates

---

## 🔄 Postman Testing Workflow

### Environment Setup
```json
{
  "base_url": "http://192.168.0.22:5000",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "product_id": "1",
  "brand_id": "1"
}
```

### Test Collection Order
1. **Authentication** - Login and get token
2. **Get Pricing** - Retrieve current pricing
3. **Calculate Pricing** - Test calculations
4. **Update Single Product** - Update one product
5. **Bulk Update** - Update multiple products
6. **Brand Update** - Update by brand
7. **Analytics** - Get pricing insights

---

**Note**: All pricing values are in decimal format with 2 decimal places. All timestamps are in ISO 8601 format (UTC). Bulk operations are optimized for handling large datasets efficiently.
