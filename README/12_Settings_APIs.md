# Settings API Documentation

## Overview
Simple settings management with JSONB structure for inventory configuration.

**Default Values:**
- `inventoryConfig.minValue`: **3**
- `inventoryConfig.maxValue`: **null** (means greater than 3, unlimited)

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

## Database Schema

### Settings Table
```prisma
model Setting {
  id              Int      @id @default(autoincrement())
  inventoryConfig Json     @default("{\"minValue\": 3, \"maxValue\": null}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**JSONB Structure:**
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

## Access Control

| Role | GET | PUT |
|------|-----|-----|
| USER | ✅ Yes | ❌ No |
| ADMIN | ✅ Yes | ✅ Yes |

---

## Key Features

- ✅ **Simple JSONB Structure**
- ✅ **Auto-initialization** (creates default if not exists)
- ✅ **Single Settings Row** (always one row in table)
- ✅ **Admin-only Updates**
- ✅ **Validation** (maxValue > minValue)
- ✅ **Nullable maxValue** (unlimited)

---

## Notes

1. **Only ONE row** in settings table (singleton pattern)
2. **Auto-creates defaults** if table is empty
3. **maxValue = null** means "greater than minValue" (no upper limit)
4. **JSONB format** for flexible configuration
5. **Admin only** can update settings

**Simple and efficient!** 🎉

