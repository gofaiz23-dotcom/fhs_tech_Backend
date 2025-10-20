# Settings API Documentation

## Overview
Simple settings management with JSONB structure for inventory configuration and brand name mappings.

**Default Values:**
- `inventoryConfig.minValue`: **3**
- `inventoryConfig.maxValue`: **null** (means greater than 3, unlimited)
- `ownBrand`: **{}** (empty object - original brand names by default)

---

## API Endpoints

### 1. Get Settings
**Endpoint:** `GET /api/settings`

**Authentication:** Required (Access Token)

**Description:** Get current settings configuration.

**Success Response (200 OK):**
```json
{
  "message": "Settings retrieved successfully",
  "timestamp": "2025-10-15T18:30:00.000Z",
  "settings": {
    "id": 1,
    "inventoryConfig": {
      "minValue": 3,
      "maxValue": null
    },
    "createdAt": "2025-10-15T10:00:00.000Z",
    "updatedAt": "2025-10-15T10:00:00.000Z"
  }
}
```

**Default Behavior:**
- If no settings exist, automatically creates default settings
- Default: `minValue: 3, maxValue: null`

---

### 2. Update Settings (Admin Only)
**Endpoint:** `PUT /api/settings`

**Authentication:** Required (Admin Access Token)

**Description:** Update inventory configuration settings.

**Request Body:**
```json
{
  "inventoryConfig": {
    "minValue": 5,
    "maxValue": null
  }
}
```

**Request Examples:**

#### Example 1: Update minValue only
```json
{
  "inventoryConfig": {
    "minValue": 10,
    "maxValue": null
  }
}
```

#### Example 2: Set both min and max
```json
{
  "inventoryConfig": {
    "minValue": 5,
    "maxValue": 100
  }
}
```

#### Example 3: Unlimited max (greater than min)
```json
{
  "inventoryConfig": {
    "minValue": 3,
    "maxValue": null
  }
}
```

**Success Response (200 OK):**
```json
{
  "message": "Settings updated successfully",
  "timestamp": "2025-10-15T18:35:00.000Z",
  "settings": {
    "id": 1,
    "inventoryConfig": {
      "minValue": 5,
      "maxValue": null
    },
    "createdAt": "2025-10-15T10:00:00.000Z",
    "updatedAt": "2025-10-15T18:35:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "maxValue must be greater than minValue",
  "provided": {
    "minValue": 10,
    "maxValue": 5
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Admin access required",
  "code": "ADMIN_REQUIRED"
}
```

---

### 3. Get All Brands
**Endpoint:** `GET /api/settings/brands`

**Authentication:** Required (Access Token)

**Description:** Get all unique brands currently used in the Listing table.

**Success Response (200 OK):**
```json
{
  "message": "Brands retrieved successfully",
  "timestamp": "2025-10-20T18:30:00.000Z",
  "totalBrands": 3,
  "brands": [
    {
      "id": 1,
      "name": "Furniture of America"
    },
    {
      "id": 2,
      "name": "Ashley Furniture"
    },
    {
      "id": 3,
      "name": "Faiz"
    }
  ],
  "currentMappings": {
    "Furniture of America": "Faiz"
  }
}
```

**Behavior:**
- Returns all unique brands from the Listing table (actual current brand names)
- Shows current brand mappings in settings
- Automatically synced with listings - if you delete all listings of a brand, it won't appear here

---

### 4. Update Brand Name Mappings (Admin Only)
**Endpoint:** `POST /api/settings/brands`

**Authentication:** Required (Admin Access Token)

**Description:** Update brand name mappings and automatically apply changes to ALL listings, products, and inventory. This will actually change the brand names in the database (e.g., "Furniture of America" → "Faiz").

**Request Body:**
```json
{
  "brandMappings": {
    "Furniture of America": "Faiz",
    "Ashley Furniture": "Custom Name"
  }
}
```

**Request Examples:**

#### Example 1: Map single brand
```json
{
  "brandMappings": {
    "Furniture of America": "Faiz"
  }
}
```

#### Example 2: Map multiple brands
```json
{
  "brandMappings": {
    "Furniture of America": "Faiz",
    "Ashley Furniture": "Ashley",
    "Coaster": "Coast Furniture"
  }
}
```

#### Example 3: Reset to original names (empty object)
```json
{
  "brandMappings": {}
}
```

**Success Response (200 OK):**
```json
{
  "message": "Brand mappings updated successfully and applied to all listings",
  "timestamp": "2025-10-20T18:35:00.000Z",
  "ownBrand": {
    "Furniture of America": "Faiz",
    "Ashley Furniture": "Custom Name"
  },
  "updatedBrands": [
    {
      "id": 3,
      "name": "Faiz"
    },
    {
      "id": 4,
      "name": "Custom Name"
    }
  ],
  "note": "All listings, products, and inventory have been updated with the new brand names"
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "brandMappings is required",
  "example": {
    "brandMappings": {
      "Furniture of America": "Faiz",
      "Ashley Furniture": "Custom Name"
    }
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "error": "Admin access required",
  "code": "ADMIN_REQUIRED"
}
```

