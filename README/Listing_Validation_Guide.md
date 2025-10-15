# Listing Validation Guide

## ✅ Complete Validation Process

When creating a listing, the system validates **BOTH groupSku AND subSku** exist in the product table.

---

## 🔍 Validation Steps

### **Step 1: Product Existence Check**
- System searches for product with matching `groupSku`
- If not found → **Error**: "Product not found"

### **Step 2: GroupSku Match Validation**
- Compares listing's `groupSku` with product's `groupSku`
- Must match exactly

### **Step 3: SubSku Validation** (if provided)
- Splits listing's `subSku` into individual SKUs
- Checks if **ALL** listing subSkus exist in product's `subSku` list
- If any subSku is missing → **Error**: "SubSKU validation failed"

---

## 📊 Validation Examples

### **Product in Database:**
```json
{
  "id": 1,
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-BLK-001,SKU-WHT-002,SKU-RED-003",
  "title": "Premium Wireless Headphones"
}
```

---

### ✅ **Valid Listings** (All Pass Validation)

#### **Example 1: All SubSkus Valid**
```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-BLK-001,SKU-WHT-002",
  "title": "Amazon Listing"
}
```
✅ **Result**: Listing created
- Product exists ✅
- groupSku matches ✅
- All subSkus (SKU-BLK-001, SKU-WHT-002) exist in product ✅

---

#### **Example 2: Single SubSku**
```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-BLK-001",
  "title": "eBay Listing"
}
```
✅ **Result**: Listing created
- Product exists ✅
- groupSku matches ✅
- subSku (SKU-BLK-001) exists in product ✅

---

#### **Example 3: All SubSkus from Product**
```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-BLK-001,SKU-WHT-002,SKU-RED-003",
  "title": "Walmart Listing"
}
```
✅ **Result**: Listing created
- Product exists ✅
- groupSku matches ✅
- All subSkus exist in product ✅

---

#### **Example 4: No SubSku Provided**
```json
{
  "groupSku": "PROD-WH-2024",
  "title": "Default Listing"
}
```
✅ **Result**: Listing created
- Product exists ✅
- groupSku matches ✅
- No subSku provided, will use groupSku as default ✅

---

### ❌ **Invalid Listings** (Validation Fails)

#### **Error 1: Product Not Found**
```json
{
  "groupSku": "INVALID-SKU",
  "subSku": "SKU-001",
  "title": "Test Listing"
}
```
❌ **Error Response**:
```json
{
  "errors": [
    {
      "title": "Test Listing",
      "groupSku": "INVALID-SKU",
      "error": "Product not found with SKU: INVALID-SKU. Listing can only be created if product exists in products table!"
    }
  ]
}
```

---

#### **Error 2: SubSku Not in Product**
```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "INVALID-SUB-SKU,SKU-BLK-001",
  "title": "Amazon Listing"
}
```
❌ **Error Response**:
```json
{
  "errors": [
    {
      "title": "Amazon Listing",
      "groupSku": "PROD-WH-2024",
      "error": "SubSKU validation failed: \"INVALID-SUB-SKU\" not found in product. Product has: SKU-BLK-001,SKU-WHT-002,SKU-RED-003. All listing subSkus must exist in product's subSku list!"
    }
  ]
}
```

---

#### **Error 3: All SubSkus Invalid**
```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "WRONG-001,WRONG-002,WRONG-003",
  "title": "eBay Listing"
}
```
❌ **Error Response**:
```json
{
  "errors": [
    {
      "title": "eBay Listing",
      "groupSku": "PROD-WH-2024",
      "error": "SubSKU validation failed: \"WRONG-001, WRONG-002, WRONG-003\" not found in product. Product has: SKU-BLK-001,SKU-WHT-002,SKU-RED-003. All listing subSkus must exist in product's subSku list!"
    }
  ]
}
```

---

## 🎯 Complete Workflow

### **Step 1: Create Product**

