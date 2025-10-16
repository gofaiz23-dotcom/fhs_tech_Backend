import ListingModel from '../models/Listing.js';
import ManagementLogger from '../utils/managementLogger.js';
import { prisma } from '../config/database.js';

class ListingController {
  // Helper method to normalize field names (case-insensitive)
  static normalizeFieldName(obj, fieldName) {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Check for exact match first
    if (obj.hasOwnProperty(fieldName)) {
      return fieldName;
    }
    
    // Check for case-insensitive match
    for (const key in obj) {
      if (key.toLowerCase() === lowerFieldName) {
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

      const result = await ListingModel.findAll(req.user.userId, req.user.role, page, limit, filters);

      // Calculate duplicate statistics
      const duplicateGroups = {};
      
      result.listings.forEach(listing => {
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

      res.json({
        message: 'Listings retrieved successfully',
        userAccess: {
          userId: req.user.userId,
          role: req.user.role,
          email: req.user.email
        },
        timestamp: new Date().toISOString(),
        listings: result.listings,
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

      // Check if file was uploaded
      if (req.file) {
        console.log('📁 File Upload Detected:', {
          filename: req.file.originalname,
          storedFilename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        // Process file upload from memory buffer
        const FileProcessor = (await import('../utils/fileProcessor.js')).default;
        const fileData = await FileProcessor.processFileBuffer(req.file.buffer, req.file.originalname);
        
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
            groupSku: ListingController.getFieldValue(listing, 'groupSku')?.trim(),
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
        } else if (title && groupSku) {
          // Single listing
          listingsToCreate = [{
            productId: productId,
            productGroupSku: productGroupSku,
            brandId: ListingController.getFieldValue(req.body, 'brandId'),
            brandName: ListingController.getFieldValue(req.body, 'brandName'),
            title: title.trim(),
            groupSku: groupSku.trim(),
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
            mainImageUrl: ListingController.getFieldValue(req.body, 'mainImageUrl'),
            galleryImages: ListingController.getFieldValue(req.body, 'galleryImages'),
            productCounts: ListingController.getFieldValue(req.body, 'productCounts'),
            attributes: attributes || {}
          }];
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "listings" array, single listing data, or upload a file',
            required: {
              singleListing: ['title', 'groupSku (used to find product)', 'productId or productGroupSku (optional)'],
              multipleListings: ['listings array'],
              fileUpload: ['upload Excel/CSV file with groupSku column']
            },
            note: 'For Excel uploads: groupSku will be used to find the matching product in products table'
          });
        }
      }

      // Track listings to count duplicates (but still create them)
      const processedListings = new Map(); // Key: groupSku+subSku, Value: count
      
      // Process each listing
      for (const listingData of listingsToCreate) {
        try {
          // STEP 0: Track duplicates (but don't skip them - create all)
          const duplicateKey = `${listingData.sku || listingData.groupSku}|${listingData.subSku || ''}`;
          if (processedListings.has(duplicateKey)) {
            const count = processedListings.get(duplicateKey);
            processedListings.set(duplicateKey, count + 1);
            // Log duplicate but still create it
            results.duplicates.push({
              title: listingData.title,
              sku: listingData.sku || listingData.groupSku,
              subSku: listingData.subSku,
              note: `Duplicate: Same sku "${listingData.sku || listingData.groupSku}" and subSku "${listingData.subSku || ''}"`
            });
            // Don't skip - continue to create the listing
          } else {
            processedListings.set(duplicateKey, 1);
          }
          
          // STEP 1: Find product by subSku (if provided) or search all products
          let product = null;
          let shouldValidateSubSku = false;
          
          if (listingData.subSku && listingData.subSku.trim() !== '') {
            // SubSku provided - find product that contains this subSku (case-insensitive)
            shouldValidateSubSku = true;
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
                  break;
                }
              }
            }
            
            if (!product) {
              results.errors.push({
                title: listingData.title,
                sku: listingData.sku || listingData.groupSku,
                subSku: listingData.subSku,
                error: `Product not found with subSku: "${listingData.subSku}". Listing subSku must exist in product's subSku field!`
              });
              continue;
            }
            
            // Validate ALL listing subSkus exist in product
          const productSubSkus = product.subSku ? product.subSku.split(',').map(sku => sku.trim()).filter(sku => sku) : [];
          
          console.log('🔍 Validating SubSKUs (case-insensitive):', {
            listingSubSkus: listingSubSkus,
            productSubSkus: productSubSkus
          });
          
          // Check if ALL listing subSkus exist in product's subSku list (case-insensitive)
          const invalidSubSkus = listingSubSkus.filter(lsku => 
            !productSubSkus.some(psku => psku.toLowerCase() === lsku.toLowerCase())
          );
          
          if (invalidSubSkus.length > 0) {
            console.log('❌ SubSKU Validation Failed:', {
              listingSubSkus: listingSubSkus,
              productSubSkus: productSubSkus,
              invalidSubSkus: invalidSubSkus
            });
            
            results.errors.push({
              title: listingData.title,
              sku: listingData.sku || listingData.groupSku,
              subSku: listingData.subSku,
              error: `SubSKU validation failed: "${invalidSubSkus.join(', ')}" not found in product. Product has: ${product.subSku || 'none'}. All listing subSkus must exist in product's subSku field!`
            });
            continue;
          }
          
          console.log('✅ SubSKU Validation Passed: All subSkus exist in product (case-insensitive)');
          } else {
            // No subSku provided - we'll copy from product later
            // For now, just find any product to link to (can be first product)
            console.log('ℹ️ No subSku provided, will copy from product');
            
            // Try to find a product (can use productId if provided, or just get first product)
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
              // No product specified - need at least one product to copy subSku from
              results.errors.push({
                title: listingData.title,
                sku: listingData.sku || listingData.groupSku,
                error: `SubSku not provided and no product specified. Provide either subSku or productId.`
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

          // Process attributes
          let finalAttributes = { ...listingData.attributes };
          Object.keys(finalAttributes).forEach(key => {
            const value = finalAttributes[key];
            if (value === null || value === undefined || value === '' || 
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'object' && Object.keys(value).length === 0)) {
              delete finalAttributes[key];
            }
          });

          // STEP 6: Create listing with data from request (NOT from product)
          // Product is only used for validation, listing uses its own data
          const listing = await ListingModel.create({
            productId: product.id,  // Link to product (for validation only)
            brandId: brand.id,
            title: listingData.title,
            sku: listingData.sku || listingData.groupSku, // Support both sku and groupSku for backward compatibility
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
            mainImageUrl: listingData.mainImageUrl || null,
            galleryImages: listingData.galleryImages || null,
            productCounts: listingData.productCounts || null,  // JSONB mapping subSku to quantity
            attributes: finalAttributes
          });

          results.created.push(listing);

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

      if (req.file) {
        response.fileInfo = {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
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

