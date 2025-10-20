import ListingModel from '../models/Listing.js';
import InventoryModel from '../models/Inventory.js';
import SettingModel from '../models/Setting.js';
import { prisma } from '../config/database.js';
import { processImage, processImages } from '../utils/imageDownloader.js';
import jobTracker from '../services/jobTracker.js';
import BackgroundProcessor from '../services/backgroundProcessor.js';

class ListingController {
  // Helper method to normalize field names (case-insensitive)
  static normalizeFieldName(obj, fieldName) {
    if (!obj) return null;
    
    const lowerFieldName = fieldName.toLowerCase();
    
    // Check for exact match first
    if (Object.prototype.hasOwnProperty.call(obj, fieldName)) {
      return fieldName;
    }
    
    // Check for case-insensitive match
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && key.toLowerCase() === lowerFieldName) {
        return key;
      }
    }
    
    return null;
  }

  // Helper method to get field value with case-insensitive lookup
  static getFieldValue(obj, fieldName) {
    const actualKey = ListingController.normalizeFieldName(obj, fieldName);
    return actualKey ? obj[actualKey] : undefined;
  }

  // Helper method for validating and converting price values
  static validatePrice(value, fieldName) {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Handle different data types
    let numericValue;
    
    if (typeof value === 'number') {
      numericValue = value;
    } else if (typeof value === 'string') {
      const valueStr = value.trim();
      if (valueStr === '') {
        return null;
      }
      numericValue = parseFloat(valueStr);
    } else if (typeof value === 'boolean') {
      numericValue = value ? 1 : 0;
    } else {
      const valueStr = String(value).trim();
      if (valueStr === '') {
        return null;
      }
      numericValue = parseFloat(valueStr);
    }
    
    // Check if it's a valid number and not negative
    if (isNaN(numericValue) || numericValue < 0) {
      throw new Error(`Invalid ${fieldName}: "${value}" (${typeof value}) - must be a valid positive number`);
    }
    
    return parseFloat(numericValue.toFixed(2));
  }

  // API 1: Get all listings with pagination (filtered by user access for regular users)
  static async getAllListings(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      const filters = {
        brandId: req.query.brandId,
        category: req.query.category,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        search: req.query.search
      };

      console.log('🔍 User Access Check:', {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email,
        page: page,
        limit: limit,
        filters: filters
      });

      // Get settings for inventory thresholds
      let settings = await prisma.setting.findFirst();
      if (!settings) {
        // Create default settings if not exists
        settings = await prisma.setting.create({
          data: {
            inventoryConfig: {
              minValue: 3
            }
          }
        });
      }
      
      const inventoryConfig = settings.inventoryConfig;
      const minValue = inventoryConfig.minValue || 3;

      const result = await ListingModel.findAll(req.user.userId, req.user.role, page, limit, filters);

      // Get brand mappings from settings for display
      const ownBrandMappings = settings.ownBrand || {};

      // Fetch inventory for each listing by matching subSkus (since inventory is now globally unique)
      const listingsWithInventoryStats = await Promise.all(result.listings.map(async (listing) => {
        const inventoryArray = [];
        let minQuantity = 0;
        let status = 'Out of Stock';  // Default status
        let inventoryRecords = [];
        
        // Parse listing's subSkus in order
        if (listing.subSku) {
          const subSkus = listing.subSku.split(',').map(s => s.trim()).filter(s => s);
          
          // Fetch all inventory records that match these subSkus
          const fetchedInventory = await prisma.inventory.findMany({
            where: {
              subSku: { in: subSkus }
            },
            select: {
              id: true,
              subSku: true,
              quantity: true,
              eta: true,
              createdAt: true,
              updatedAt: true
            }
          });
          
          // Create a map for quick lookup: subSku -> inventory record
          const inventoryMap = new Map();
          fetchedInventory.forEach(inv => {
            inventoryMap.set(inv.subSku, inv);
          });
          
          // Build inventory array in the SAME ORDER as listing's subSkus
          for (const subSku of subSkus) {
            const inv = inventoryMap.get(subSku);
            if (inv) {
              inventoryRecords.push(inv);
              inventoryArray.push(inv.quantity);
            } else {
              // SubSku exists in listing but no inventory record found
              inventoryArray.push(0);  // Default to 0 if not found
            }
          }
        }
        
        // Calculate minimum quantity from inventoryArray
        if (inventoryArray.length > 0) {
          if (inventoryArray.length === 1) {
            // Single subSku - show direct value
            minQuantity = inventoryArray[0];
          } else {
            // Multiple subSkus - show minimum value
            minQuantity = Math.min(...inventoryArray);
          }
        }
        
        // Determine stock status based on settings
        if (minQuantity > minValue) {
          status = 'In Stock';
        } else if (minQuantity === minValue) {
          status = 'Warning';  // Low stock - equal to min
        } else {
          status = 'Out of Stock';  // Less than min
        }
        
        // Apply brand mapping from settings (business logic)
        const originalBrandName = listing.brand?.name;
        const displayBrandName = originalBrandName ? (ownBrandMappings[originalBrandName] || originalBrandName) : originalBrandName;

        return {
          ...listing,
          brand: listing.brand ? {
            ...listing.brand,
            displayName: displayBrandName  // Add custom brand name for display
          } : listing.brand,
          inventory: inventoryRecords,  // Inventory records in subSku order
          inventoryArray: inventoryArray,  // Quantities in SAME order as subSkus
          quantity: minQuantity,            // Min quantity (or direct if single)
          status: status                    // Stock status
        };
      }));

      // Calculate duplicate statistics
      const duplicateGroups = {};
      
      listingsWithInventoryStats.forEach(listing => {
        const key = `${listing.sku}|${listing.subSku || ''}`;
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = {
            sku: listing.sku,
            subSku: listing.subSku || '',
            count: 0,
            listings: []
          };
        }
        duplicateGroups[key].count++;
        duplicateGroups[key].listings.push({
          id: listing.id,
          title: listing.title,
          brandId: listing.brandId
        });
      });

      // Find duplicates (count > 1)
      const duplicates = Object.values(duplicateGroups)
        .filter(group => group.count > 1)
        .map(group => ({
          sku: group.sku,
          subSku: group.subSku,
          listings: group.listings
        }));

      const totalDuplicateListings = duplicates.reduce((sum, dup) => sum + dup.listings.length, 0);

      console.log('📦 Listings Found:', {
        totalListings: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        duplicateListings: totalDuplicateListings,
        userRole: req.user.role,
        userId: req.user.userId
      });

      // Get base URL from environment
      const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;

      // Filter base64 images and prepend base URL to local paths
      const cleanListings = listingsWithInventoryStats.map(listing => {
        const cleanedListing = { ...listing };
        
        // Process mainImageUrl
        if (cleanedListing.mainImageUrl) {
          if (cleanedListing.mainImageUrl.startsWith('data:image/')) {
            // Remove base64
            cleanedListing.mainImageUrl = null;
          } else if (cleanedListing.mainImageUrl.startsWith('/uploads/')) {
            // Update old path and prepend base URL
            let imagePath = cleanedListing.mainImageUrl.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
            cleanedListing.mainImageUrl = `${IMAGE_BASE_URL}${imagePath}`;
          }
          // External URLs remain unchanged
        }
        
        // Process galleryImages
        if (Array.isArray(cleanedListing.galleryImages)) {
          cleanedListing.galleryImages = cleanedListing.galleryImages
            .filter(img => img && !img.startsWith('data:image/')) // Remove base64
            .map(img => {
              // Prepend base URL to local paths
              if (img.startsWith('/uploads/')) {
                // Update old path
                let imagePath = img.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                return `${IMAGE_BASE_URL}${imagePath}`;
              }
              return img; // External URLs remain unchanged
            });
          
          if (cleanedListing.galleryImages.length === 0) {
            cleanedListing.galleryImages = null;
          }
        }
        
        return cleanedListing;
      });

      res.json({
        message: 'Listings retrieved successfully',
        userAccess: {
          userId: req.user.userId,
          role: req.user.role,
          email: req.user.email
        },
        timestamp: new Date().toISOString(),
        listings: cleanListings,  // Use cleaned listings
        pagination: result.pagination,
        duplicateStats: {
          totalDuplicates: totalDuplicateListings,
          duplicates: duplicates.slice(0, 10) // Show first 10 duplicate groups
        }
      });
    } catch (error) {
      console.error('Get all listings error:', error);
      res.status(500).json({
        error: 'Failed to retrieve listings',
        details: error.message
      });
    }
  }

  // API 2: Create new listing(s) - Single/Multiple/Excel/CSV - PRODUCT MUST EXIST
  static async createListing(req, res) {
    try {
      let listingsToCreate = [];
      let results = {
        created: [],
        errors: [],
        duplicates: []
      };

      // Process uploaded image files first
      let uploadedMainImage = null;
      let uploadedGalleryImages = [];
      
      if (req.files) {
        // Handle mainImageUrl (same field name as JSON!)
        if (req.files.mainImageUrl && req.files.mainImageUrl.length > 0) {
          const mainImg = req.files.mainImageUrl[0];
          uploadedMainImage = `/uploads/images/${mainImg.filename}`;
          console.log('📸 Main image uploaded:', uploadedMainImage);
        }
        
        // Handle galleryImages (same field name as JSON!)
        if (req.files.galleryImages && req.files.galleryImages.length > 0) {
          uploadedGalleryImages = req.files.galleryImages.map(img => `/uploads/images/${img.filename}`);
          console.log('🖼️ Gallery images uploaded:', uploadedGalleryImages.length);
        }
      }

      // Check if Excel/CSV file was uploaded
      if (req.files && req.files.file && req.files.file.length > 0) {
        const file = req.files.file[0];
        console.log('📁 File Upload Detected:', {
          filename: file.originalname,
          storedFilename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        });

        // Process file upload from disk
        const FileProcessor = (await import('../utils/fileProcessor.js')).default;
        const fs = await import('fs');
        
        const fileBuffer = fs.readFileSync(file.path);
        const fileData = await FileProcessor.processFileBuffer(fileBuffer, file.originalname);
        
        if (fileData.length === 0) {
          return res.status(400).json({
            error: 'File is empty or contains no valid data'
          });
        }

        // Validate file data
        const { validData, errors } = FileProcessor.validateProductData(fileData);
        
        if (errors.length > 0) {
          return res.status(400).json({
            error: 'File validation failed',
            details: errors
          });
        }

        listingsToCreate = validData;
      } else {
        // Handle JSON data (single or multiple listings)
        const { listings, productId, productGroupSku, title, groupSku, subSku, category, collectionName, shipTypes, singleSetItem, attributes } = req.body;

        if (listings && Array.isArray(listings)) {
          // Multiple listings with case-insensitive field extraction
          listingsToCreate = listings.map(listing => ({
            productId: ListingController.getFieldValue(listing, 'productId'),
            productGroupSku: ListingController.getFieldValue(listing, 'productGroupSku'),
            brandId: ListingController.getFieldValue(listing, 'brandId'),
            brandName: ListingController.getFieldValue(listing, 'brandName'),
            title: ListingController.getFieldValue(listing, 'title')?.trim(),
            sku: ListingController.getFieldValue(listing, 'sku')?.trim(),
            subSku: ListingController.getFieldValue(listing, 'subSku')?.trim(),
            category: ListingController.getFieldValue(listing, 'category')?.trim(),
            collectionName: ListingController.getFieldValue(listing, 'collectionName')?.trim(),
            shipTypes: ListingController.getFieldValue(listing, 'shipTypes')?.trim(),
            singleSetItem: ListingController.getFieldValue(listing, 'singleSetItem')?.trim(),
            brandRealPrice: ListingController.getFieldValue(listing, 'brandRealPrice'),
            brandMiscellaneous: ListingController.getFieldValue(listing, 'brandMiscellaneous'),
            msrp: ListingController.getFieldValue(listing, 'msrp'),
            shippingPrice: ListingController.getFieldValue(listing, 'shippingPrice'),
            commissionPrice: ListingController.getFieldValue(listing, 'commissionPrice'),
            profitMarginPrice: ListingController.getFieldValue(listing, 'profitMarginPrice'),
            ecommerceMiscellaneous: ListingController.getFieldValue(listing, 'ecommerceMiscellaneous'),
            ecommercePrice: ListingController.getFieldValue(listing, 'ecommercePrice'),
            mainImageUrl: ListingController.getFieldValue(listing, 'mainImageUrl'),
            galleryImages: ListingController.getFieldValue(listing, 'galleryImages'),
            productCounts: ListingController.getFieldValue(listing, 'productCounts'),
            attributes: ListingController.getFieldValue(listing, 'attributes') || {}
          }));
        } else if (title && (ListingController.getFieldValue(req.body, 'sku'))) {
          // Single listing - extract sku field (case-insensitive)
          const skuValue = ListingController.getFieldValue(req.body, 'sku');
          
          listingsToCreate = [{
            productId: productId,
            productGroupSku: productGroupSku,
            brandId: ListingController.getFieldValue(req.body, 'brandId'),
            brandName: ListingController.getFieldValue(req.body, 'brandName'),
            title: title.trim(),
            sku: skuValue?.trim() || '',
            subSku: subSku?.trim() || '',
            category: category?.trim() || '',
            collectionName: collectionName?.trim() || '',
            shipTypes: shipTypes?.trim() || '',
            singleSetItem: singleSetItem?.trim() || '',
            brandRealPrice: ListingController.getFieldValue(req.body, 'brandRealPrice'),
            brandMiscellaneous: ListingController.getFieldValue(req.body, 'brandMiscellaneous'),
            msrp: ListingController.getFieldValue(req.body, 'msrp'),
            shippingPrice: ListingController.getFieldValue(req.body, 'shippingPrice'),
            commissionPrice: ListingController.getFieldValue(req.body, 'commissionPrice'),
            profitMarginPrice: ListingController.getFieldValue(req.body, 'profitMarginPrice'),
            ecommerceMiscellaneous: ListingController.getFieldValue(req.body, 'ecommerceMiscellaneous'),
            ecommercePrice: ListingController.getFieldValue(req.body, 'ecommercePrice'),
            // Use uploaded files if available, otherwise use URLs from body
            mainImageUrl: uploadedMainImage || ListingController.getFieldValue(req.body, 'mainImageUrl'),
            galleryImages: uploadedGalleryImages.length > 0 ? uploadedGalleryImages : ListingController.getFieldValue(req.body, 'galleryImages'),
            productCounts: ListingController.getFieldValue(req.body, 'productCounts'),
            attributes: attributes || {}
          }];
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "listings" array, single listing data, or upload a file',
            required: {
              singleListing: ['title', 'sku', 'subSku (validates in product)'],
              multipleListings: ['listings array'],
              fileUpload: ['upload Excel/CSV file with sku and subSku columns']
            },
            note: 'subSku must exist in product table. Case-insensitive matching (sku, SKU, sKU all work)'
          });
        }
      }

      // Track listings to count duplicates (but still create them)
      const processedListings = new Map(); // Key: groupSku+subSku, Value: count
      
      // Process each listing
      for (const listingData of listingsToCreate) {
        try {
          // STEP 0: Validate sku is provided (required field)
          if (!listingData.sku || listingData.sku.trim() === '') {
            results.errors.push({
              title: listingData.title,
              error: 'SKU is required and cannot be empty'
            });
            continue;
          }
          
          // Track duplicates (but don't skip them - create all)
          const duplicateKey = `${listingData.sku}|${listingData.subSku || ''}`;
          if (processedListings.has(duplicateKey)) {
            const count = processedListings.get(duplicateKey);
            processedListings.set(duplicateKey, count + 1);
            // Log duplicate but still create it
            results.duplicates.push({
              title: listingData.title,
              sku: listingData.sku,
              subSku: listingData.subSku,
              note: `Duplicate: Same sku "${listingData.sku}" and subSku "${listingData.subSku || ''}"`
            });
            // Don't skip - continue to create the listing
          } else {
            processedListings.set(duplicateKey, 1);
          }
          
          // STEP 1: Find product by subSku (if provided) or by productId
          let product = null;
          
          if (listingData.subSku && listingData.subSku.trim() !== '') {
            // SubSku provided - find product that contains this subSku (case-insensitive)
            const listingSubSkus = listingData.subSku.split(',').map(s => s.trim()).filter(s => s);
            
            console.log('🔍 Searching for product with subSkus (case-insensitive):', listingSubSkus);
            
            // Find any product that contains at least one of the listing's subSkus (case-insensitive)
            const allProducts = await prisma.product.findMany({
              include: {
                brand: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            });
            
            for (const prod of allProducts) {
              if (prod.subSku) {
                const productSubSkus = prod.subSku.split(',').map(s => s.trim()).filter(s => s);
                // Check if any listing subSku exists in product (case-insensitive)
                const found = listingSubSkus.some(lsku => 
                  productSubSkus.some(psku => psku.toLowerCase() === lsku.toLowerCase())
                );
                if (found) {
                  product = prod;
                  
                  // Validate ALL listing subSkus exist in product (case-insensitive)
                  const invalidSubSkus = listingSubSkus.filter(lsku => 
                    !productSubSkus.some(psku => psku.toLowerCase() === lsku.toLowerCase())
                  );
                  
                  if (invalidSubSkus.length > 0) {
                    results.errors.push({
                      title: listingData.title,
                      sku: listingData.sku,
                      subSku: listingData.subSku,
                      error: `SubSKU validation failed: "${invalidSubSkus.join(', ')}" not found in product. Product has: ${product.subSku || 'none'}`
                    });
                    product = null; // Reset product
                    break;
                  }
                  
                  break;
                }
              }
            }
            
            if (!product) {
              results.errors.push({
                title: listingData.title,
                sku: listingData.sku,
                subSku: listingData.subSku,
                error: `Product not found with subSku: "${listingData.subSku}". Listing subSku must exist in product's subSku field!`
              });
              continue;
            }
          } else {
            // No subSku provided - find product by productId
            console.log('ℹ️ No subSku provided, will copy from product');
            
            if (listingData.productId) {
              product = await prisma.product.findUnique({
                where: { id: parseInt(listingData.productId) },
                include: {
                  brand: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              });
            }
            
            if (!product) {
              results.errors.push({
                title: listingData.title,
                sku: listingData.sku,
                error: `SubSku not provided and no product found. Provide either subSku or productId.`
              });
              continue;
            }
          }

          console.log('✅ Product Found:', {
            productId: product.id,
            productTitle: product.title,
            productGroupSku: product.groupSku,
            productSubSku: product.subSku,
            brandName: product.brand.name
          });

          // Define productSubSkus for later use (case-sensitive array from product)
          const productSubSkus = product.subSku ? product.subSku.split(',').map(sku => sku.trim()).filter(sku => sku) : [];

          // STEP 2: Get brand from listing data (NOT from product)
          // Listing has its own brand, we only validate product exists
          let brand = null;
          if (listingData.brandId) {
            brand = await ListingModel.checkBrandExists(listingData.brandId);
          } else if (listingData.brandName) {
            brand = await ListingModel.checkBrandExists(listingData.brandName);
          } else {
            // If no brand provided in listing, use product's brand as fallback
            brand = product.brand;
          }
          
          if (!brand) {
            results.errors.push({
              title: listingData.title,
              error: `Brand not found: ${listingData.brandId || listingData.brandName || 'no brand provided'}`
            });
            continue;
          }

          console.log('✅ Brand Information:', {
            brandId: brand.id,
            brandName: brand.name
          });

          // STEP 3: Check user access to brand (for non-admin users)
          if (req.user.role !== 'ADMIN') {
            const hasAccess = await prisma.userBrandAccess.findFirst({
              where: {
                userId: req.user.userId,
                brandId: brand.id,
                isActive: true
              }
            });

            if (!hasAccess) {
              results.errors.push({
                title: listingData.title,
                error: `Access denied to brand: ${brand.name}`
              });
              continue;
            }
          }

          // STEP 4: If subSku not provided, copy from product
          if (!listingData.subSku || listingData.subSku.trim() === '') {
            listingData.subSku = product.subSku;
            console.log(`ℹ️ Copied subSku from product: ${listingData.subSku}`);
          }

          // STEP 4.5: Auto-generate productCounts if not provided
          if (!listingData.productCounts && listingData.subSku) {
            const subSkuArray = listingData.subSku.split(',').map(s => s.trim()).filter(s => s);
            const counts = {};
            
            // Count occurrences of each subSku (case-insensitive counting)
            subSkuArray.forEach(sku => {
              // Normalize to original case from product for consistency
              const matchingProductSku = productSubSkus.find(psku => psku.toLowerCase() === sku.toLowerCase());
              const normalizedSku = matchingProductSku || sku; // Use product's case if found
              
              if (counts[normalizedSku]) {
                counts[normalizedSku] += 1;
              } else {
                counts[normalizedSku] = 1;
              }
            });
            
            listingData.productCounts = counts;
            console.log('✅ Auto-generated productCounts from subSku (case-insensitive):', counts);
          }

          // STEP 5: Validate and convert price values
          let brandRealPrice, brandMiscellaneous, msrp = null;
          
          try {
            brandRealPrice = ListingController.validatePrice(listingData.brandRealPrice, 'Brand Real Price');
            if (brandRealPrice === null) {
              results.errors.push({
                title: listingData.title,
                error: 'Brand Real Price is mandatory'
              });
              continue;
            }
            
            brandMiscellaneous = ListingController.validatePrice(listingData.brandMiscellaneous, 'Brand Miscellaneous') || 0;
            
            const msrpValue = ListingController.getFieldValue(listingData, 'msrp');
            if (msrpValue === undefined || msrpValue === null || msrpValue === '') {
              results.errors.push({
                title: listingData.title,
                error: 'MSRP is mandatory'
              });
              continue;
            }
            
            msrp = ListingController.validatePrice(msrpValue, 'MSRP');
          } catch (error) {
            results.errors.push({
              title: listingData.title,
              error: error.message
            });
            continue;
          }

          // Process attributes - keep all values (including numbers, arrays, nested objects)
          let finalAttributes = { ...listingData.attributes };
          
          // Only remove truly empty values (null, undefined, empty strings)
          Object.keys(finalAttributes).forEach(key => {
            const value = finalAttributes[key];
            // Only delete if null, undefined, or empty string
            // Keep: numbers (0, 3.7), arrays (even empty), objects, booleans
            if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
              delete finalAttributes[key];
            }
          });

          // STEP 6: Create listing with data from request (NOT from product)
          // Product is only used for validation, listing uses its own data
          
          // Process images: EITHER files OR URLs (not both)
          let finalMainImage = null;
          let finalGalleryImages = null;
          
          // If files uploaded, use files ONLY (ignore URLs)
          if (uploadedMainImage || uploadedGalleryImages.length > 0) {
            finalMainImage = uploadedMainImage;
            finalGalleryImages = uploadedGalleryImages.length > 0 ? uploadedGalleryImages : null;
          } 
          // If no files uploaded, check for URLs and download them
          else {
            if (listingData.mainImageUrl) {
              finalMainImage = await processImage(listingData.mainImageUrl);
            }
            
            if (listingData.galleryImages && Array.isArray(listingData.galleryImages)) {
              const downloadedGallery = await processImages(listingData.galleryImages);
              if (downloadedGallery.length > 0) {
                finalGalleryImages = downloadedGallery;
              }
            }
          }

          const listing = await ListingModel.create({
            productId: product.id,  // Link to product (for validation only)
            brandId: brand.id,  // For access control and display
            title: listingData.title,
            sku: listingData.sku, // sku field required (case-insensitive: sku, SKU, sKU all work)
            subSku: listingData.subSku,
            category: listingData.category,
            collectionName: listingData.collectionName || '',
            shipTypes: listingData.shipTypes,
            singleSetItem: listingData.singleSetItem,
            brandRealPrice: brandRealPrice,
            brandMiscellaneous: brandMiscellaneous,
            brandPrice: brandRealPrice,
            msrp: msrp,
            shippingPrice: listingData.shippingPrice || 0,
            commissionPrice: listingData.commissionPrice || 0,
            profitMarginPrice: listingData.profitMarginPrice || 0,
            ecommerceMiscellaneous: listingData.ecommerceMiscellaneous || 0,
            ecommercePrice: listingData.ecommercePrice || 0,
            mainImageUrl: finalMainImage,
            galleryImages: finalGalleryImages,
            productCounts: listingData.productCounts || null,  // JSONB mapping subSku to quantity
            attributes: finalAttributes
          });

          // STEP 7: Auto-create inventory items from listing's subSku (check for existing first)
          let inventoryItems = [];
          try {
            const subSkus = listingData.subSku.split(',').map(s => s.trim()).filter(s => s);
            
            for (const subSku of subSkus) {
              // Check if inventory already exists for this subSku (globally unique)
              let existingInventory = await prisma.inventory.findUnique({
                where: { subSku: subSku }
              });
              
              if (existingInventory) {
                // Inventory already exists - reuse it
                console.log(`ℹ️ Inventory already exists for subSku: ${subSku} (ID: ${existingInventory.id})`);
                inventoryItems.push(existingInventory);
              } else {
                // Create new inventory record
                const item = await prisma.inventory.create({
                  data: {
                    listingId: listing.id,
                    brandId: brand.id,
                    subSku: subSku,
                    quantity: 0,  // Default: 0
                    eta: null     // Default: null
                  }
                });
                inventoryItems.push(item);
                console.log(`✅ Created new inventory for subSku: ${subSku} (ID: ${item.id})`);
              }
            }
            
            console.log(`✅ Processed ${inventoryItems.length} inventory items for listing ${listing.id} (${inventoryItems.filter(i => i.listingId === listing.id).length} new, ${inventoryItems.filter(i => i.listingId !== listing.id).length} existing)`);
          } catch (error) {
            console.error('Failed to process inventory items:', error);
          }

          // Add inventory data to listing response
          const listingWithInventory = {
            ...listing,
            inventory: inventoryItems
          };

          // Add full URLs for response (prepend base URL)
          const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;
          const listingWithFullUrls = {
            ...listingWithInventory,
            mainImageUrl: listingWithInventory.mainImageUrl && listingWithInventory.mainImageUrl.startsWith('/uploads/') 
              ? `${IMAGE_BASE_URL}${listingWithInventory.mainImageUrl}` 
              : listingWithInventory.mainImageUrl,
            galleryImages: Array.isArray(listingWithInventory.galleryImages)
              ? listingWithInventory.galleryImages.map(img => 
                  img && img.startsWith('/uploads/') ? `${IMAGE_BASE_URL}${img}` : img
                )
              : listingWithInventory.galleryImages
          };

          results.created.push(listingWithFullUrls);

        } catch (error) {
          results.errors.push({
            title: listingData.title,
            error: error.message
          });
        }
      }

      // Prepare response
      const response = {
        message: `Processed ${listingsToCreate.length} listing(s)`,
        summary: {
          total: listingsToCreate.length,
          created: results.created.length,
          duplicates: results.duplicates.length,
          errors: results.errors.length
        },
        timestamp: new Date().toISOString(),
        results: results
      };

      if (req.files && req.files.file && req.files.file.length > 0) {
        const file = req.files.file[0];
        response.fileInfo = {
          originalName: file.originalname,
          storedName: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        };
      }
      
      // Add image upload info
      if (uploadedMainImage || uploadedGalleryImages.length > 0) {
        response.uploadedImages = {
          mainImage: uploadedMainImage,
          galleryImages: uploadedGalleryImages,
          totalImages: (uploadedMainImage ? 1 : 0) + uploadedGalleryImages.length
        };
      }

      if (results.created.length === 0) {
        return res.status(400).json({
          ...response,
          message: 'No listings were created'
        });
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Create listing error:', error);
      res.status(500).json({
        error: 'Failed to create listing(s)',
        details: error.message
      });
    }
  }

  // API 3: Update listing
  static async updateListing(req, res) {
    try {
      const listingId = parseInt(req.params.id);
      const { title, sku, groupSku, subSku, category, collectionName, shipTypes, singleSetItem, productCounts, attributes } = req.body;

      // Check if listing exists
      const existingListing = await ListingModel.findById(listingId);
      if (!existingListing) {
        return res.status(404).json({
          error: 'Listing not found'
        });
      }

      // Check user access to listing's brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: existingListing.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to listings from brand: ${existingListing.brand.name}`
          });
        }
      }

      const updatedListing = await ListingModel.update(listingId, {
        title,
        sku: sku || groupSku,
        subSku,
        category,
        collectionName,
        shipTypes,
        singleSetItem,
        productCounts,
        attributes
      });

      res.json({
        message: 'Listing updated successfully',
        listingId: listingId,
        timestamp: new Date().toISOString(),
        listing: updatedListing
      });
    } catch (error) {
      console.error('Update listing error:', error);
      res.status(500).json({
        error: 'Failed to update listing',
        details: error.message
      });
    }
  }

  // API 4: Delete listing
  static async deleteListing(req, res) {
    try {
      const listingId = parseInt(req.params.id);

      // Check if listing exists
      const existingListing = await ListingModel.findById(listingId);
      if (!existingListing) {
        return res.status(404).json({
          error: 'Listing not found'
        });
      }

      // Check user access to listing's brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: existingListing.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to listings from brand: ${existingListing.brand.name}`
          });
        }
      }

      await ListingModel.delete(listingId);

      res.json({
        message: 'Listing deleted successfully'
      });
    } catch (error) {
      console.error('Delete listing error:', error);
      res.status(500).json({
        error: 'Failed to delete listing',
        details: error.message
      });
    }
  }

  // API 5: Delete all listings (Admin only)
  static async deleteAllListings(req, res) {
    try {
      // Only admin can delete all listings
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only administrators can delete all listings'
        });
      }

      const deletedCount = await ListingModel.deleteAll();

      res.json({
        message: 'All listings deleted successfully',
        deletedCount: deletedCount.count
      });
    } catch (error) {
      console.error('Delete all listings error:', error);
      res.status(500).json({
        error: 'Failed to delete all listings',
        details: error.message
      });
    }
  }

  // Get simple image template - sku, subSku, mainImageUrl, galleryImages (listings without images first)
  static async getImageTemplate(req, res) {
    try {
      // Build where clause based on user access
      let whereClause = {};
      
      // For non-admin users, filter by accessible brands
      if (req.user.role !== 'ADMIN') {
        const userBrands = await prisma.userBrandAccess.findMany({
          where: {
            userId: req.user.userId,
            isActive: true
          }
        });
        
        const accessibleBrandIds = userBrands.map(access => access.brandId);
        
        if (accessibleBrandIds.length === 0) {
          return res.status(403).json({
            error: 'No brand access',
            message: 'You don\'t have access to any brands'
          });
        }
        
        whereClause.brandId = { in: accessibleBrandIds };
      }
      
      // Get all listings with image fields
      const listings = await prisma.listing.findMany({
        where: whereClause,
        select: {
          sku: true,
          subSku: true,
          mainImageUrl: true,
          galleryImages: true
        },
        orderBy: {
          sku: 'asc'
        }
      });
      
      // Get base URL from environment
      const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;
      
      // Helper function to prepend base URL to local paths
      const prependBaseUrl = (imagePath) => {
        if (!imagePath || imagePath.trim() === '') return '';
        
        // If already a full URL (starts with http:// or https://), return as is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          return imagePath;
        }
        
        // If local path (starts with /uploads/), prepend base URL
        if (imagePath.startsWith('/uploads/')) {
          // Fix old path naming
          let fixedPath = imagePath.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
          return `${IMAGE_BASE_URL}${fixedPath}`;
        }
        
        // Otherwise return as is
        return imagePath;
      };
      
      // Separate listings with and without images
      const listingsWithoutImages = [];
      const listingsWithImages = [];
      
      listings.forEach(listing => {
        const hasMainImage = listing.mainImageUrl && listing.mainImageUrl.trim() !== '';
        const hasGalleryImages = listing.galleryImages && Array.isArray(listing.galleryImages) && listing.galleryImages.length > 0;
        const hasImages = hasMainImage || hasGalleryImages;
        
        // Process main image URL
        const mainImageWithBaseUrl = prependBaseUrl(listing.mainImageUrl);
        
        // Process gallery images and format as comma-separated string for Excel
        let galleryImagesStr = '';
        if (listing.galleryImages && Array.isArray(listing.galleryImages)) {
          const galleryWithBaseUrls = listing.galleryImages.map(img => prependBaseUrl(img));
          galleryImagesStr = galleryWithBaseUrls.join(',');
        }
        
        const listingData = {
          sku: listing.sku,
          subSku: listing.subSku || '',
          mainImageUrl: mainImageWithBaseUrl,
          galleryImages: galleryImagesStr
        };
        
        if (hasImages) {
          listingsWithImages.push(listingData);
        } else {
          listingsWithoutImages.push(listingData);
        }
      });
      
      // Combine data: listings WITHOUT images first, then listings WITH images
      const templateData = [...listingsWithoutImages, ...listingsWithImages];
      
      res.json({
        message: 'Listing image template data retrieved successfully - Listings without images shown first',
        timestamp: new Date().toISOString(),
        summary: {
          totalListings: listings.length,
          listingsWithoutImages: listingsWithoutImages.length,
          listingsWithImages: listingsWithImages.length
        },
        columns: ['sku', 'subSku', 'mainImageUrl', 'galleryImages'],
        imageBaseUrl: IMAGE_BASE_URL,
        templateData: templateData
      });
      
    } catch (error) {
      console.error('Get listing image template error:', error);
      res.status(500).json({
        error: 'Failed to get listing image template',
        details: error.message
      });
    }
  }

  // Bulk upload listing images - Excel/JSON with image URLs - Unlimited with background processing
  static async bulkUploadListingImages(req, res) {
    try {
      console.log('📸 Bulk Listing Image Upload Started');
      console.log('🔍 Request Content-Type:', req.get('Content-Type'));
      
      let imageData = [];
      
      // Check if Excel/CSV file was uploaded
      if (req.file) {
        console.log('📁 Excel File Upload Detected:', {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path
        });

        // Process Excel/CSV file from disk
        const FileProcessor = (await import('../utils/fileProcessor.js')).default;
        const fs = await import('fs');
        
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileData = await FileProcessor.processFileBuffer(fileBuffer, req.file.originalname);
        
        console.log('📊 Excel Data Processed:', {
          totalRows: fileData.length,
          sampleRow: fileData[0] || null
        });
        
        if (fileData.length === 0) {
          return res.status(400).json({
            error: 'Excel file is empty or contains no valid data'
          });
        }

        // Transform Excel data to imageData format
        // Expected columns: sku, mainImageUrl, galleryImages (comma-separated URLs)
        imageData = fileData.map(row => {
          const galleryImagesStr = ListingController.getFieldValue(row, 'galleryImages');
          let galleryImagesArray = [];
          
          if (galleryImagesStr) {
            // Handle comma-separated URLs
            if (typeof galleryImagesStr === 'string') {
              galleryImagesArray = galleryImagesStr.split(',').map(url => url.trim()).filter(url => url);
            } else if (Array.isArray(galleryImagesStr)) {
              galleryImagesArray = galleryImagesStr;
            }
          }
          
          return {
            sku: ListingController.getFieldValue(row, 'sku'),
            mainImageUrl: ListingController.getFieldValue(row, 'mainImageUrl'),
            galleryImages: galleryImagesArray
          };
        }).filter(item => item.sku); // Only include rows with sku
        
        console.log('✅ Transformed to imageData:', {
          totalRecords: imageData.length,
          sample: imageData[0]
        });
        
      } else if (req.body.imageData && Array.isArray(req.body.imageData)) {
        // JSON bulk upload
        imageData = req.body.imageData;
      } else {
        return res.status(400).json({
          error: 'Invalid request format',
          message: 'Provide either an Excel/CSV file or JSON imageData array',
          examples: {
            excelUpload: 'Upload Excel with columns: sku, mainImageUrl, galleryImages',
            jsonUpload: '{ "imageData": [{ "sku": "SKU-001", "mainImageUrl": "url", "galleryImages": ["url1", "url2"] }] }'
          }
        });
      }
      
      // Validate imageData
      if (imageData.length === 0) {
        return res.status(400).json({
          error: 'No valid image data provided',
          message: 'Excel must contain sku column with image URLs'
        });
      }

      // For small datasets (< 100), process immediately
      if (imageData.length < 100) {
        console.log('📦 Small dataset detected, processing immediately...');
        return ListingController.processImageDataSync(req, res, imageData);
      }

      // For large datasets, use background processing
      console.log('🚀 Large dataset detected, using background processing...');
      
      const jobId = await BackgroundProcessor.processBulk(
        req.user.userId,
        'LISTING_IMAGE',
        imageData,
        async (item) => {
          const listing = await ListingModel.findBySku(item.sku);
          if (!listing) {
            throw new Error(`Listing not found: ${item.sku}`);
          }

          // Process images
          const mainImage = item.mainImageUrl ? await processImage(item.mainImageUrl) : listing.mainImageUrl;
          const galleryImages = item.galleryImages && Array.isArray(item.galleryImages) 
            ? await processImages(item.galleryImages)
            : listing.galleryImages;

          // Update listing
          return await ListingModel.update(listing.id, {
            mainImageUrl: mainImage,
            galleryImages: galleryImages
          });
        },
        50 // Batch size
      );

      res.status(202).json({
        message: `Large image dataset detected (${imageData.length} listings). Processing in background.`,
        jobId: jobId,
        status: 'PROCESSING',
        totalListings: imageData.length,
        estimatedTime: `${Math.ceil(imageData.length / 50)} minutes`,
        checkStatus: `/api/listings/status?jobId=${jobId}`,
        note: 'Use GET /api/listings/status to check progress',
        timestamp: new Date().toISOString(),
        fileInfo: req.file ? {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          path: req.file.path,
          size: req.file.size
        } : null
      });

    } catch (error) {
      console.error('❌ Bulk listing image upload error:', error);
      res.status(500).json({
        error: 'Failed to upload listing images',
        details: error.message
      });
    }
  }

  // Process image data synchronously (for small datasets)
  static async processImageDataSync(req, res, imageData) {
    try {
      let results = {
        updated: [],
        errors: [],
        notFound: []
      };

      for (const item of imageData) {
        try {
          // Find listing by sku
          const listing = await prisma.listing.findFirst({
            where: { sku: item.sku }
          });

          if (!listing) {
            results.notFound.push({
              sku: item.sku,
              error: 'Listing not found'
            });
            continue;
          }

          // Check user access (for non-admin users)
          if (req.user.role !== 'ADMIN') {
            const hasAccess = await prisma.userBrandAccess.findFirst({
              where: {
                userId: req.user.userId,
                brandId: listing.brandId,
                isActive: true
              }
            });

            if (!hasAccess) {
              results.errors.push({
                sku: item.sku,
                error: 'Access denied to this listing brand'
              });
              continue;
            }
          }

          // Process images (download URLs if provided)
          let finalMainImage = listing.mainImageUrl; // Keep existing if not provided
          let finalGalleryImages = listing.galleryImages || [];

          if (item.mainImageUrl) {
            finalMainImage = await processImage(item.mainImageUrl);
          }

          if (item.galleryImages && Array.isArray(item.galleryImages) && item.galleryImages.length > 0) {
            const downloadedGallery = await processImages(item.galleryImages);
            finalGalleryImages = [...finalGalleryImages, ...downloadedGallery];
          }

          // Update listing with new images
          const updatedListing = await prisma.listing.update({
            where: { id: listing.id },
            data: {
              mainImageUrl: finalMainImage,
              galleryImages: finalGalleryImages
            }
          });

          results.updated.push({
            sku: item.sku,
            listingId: listing.id,
            mainImageUrl: finalMainImage,
            galleryImagesCount: finalGalleryImages.length
          });

        } catch (error) {
          results.errors.push({
            sku: item.sku,
            error: error.message
          });
        }
      }

      // Get base URL for response
      const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;
      
      // Prepend base URL to local paths
      const cleanResults = results.updated.map(item => ({
        ...item,
        mainImageUrl: item.mainImageUrl && item.mainImageUrl.startsWith('/uploads/') 
          ? `${IMAGE_BASE_URL}${item.mainImageUrl}` 
          : item.mainImageUrl
      }));

      res.json({
        message: `Processed ${imageData.length} listing(s) for image upload`,
        summary: {
          total: imageData.length,
          updated: results.updated.length,
          notFound: results.notFound.length,
          errors: results.errors.length
        },
        timestamp: new Date().toISOString(),
        results: {
          updated: cleanResults,
          notFound: results.notFound,
          errors: results.errors
        }
      });

    } catch (error) {
      console.error('Process listing image data sync error:', error);
      res.status(500).json({
        error: 'Failed to process listing image data',
        details: error.message
      });
    }
  }

  // Get bulk processing status - Shows all listing background jobs
  static async getBulkStatus(req, res) {
    try {
      const { jobId } = req.query;

      // If specific job ID provided
      if (jobId) {
        const job = jobTracker.getJob(jobId);
        if (!job) {
          return res.status(404).json({
            error: 'Job not found',
            message: `Job ${jobId} does not exist`
          });
        }

        // Security Check: User can only see their own jobs (unless admin)
        if (job.userId !== req.user.userId && req.user.role !== 'ADMIN') {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You can only view your own jobs'
          });
        }

        return res.json({
          message: 'Job status retrieved successfully',
          job: {
            jobId: job.jobId,
            userId: job.userId,
            type: job.type,
            status: job.status,
            progress: `${job.progress}%`,
            total: job.data.total,
            processed: job.data.processed,
            success: job.data.success,
            failed: job.data.failed,
            errors: job.data.errors || [],
            startedAt: job.startedAt,
            completedAt: job.completedAt,
            duration: job.completedAt 
              ? `${Math.round((job.completedAt - job.startedAt) / 1000)}s`
              : `${Math.round((Date.now() - job.startedAt) / 1000)}s`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Admin can see all jobs, users see only their own
      const listingJobs = req.user.role === 'ADMIN'
        ? jobTracker.getJobsByType(null, 'LISTING')  // Admin: all jobs
        : jobTracker.getJobsByType(req.user.userId, 'LISTING'); // User: only their jobs
      
      // Format jobs for response
      const formattedJobs = listingJobs.map(job => ({
        jobId: job.jobId,
        ...(req.user.role === 'ADMIN' && { userId: job.userId }), // Show userId for admin
        type: job.type,
        status: job.status,
        progress: `${job.progress}%`,
        summary: {
          total: job.data.total,
          processed: job.data.processed,
          success: job.data.success,
          failed: job.data.failed
        },
        recentErrors: (job.data.errors || []).slice(0, 3), // Show 3 recent errors
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        duration: job.completedAt 
          ? `${Math.round((job.completedAt - job.startedAt) / 1000)}s`
          : `${Math.round((Date.now() - job.startedAt) / 1000)}s`
      }));

      // Get statistics if admin
      let stats = null;
      if (req.user.role === 'ADMIN') {
        stats = jobTracker.getStats();
      }

      res.json({
        message: 'Listing background jobs status',
        userRole: req.user.role,
        totalJobs: formattedJobs.length,
        jobs: formattedJobs,
        ...(stats && { systemStats: stats }),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get listing bulk status error:', error);
      res.status(500).json({
        error: 'Failed to get listing bulk processing status',
        details: error.message
      });
    }
  }

  // Cancel background job
  static async cancelJob(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          error: 'Job ID is required',
          message: 'Provide jobId in URL parameters'
        });
      }

      const job = jobTracker.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          error: 'Job not found',
          message: `Job ${jobId} does not exist`
        });
      }

      // Security Check: User can only cancel their own jobs (unless admin)
      if (job.userId !== req.user.userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only cancel your own jobs'
        });
      }

      // Check if job can be cancelled
      if (job.status !== 'PROCESSING') {
        return res.status(400).json({
          error: 'Cannot cancel job',
          message: `Job is already ${job.status}. Only PROCESSING jobs can be cancelled.`
        });
      }

      // Cancel the job
      const cancelled = jobTracker.cancelJob(jobId, req.user.role === 'ADMIN' ? `admin (${req.user.userId})` : 'user');

      if (cancelled) {
        res.json({
          message: 'Background job cancelled successfully',
          jobId: jobId,
          status: 'CANCELLED',
          note: 'Processing will stop at current item. Already processed items remain in database.',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          error: 'Failed to cancel job',
          message: 'Job cannot be cancelled at this time'
        });
      }

    } catch (error) {
      console.error('Cancel job error:', error);
      res.status(500).json({
        error: 'Failed to cancel background job',
        details: error.message
      });
    }
  }
}

export default ListingController;