**POST** `/api/products`

```json
{
  "brandId": 1,
  "title": "Premium Wireless Headphones",
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-BLK-001,SKU-WHT-002,SKU-RED-003",
  "category": "Electronics",
  "collectionName": "Premium Audio",
  "shipTypes": "Standard",
  "singleSetItem": "Single",
  "brandRealPrice": 150.00,
  "brandMiscellaneous": 10.00,
  "msrp": 299.99
}
```

**Response:**
```json
{
  "message": "Processed 1 product(s)",
  "summary": {
    "created": 1
  },
  "results": {
    "created": [
      {
        "id": 1,
        "groupSku": "PROD-WH-2024",
        "subSku": "SKU-BLK-001,SKU-WHT-002,SKU-RED-003"
      }
    ]
  }
}
```

---

### **Step 2: Create Listings**

#### **Listing 1: Amazon US (Black & White)**

**POST** `/api/listings`

```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-BLK-001,SKU-WHT-002",
  "title": "Amazon US - Headphones (Black & White)",
  "category": "Electronics",
  "collectionName": "Premium Audio",
  "shipTypes": "Standard",
  "singleSetItem": "Single",
  "brandRealPrice": 150.00,
  "brandMiscellaneous": 10.00,
  "msrp": 299.99
}
```

✅ **Success!** Both SKUs exist in product.

---

#### **Listing 2: eBay (Red Only)**

**POST** `/api/listings`

```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-RED-003",
  "title": "eBay - Headphones (Red)",
  "category": "Electronics",
  "collectionName": "Premium Audio",
  "shipTypes": "Express",
  "singleSetItem": "Single",
  "brandRealPrice": 145.00,
  "brandMiscellaneous": 8.00,
  "msrp": 289.99
}
```

✅ **Success!** SKU-RED-003 exists in product.

---

#### **Listing 3: Walmart (All Colors)**

**POST** `/api/listings`

```json
{
  "groupSku": "PROD-WH-2024",
  "subSku": "SKU-BLK-001,SKU-WHT-002,SKU-RED-003",
  "title": "Walmart - Headphones (All Colors)",
  "category": "Electronics",
  "collectionName": "Premium Audio",
  "shipTypes": "Standard",
  "singleSetItem": "Single",
  "brandRealPrice": 140.00,
  "brandMiscellaneous": 7.00,
  "msrp": 279.99
}
```

✅ **Success!** All SKUs exist in product.

---

## 📋 Validation Matrix

| Listing GroupSku | Listing SubSku | Product GroupSku | Product SubSku | Valid? | Reason |
|-----------------|----------------|------------------|----------------|--------|---------|
| PROD-001 | SKU-A,SKU-B | PROD-001 | SKU-A,SKU-B,SKU-C | ✅ Yes | All listing SKUs exist in product |
| PROD-001 | SKU-A | PROD-001 | SKU-A,SKU-B,SKU-C | ✅ Yes | Listing SKU exists in product |
| PROD-001 | (empty) | PROD-001 | SKU-A,SKU-B | ✅ Yes | No subSku provided, uses groupSku |
| PROD-001 | SKU-X | PROD-001 | SKU-A,SKU-B,SKU-C | ❌ No | SKU-X not in product |
| PROD-001 | SKU-A,SKU-X | PROD-001 | SKU-A,SKU-B,SKU-C | ❌ No | SKU-X not in product |
| PROD-002 | SKU-A | PROD-001 | SKU-A,SKU-B | ❌ No | Product not found |

---

## 🔧 Best Practices

### ✅ **DO:**

1. **Create Product First**
   ```bash
   Step 1: POST /api/products (create product)
   Step 2: POST /api/listings (create listing)
   ```

2. **Use Exact SubSkus from Product**
   ```json
   Product: "SKU-BLK-001,SKU-WHT-002"
   Listing: "SKU-BLK-001" or "SKU-WHT-002" or both ✅
   ```

