import ListingModel from '../models/Listing.js';
import InventoryModel from '../models/Inventory.js';
import ManagementLogger from '../utils/managementLogger.js';
import { prisma } from '../config/database.js';
import { processImage, processImages } from '../utils/imageDownloader.js';

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

      // Add computed inventory fields to each listing
      const listingsWithInventoryStats = result.listings.map(listing => {
        const inventoryArray = [];
        let minQuantity = 0;
        let status = 'Out of Stock';  // Default status
        
        if (listing.inventory && listing.inventory.length > 0) {
          // Extract quantities from inventory
          const quantities = listing.inventory.map(inv => inv.quantity);
          inventoryArray.push(...quantities);
          
          // Calculate minimum quantity
          if (quantities.length === 1) {
            // Single subSku - show direct value
            minQuantity = quantities[0];
          } else {
            // Multiple subSkus - show minimum value
            minQuantity = Math.min(...quantities);
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
        
        return {
          ...listing,
          inventoryArray: inventoryArray,  // Array of all quantities
          quantity: minQuantity,            // Min quantity (or direct if single)
          status: status                    // Stock status
        };
      });

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

      // Get base URL from environment (default: http://192.168.0.23:5000)
      const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'http://192.168.0.23:5000';

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
            brandId: brand.id,
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

          // STEP 7: Auto-create inventory items from listing's subSku
          let inventoryItems = [];
          try {
            const subSkus = listingData.subSku.split(',').map(s => s.trim()).filter(s => s);
            
            for (const subSku of subSkus) {
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
            }
            
            console.log(`✅ Created ${inventoryItems.length} inventory items for listing ${listing.id}`);
          } catch (error) {
            console.error('Failed to create inventory items:', error);
          }

          // Add inventory data to listing response
          const listingWithInventory = {
            ...listing,
            inventory: inventoryItems
          };

          // Add full URLs for response (prepend base URL)
          const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || 'http://192.168.0.23:5000';
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

          // Log management action
          await ManagementLogger.logListingAction(
            req.user.userId,
            'CREATE',
            listing.id,
            brand.id,
            { oldData: null, newData: listing, linkedProduct: product },
            req
          );

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

      // Log management action
      await ManagementLogger.logListingAction(
        req.user.userId,
        'UPDATE',
        listingId,
        existingListing.brandId,
        { oldData: existingListing, newData: updatedListing },
        req
      );

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

      // Log management action
      await ManagementLogger.logListingAction(
        req.user.userId,
        'DELETE',
        listingId,
        existingListing.brandId,
        { oldData: existingListing, newData: null },
        req
      );

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

      // Log management action
      await ManagementLogger.logListingAction(
        req.user.userId,
        'DELETE_ALL',
        null,
        null,
        { deletedCount: deletedCount.count },
        req
      );

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
}

export default ListingController;