---

## Database Schema

### Settings Table
```prisma
model Setting {
  id              Int      @id @default(autoincrement())
  inventoryConfig Json     @default("{\"minValue\": 3}")
  ownBrand        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**JSONB Structure for inventoryConfig:**
```json
{
  "minValue": 3,
  "maxValue": null
}
```

**Meaning:**
- `minValue: 3` → Inventory minimum value is 3
- `maxValue: null` → Inventory maximum is unlimited (greater than 3)
- `maxValue: 100` → Inventory maximum value is 100

**JSONB Structure for ownBrand:**
```json
{
  "Furniture of America": "Faiz",
  "Ashley Furniture": "Custom Name",
  "Coaster": "Coast Furniture"
}
```

**Meaning:**
- Key = Original brand name (from Brand table)
- Value = Custom display name (how you want it to appear)
- If a brand is not in this object, it will display with its original name

---

## Validation Rules

1. ✅ `minValue` must be a number
2. ✅ `maxValue` must be a number or `null`
3. ✅ If `maxValue` is a number, it must be greater than `minValue`
4. ✅ If `maxValue` is `null`, it means "greater than minValue" (unlimited)

---

## Example Usage

### Get Current Settings
```bash
curl -X GET http://localhost:5000/api/settings \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "settings": {
    "inventoryConfig": {
      "minValue": 3,
      "maxValue": null
    }
  }
}
```

---

### Update Settings (Admin)
```bash
curl -X PUT http://localhost:5000/api/settings \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryConfig": {
      "minValue": 5,
      "maxValue": 50
    }
  }'
```

**Response:**
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "inventoryConfig": {
      "minValue": 5,
      "maxValue": 50
    }
  }
}
```

---

### Get Brands Example
```bash
curl -X GET http://localhost:5000/api/settings/brands \
  -H "Authorization: Bearer <access_token>"
```

**Response:**
```json
{
  "message": "Brands retrieved successfully",
  "totalBrands": 2,
  "brands": [
    {
      "id": 1,
      "originalBrand": "Furniture of America",
      "customBrand": "Faiz"
    },
    {
      "id": 2,
      "originalBrand": "Ashley Furniture",
      "customBrand": "Ashley Furniture"
    }
  ]
}
```

---

### Update Brand Mappings (Admin)
```bash
curl -X POST http://localhost:5000/api/settings/brands \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "brandMappings": {
      "Furniture of America": "Faiz",
      "Ashley Furniture": "Ashley"
    }
  }'
```

**Response:**
```json
{
  "message": "Brand mappings updated successfully",
  "ownBrand": {
    "Furniture of America": "Faiz",
    "Ashley Furniture": "Ashley"
  },
  "note": "Brand names in listings will reflect these custom mappings when displayed"
}
```

---

## Postman Testing

### API 1: GET Settings

**Method:** `GET`
**URL:** `http://localhost:5000/api/settings`
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**No body needed** ✅

---

### API 2: PUT Settings (Admin)

**Method:** `PUT`
**URL:** `http://localhost:5000/api/settings`
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "inventoryConfig": {
    "minValue": 5,
    "maxValue": null
  }
}
```

---

### API 3: GET Brands

**Method:** `GET`
**URL:** `http://localhost:5000/api/settings/brands`
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**No body needed** ✅

---

### API 4: PUT Brand Mappings (Admin)

**Method:** `PUT`
**URL:** `http://localhost:5000/api/settings/brands`
**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "brandMappings": {
    "Furniture of America": "Faiz",
    "Ashley Furniture": "Ashley"
  }
}
```

---

## Access Control

| Role | GET Settings | PUT Settings | GET Brands | PUT Brands |
|------|--------------|--------------|------------|------------|
| USER | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| ADMIN | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Key Features

- ✅ **Simple JSONB Structure** for both inventory config and brand mappings
- ✅ **Auto-initialization** (creates default if not exists)
- ✅ **Single Settings Row** (always one row in table)
- ✅ **Admin-only Updates**
- ✅ **Validation** (maxValue > minValue)
- ✅ **Nullable maxValue** (unlimited)
- ✅ **Brand Name Mapping** (customize brand display names)
- ✅ **Default Original Names** (brands show original name if not mapped)

---

## Notes

1. **Only ONE row** in settings table (singleton pattern)
2. **Auto-creates defaults** if table is empty
3. **maxValue = null** means "greater than minValue" (no upper limit)
4. **JSONB format** for flexible configuration
5. **Admin only** can update settings and brand mappings
6. **OwnBrand Feature:**
   - Allows mapping original brand names to custom display names
   - Example: "Furniture of America" → "Faiz"
   - Default is original brand name if no mapping exists
   - Brands are retrieved from the Listing table
   - Mappings are stored in the `ownBrand` JSONB field

**Simple and efficient!** 🎉