3. **Verify Product Data**
   ```bash
   GET /api/products?search=PROD-WH-2024
   # Check groupSku and subSku values
   # Use exact values in listing
   ```

4. **Handle Multiple Marketplaces**
   ```json
   // Same product, different listings
   Product: "PROD-001" with "SKU-A,SKU-B,SKU-C"
   
   Amazon Listing: "SKU-A,SKU-B"     ✅
   eBay Listing: "SKU-C"             ✅
   Walmart Listing: "SKU-A,SKU-C"    ✅
   ```

---

### ❌ **DON'T:**

1. **Don't Use Invalid SubSkus**
   ```json
   Product: "SKU-A,SKU-B"
   Listing: "SKU-X" ❌ Error!
   ```

2. **Don't Create Listing Before Product**
   ```bash
   Step 1: POST /api/listings ❌ Error: Product not found
   Step 2: POST /api/products
   ```

3. **Don't Mix Up SKUs**
   ```json
   Product: "PROD-001" with "SKU-A,SKU-B"
   Listing: groupSku="PROD-002" ❌ Wrong product!
   ```

---

## 📊 Excel Upload Validation

### **Product CSV:**
```csv
groupSku,title,subSku
PROD-WH-2024,Premium Headphones,SKU-BLK,SKU-WHT,SKU-RED
PROD-SP-2024,Smart Speaker,SKU-SP-BLK,SKU-SP-WHT
```

### **Listing CSV (Valid):**
```csv
groupSku,title,subSku
PROD-WH-2024,Amazon Listing,SKU-BLK,SKU-WHT
PROD-WH-2024,eBay Listing,SKU-RED
PROD-SP-2024,Amazon Speaker,SKU-SP-BLK
```
✅ **All Valid** - All subSkus exist in their respective products

---

### **Listing CSV (Invalid):**
```csv
groupSku,title,subSku
PROD-WH-2024,Amazon Listing,SKU-INVALID
PROD-WH-2024,eBay Listing,SKU-BLK,SKU-WRONG
PROD-WRONG,Walmart Listing,SKU-BLK
```

**Errors:**
- Row 1: ❌ "SKU-INVALID" not found in product
- Row 2: ❌ "SKU-WRONG" not found in product
- Row 3: ❌ Product "PROD-WRONG" not found

---

## 🚀 Quick Test

### **1. Create Product**
```json
POST /api/products
{
  "brandId": 1,
  "groupSku": "TEST-001",
  "subSku": "A,B,C",
  "title": "Test Product",
  "category": "Test",
  "shipTypes": "Standard",
  "singleSetItem": "Single",
  "brandRealPrice": 100,
  "brandMiscellaneous": 0,
  "msrp": 150
}
```

### **2. Create Valid Listing**
```json
POST /api/listings
{
  "groupSku": "TEST-001",
  "subSku": "A,B",
  "title": "Test Listing",
  "category": "Test",
  "shipTypes": "Standard",
  "singleSetItem": "Single",
  "brandRealPrice": 100,
  "brandMiscellaneous": 0,
  "msrp": 150
}
```
✅ **Success!** Product exists, subSkus valid.

### **3. Create Invalid Listing**
```json
POST /api/listings
{
  "groupSku": "TEST-001",
  "subSku": "X,Y,Z",
  "title": "Invalid Listing",
  "category": "Test",
  "shipTypes": "Standard",
  "singleSetItem": "Single",
  "brandRealPrice": 100,
  "brandMiscellaneous": 0,
  "msrp": 150
}
```
❌ **Error!** "X,Y,Z" not found in product.

---

## 🎯 Summary

### **Validation Checklist:**
- ✅ Product exists with matching groupSku
- ✅ Listing's groupSku matches product's groupSku
- ✅ ALL listing subSkus exist in product's subSku list
- ✅ User has access to product's brand

**All 4 checks must pass to create a listing!**

---

**Now your listings are fully validated!** 🎉

