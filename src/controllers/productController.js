import ProductModel from '../models/Product.js';
import jobTracker from '../services/jobTracker.js';
import BackgroundProcessor from '../services/backgroundProcessor.js';
import { prisma } from '../config/database.js';
import { processImage, processImages } from '../utils/imageDownloader.js';
import TimeEstimator from '../utils/timeEstimator.js';

class ProductController {
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
    const actualKey = ProductController.normalizeFieldName(obj, fieldName);
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
      // Already a number
      numericValue = value;
    } else if (typeof value === 'string') {
      // String - trim and parse
      const valueStr = value.trim();
      if (valueStr === '') {
        return null;
      }
      numericValue = parseFloat(valueStr);
    } else if (typeof value === 'boolean') {
      // Boolean - convert to number
      numericValue = value ? 1 : 0;
    } else {
      // Try to convert to string first, then parse
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
    
    // Return as decimal with 2 decimal places for consistency
    return parseFloat(numericValue.toFixed(2));
  }

  // Get all products with pagination (filtered by user access for regular users)
  static async getAllProducts(req, res) {
    try {
      // Extract pagination parameters from query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      
      // Extract filters from query
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

      const result = await ProductModel.findAll(req.user.userId, req.user.role, page, limit, filters);

      console.log('📦 Products Found:', {
        totalProducts: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPages,
        userRole: req.user.role,
        userId: req.user.userId
      });


      // Get base URL from environment
      const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;
      
      // Filter base64 images and prepend base URL to local paths
      const cleanProducts = [];
      for (const product of result.products) {
        const cleanedProduct = { ...product };
        
        // Process mainImageUrl
        if (cleanedProduct.mainImageUrl) {
          if (cleanedProduct.mainImageUrl.startsWith('data:image/')) {
            // Remove base64
            cleanedProduct.mainImageUrl = null;
          } else if (cleanedProduct.mainImageUrl.startsWith('/uploads/')) {
            // Update old path and prepend base URL
            let imagePath = cleanedProduct.mainImageUrl.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
            cleanedProduct.mainImageUrl = `${IMAGE_BASE_URL}${imagePath}`;
          }
          // External URLs remain unchanged
        }
        
        // Process galleryImages
        if (Array.isArray(cleanedProduct.galleryImages)) {
          cleanedProduct.galleryImages = cleanedProduct.galleryImages
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
          
          if (cleanedProduct.galleryImages.length === 0) {
            cleanedProduct.galleryImages = null;
          }
        }
        
        // Process subSKU data for products with multiple subSKUs
        if (cleanedProduct.subSku && cleanedProduct.subSku.includes(',')) {
          const subSkus = cleanedProduct.subSku.split(',').map(s => s.trim()).filter(s => s);
          if (subSkus.length > 1) {
            // Check if subSkuData already exists and has correct mapping
            if (cleanedProduct.attributes && cleanedProduct.attributes.subSkuData) {
              // Check if name field is using subCategory (correct mapping)
              const firstSubSku = Object.keys(cleanedProduct.attributes.subSkuData)[0];
              const hasCorrectMapping = firstSubSku && 
                cleanedProduct.attributes.subSkuData[firstSubSku].name === cleanedProduct.attributes.subCategory;
              
              if (hasCorrectMapping) {
                // Process existing stored subSkuData - add base URL on retrieval
                Object.keys(cleanedProduct.attributes.subSkuData).forEach(subSku => {
                  const subSkuData = cleanedProduct.attributes.subSkuData[subSku];
                  
                  // Add base URL to main image (if it's a relative URL)
                  if (subSkuData.mainImageUrl && subSkuData.mainImageUrl.startsWith('/uploads/')) {
                    subSkuData.mainImageUrl = `${IMAGE_BASE_URL}${subSkuData.mainImageUrl}`;
                  }
                  
                  // Add base URL to gallery images (if they're relative URLs)
                  if (Array.isArray(subSkuData.galleryImages)) {
                    subSkuData.galleryImages = subSkuData.galleryImages
                      .filter(img => img && !img.startsWith('data:image/'))
                      .map(img => {
                        if (img.startsWith('/uploads/')) {
                          return `${IMAGE_BASE_URL}${img}`;
                        }
                        return img;
                      });
                  }
                });
              } else {
                // Regenerate subSkuData with correct mapping
                cleanedProduct.attributes.subSkuData = {};
                
                // Get individual subSKU prices from related products - only include existing subSKUs
                for (const subSku of subSkus) {
                  const relatedProduct = await prisma.product.findFirst({
                    where: { subSku: subSku }
                  });
                  
                  // Only add to subSkuData if the individual product exists and is a single subSKU product
                  if (relatedProduct && relatedProduct.subSku && !relatedProduct.subSku.includes(',')) {
                    // Process main image URL with base URL
                    let processedMainImageUrl = relatedProduct.mainImageUrl;
                    if (processedMainImageUrl && processedMainImageUrl.startsWith('/uploads/')) {
                      let imagePath = processedMainImageUrl.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                      processedMainImageUrl = `${IMAGE_BASE_URL}${imagePath}`;
                    }
                    
                    // Process gallery images with base URL
                    let processedGalleryImages = [];
                    if (relatedProduct.galleryImages && Array.isArray(relatedProduct.galleryImages)) {
                      processedGalleryImages = relatedProduct.galleryImages
                        .filter(img => img && !img.startsWith('data:image/'))
                        .map(img => {
                          if (img.startsWith('/uploads/')) {
                            let imagePath = img.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                            return `${IMAGE_BASE_URL}${imagePath}`;
                          }
                          return img;
                        });
                    }
                    
                    // Map complete single product data
                    cleanedProduct.attributes.subSkuData[subSku] = {
                      id: relatedProduct.id,
                      title: relatedProduct.title,
                      groupSku: relatedProduct.groupSku,
                      subSku: relatedProduct.subSku,
                      category: relatedProduct.category,
                      collectionName: relatedProduct.collectionName,
                      singleSetItem: relatedProduct.singleSetItem,
                      brandId: relatedProduct.brandId,
                      brandRealPrice: parseFloat(relatedProduct.brandRealPrice),
                      brandMiscellaneous: parseFloat(relatedProduct.brandMiscellaneous),
                      brandPrice: parseFloat(relatedProduct.brandPrice),
                      msrp: parseFloat(relatedProduct.msrp),
                      shippingPrice: parseFloat(relatedProduct.shippingPrice),
                      commissionPrice: parseFloat(relatedProduct.commissionPrice),
                      profitMarginPrice: parseFloat(relatedProduct.profitMarginPrice),
                      ecommerceMiscellaneous: parseFloat(relatedProduct.ecommerceMiscellaneous),
                      ecommercePrice: parseFloat(relatedProduct.ecommercePrice),
                      mainImageUrl: processedMainImageUrl,
                      galleryImages: processedGalleryImages,
                      attributes: relatedProduct.attributes,
                      createdAt: relatedProduct.createdAt,
                      updatedAt: relatedProduct.updatedAt
                    };
                  }
                }
                
                
              }
            } else {
              // Generate subSkuData for existing products with multiple subSKUs
              cleanedProduct.attributes = cleanedProduct.attributes || {};
              cleanedProduct.attributes.subSkuData = {};
              
              // Get individual subSKU prices from related products - only include existing subSKUs
              for (const subSku of subSkus) {
                const relatedProduct = await prisma.product.findFirst({
                  where: { subSku: subSku }
                });
                
                // Only add to subSkuData if the individual product exists and is a single subSKU product
                if (relatedProduct && relatedProduct.subSku && !relatedProduct.subSku.includes(',')) {
                  // Process main image URL with base URL
                  let processedMainImageUrl = relatedProduct.mainImageUrl;
                  if (processedMainImageUrl && processedMainImageUrl.startsWith('/uploads/')) {
                    let imagePath = processedMainImageUrl.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                    processedMainImageUrl = `${IMAGE_BASE_URL}${imagePath}`;
                  }
                  
                  // Process gallery images with base URL
                  let processedGalleryImages = [];
                  if (relatedProduct.galleryImages && Array.isArray(relatedProduct.galleryImages)) {
                    processedGalleryImages = relatedProduct.galleryImages
                      .filter(img => img && !img.startsWith('data:image/'))
                      .map(img => {
                        if (img.startsWith('/uploads/')) {
                          let imagePath = img.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                          return `${IMAGE_BASE_URL}${imagePath}`;
                        }
                        return img;
                      });
                  }
                  
                  // Map complete single product data
                  cleanedProduct.attributes.subSkuData[subSku] = {
                    id: relatedProduct.id,
                    title: relatedProduct.title,
                    groupSku: relatedProduct.groupSku,
                    subSku: relatedProduct.subSku,
                    category: relatedProduct.category,
                    collectionName: relatedProduct.collectionName,
                    singleSetItem: relatedProduct.singleSetItem,
                    brandId: relatedProduct.brandId,
                    brandRealPrice: parseFloat(relatedProduct.brandRealPrice),
                    brandMiscellaneous: parseFloat(relatedProduct.brandMiscellaneous),
                    brandPrice: parseFloat(relatedProduct.brandPrice),
                    msrp: parseFloat(relatedProduct.msrp),
                    shippingPrice: parseFloat(relatedProduct.shippingPrice),
                    commissionPrice: parseFloat(relatedProduct.commissionPrice),
                    profitMarginPrice: parseFloat(relatedProduct.profitMarginPrice),
                    ecommerceMiscellaneous: parseFloat(relatedProduct.ecommerceMiscellaneous),
                    ecommercePrice: parseFloat(relatedProduct.ecommercePrice),
                    mainImageUrl: processedMainImageUrl,
                    galleryImages: processedGalleryImages,
                    attributes: relatedProduct.attributes,
                    createdAt: relatedProduct.createdAt,
                    updatedAt: relatedProduct.updatedAt
                  };
                }
              }
              
              
            }
          }
        }
        
        cleanProducts.push(cleanedProduct);
      }

      res.json({
        message: 'Products retrieved successfully',
        userAccess: {
          userId: req.user.userId,
          role: req.user.role,
          email: req.user.email
        },
        timestamp: new Date().toISOString(),
        products: cleanProducts,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get all products error:', error);
      res.status(500).json({
        error: 'Failed to retrieve products',
        details: error.message
      });
    }
  }


  // Create new product(s) - Users can create for accessible brands, Admin can create for any brand
  static async createProduct(req, res) {
    try {
      let productsToCreate = [];
      let results = {
        created: [],
        errors: [],
        duplicates: []
      };

      // Process uploaded image files first
      let uploadedMainImage = null;
      let uploadedGalleryImages = [];
      
      console.log('📁 Checking for uploaded files:', {
        hasFiles: !!req.files,
        fileKeys: req.files ? Object.keys(req.files) : []
      });
      
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
          console.log('🖼️ Gallery images uploaded:', uploadedGalleryImages.length, uploadedGalleryImages);
        }
      }
      
      console.log('✅ Captured uploaded images:', {
        mainImageUrl: uploadedMainImage,
        galleryCount: uploadedGalleryImages.length
      });

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
        
        console.log('🔍 File Processing Debug:', {
          filename: file.originalname,
          path: file.path
        });
        
        // Read file buffer from disk
        const fileBuffer = fs.readFileSync(file.path);
        const fileData = await FileProcessor.processFileBuffer(fileBuffer, file.originalname);
        
        console.log('📊 File Data Processed:', {
          totalRows: fileData.length,
          sampleRow: fileData[0] || null
        });
        
        if (fileData.length === 0) {
          return res.status(400).json({
            error: 'File is empty or contains no valid data'
          });
        }

        // Validate file data
        const { validData, errors } = FileProcessor.validateProductData(fileData);
        
        console.log('✅ File Validation Results:', {
          validRows: validData.length,
          errorCount: errors.length,
          errors: errors.slice(0, 5) // Show first 5 errors
        });
        
        if (errors.length > 0) {
          return res.status(400).json({
            error: 'File validation failed',
            details: errors
          });
        }

        productsToCreate = validData;
      } else {
        // Handle JSON data (single or multiple products)
        const { products, brandId, brandName, title, groupSku, subSku, category, collectionName, singleSetItem, attributes } = req.body;

        if (products && Array.isArray(products)) {
          // Multiple products with case-insensitive field extraction
          productsToCreate = products.map(product => ({
            brandId: ProductController.getFieldValue(product, 'brandId'),
            brandName: ProductController.getFieldValue(product, 'brandName'),
            title: ProductController.getFieldValue(product, 'title')?.trim(),
            groupSku: ProductController.getFieldValue(product, 'groupSku')?.trim(),
            subSku: ProductController.getFieldValue(product, 'subSku')?.trim(),
            category: ProductController.getFieldValue(product, 'category')?.trim(),
            collectionName: ProductController.getFieldValue(product, 'collectionName')?.trim(),
            singleSetItem: ProductController.getFieldValue(product, 'singleSetItem')?.trim(),
            brandRealPrice: ProductController.getFieldValue(product, 'brandRealPrice'),
            brandMiscellaneous: ProductController.getFieldValue(product, 'brandMiscellaneous'),
            msrp: ProductController.getFieldValue(product, 'msrp'),
            shippingPrice: ProductController.getFieldValue(product, 'shippingPrice'),
            commissionPrice: ProductController.getFieldValue(product, 'commissionPrice'),
            profitMarginPrice: ProductController.getFieldValue(product, 'profitMarginPrice'),
            ecommerceMiscellaneous: ProductController.getFieldValue(product, 'ecommerceMiscellaneous'),
            ecommercePrice: ProductController.getFieldValue(product, 'ecommercePrice'),
            mainImageUrl: ProductController.getFieldValue(product, 'mainImageUrl'),
            galleryImages: ProductController.getFieldValue(product, 'galleryImages'),
            attributes: ProductController.getFieldValue(product, 'attributes') || {}
          }));
        } else if (title && groupSku) {
          // Single product - extract all fields from req.body with case-insensitive lookup
          console.log('🔍 Single Product Request Body:', req.body);
          
          // Use case-insensitive field extraction
          const brandId = ProductController.getFieldValue(req.body, 'brandId');
          const brandName = ProductController.getFieldValue(req.body, 'brandName');
          const brandRealPrice = ProductController.getFieldValue(req.body, 'brandRealPrice');
          const brandMiscellaneous = ProductController.getFieldValue(req.body, 'brandMiscellaneous');
          const msrp = ProductController.getFieldValue(req.body, 'msrp');
          const shippingPrice = ProductController.getFieldValue(req.body, 'shippingPrice');
          const commissionPrice = ProductController.getFieldValue(req.body, 'commissionPrice');
          const profitMarginPrice = ProductController.getFieldValue(req.body, 'profitMarginPrice');
          const ecommerceMiscellaneous = ProductController.getFieldValue(req.body, 'ecommerceMiscellaneous');
          const ecommercePrice = ProductController.getFieldValue(req.body, 'ecommercePrice');
          const mainImageUrl = ProductController.getFieldValue(req.body, 'mainImageUrl');
          const galleryImages = ProductController.getFieldValue(req.body, 'galleryImages');
          const attributes = ProductController.getFieldValue(req.body, 'attributes');
          
          console.log('🔍 Extracted MSRP (case-insensitive):', msrp, 'Type:', typeof msrp);
          console.log('🔍 Available fields in request:', Object.keys(req.body));
          console.log('🔍 MSRP field found:', ProductController.normalizeFieldName(req.body, 'msrp'));
          console.log('🔍 Raw MSRP value from request:', req.body.msrp, req.body.MSRP, req.body.Msrp);
          
          productsToCreate = [{
            brandId: brandId,
            brandName: brandName,
            title: title.trim(),
            groupSku: groupSku.trim(),
            subSku: subSku?.trim() || '',
            category: category?.trim() || '',
            collectionName: collectionName?.trim() || '',
            singleSetItem: singleSetItem?.trim() || '',
            brandRealPrice: brandRealPrice,
            brandMiscellaneous: brandMiscellaneous,
            msrp: msrp,
            shippingPrice: shippingPrice,
            commissionPrice: commissionPrice,
            profitMarginPrice: profitMarginPrice,
            ecommerceMiscellaneous: ecommerceMiscellaneous,
            ecommercePrice: ecommercePrice,
            // Use uploaded files if available, otherwise use URLs from body
            mainImageUrl: uploadedMainImage || mainImageUrl,
            galleryImages: uploadedGalleryImages.length > 0 ? uploadedGalleryImages : galleryImages,
            attributes: attributes || {}
          }];
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "products" array, single product data (with title and groupSku), or upload a file',
            required: {
              singleProduct: ['title', 'groupSku'],
              multipleProducts: ['products array'],
              fileUpload: ['upload Excel/CSV file']
            }
          });
        }
      }

      // Process each product
      for (const productData of productsToCreate) {
        try {
          // Check if brand exists
          const brand = await ProductModel.checkBrandExists(productData.brandId || productData.brandName);
          
          console.log('🔍 Brand Lookup:', {
            brandId: productData.brandId,
            brandName: productData.brandName,
            brandFound: brand ? brand.name : 'Not Found'
          });
          
          if (!brand) {
            results.errors.push({
              title: productData.title,
              error: `Brand not found: ${productData.brandId || productData.brandName}`
            });
            continue;
          }

          // Check user access to brand (for non-admin users)
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
                title: productData.title,
                error: `Access denied to brand: ${brand.name}`
              });
              continue;
            }
          }

          // Check for duplicate Group SKU (MANDATORY UNIQUE)
          const existingGroupSku = await ProductModel.checkGroupSkuExists(productData.groupSku);
          if (existingGroupSku) {
            results.duplicates.push({
              title: productData.title,
              groupSku: productData.groupSku,
              error: `Group SKU "${productData.groupSku}" already exists - Group SKU must be unique!`
            });
            continue;
          }

          // Note: SubSku duplicate check removed - subSku can be same as groupSku or appear in multiple products
          // If subSku is empty, use groupSku as default
          if (!productData.subSku || productData.subSku.trim() === '') {
            productData.subSku = productData.groupSku;
          }

          // Validate and convert price values
          let brandRealPrice, brandMiscellaneous, msrp = null;
          
          console.log('🔍 Price Validation Debug:', {
            title: productData.title,
            brandRealPrice: productData.brandRealPrice,
            brandRealPriceType: typeof productData.brandRealPrice,
            brandMiscellaneous: productData.brandMiscellaneous,
            brandMiscellaneousType: typeof productData.brandMiscellaneous,
            msrp: productData.msrp,
            msrpType: typeof productData.msrp,
            allFields: Object.keys(productData),
            msrpFieldFound: ProductController.normalizeFieldName(productData, 'msrp') !== null,
            msrpFieldName: ProductController.normalizeFieldName(productData, 'msrp'),
            msrpValueFromGetField: ProductController.getFieldValue(productData, 'msrp')
          });
          
          try {
            brandRealPrice = ProductController.validatePrice(productData.brandRealPrice, 'Brand Real Price');
            console.log('✅ Brand Real Price validation result:', brandRealPrice);
            
            if (brandRealPrice === null) {
              results.errors.push({
                title: productData.title,
                error: 'Brand Real Price is mandatory'
              });
              continue;
            }
            
            brandMiscellaneous = ProductController.validatePrice(productData.brandMiscellaneous, 'Brand Miscellaneous') || 0;
            console.log('✅ Brand Miscellaneous validation result:', brandMiscellaneous);
            
            // Validate MSRP (case-insensitive)
            const msrpValue = ProductController.getFieldValue(productData, 'msrp');
            if (msrpValue === undefined || msrpValue === null || msrpValue === '') {
              results.errors.push({
                title: productData.title,
                error: 'MSRP is mandatory (field not found or empty)'
              });
              continue;
            }
            
            msrp = ProductController.validatePrice(msrpValue, 'MSRP');
            console.log('✅ MSRP validation result:', msrp);
            console.log('🚀 Proceeding to product creation...');
          } catch (error) {
            console.error('❌ Price validation error:', error.message);
            results.errors.push({
              title: productData.title,
              error: error.message
            });
            continue;
          }

          // Process attributes (clean up empty values)
          console.log('🔧 Processing attributes...');
          let finalAttributes = { ...productData.attributes };
          
          // Process subSKU data if multiple subSKUs exist
          if (productData.subSku && productData.subSku.includes(',')) {
            const subSkus = productData.subSku.split(',').map(s => s.trim()).filter(s => s);
            if (subSkus.length > 1) {
              // Validate ALL subSKUs exist as individual products
              const missingSubSkus = [];
              const existingSubSkus = [];
              
              for (const subSku of subSkus) {
                // Find products with exact subSku match (no comma-separated values)
                const relatedProduct = await prisma.product.findFirst({
                  where: { 
                    subSku: subSku
                  }
                });
                
                // Additional check: ensure it's a single subSKU product (not comma-separated)
                if (relatedProduct && relatedProduct.subSku && !relatedProduct.subSku.includes(',')) {
                  existingSubSkus.push(subSku);
                } else {
                  missingSubSkus.push(subSku);
                }
              }
              
              // If any subSKUs are missing, reject the product creation
              if (missingSubSkus.length > 0) {
                return res.status(400).json({
                  error: 'Product creation failed',
                  message: `Cannot create product with multiple subSKUs. Missing individual products for: ${missingSubSkus.join(', ')}`,
                  details: {
                    missingSubSkus: missingSubSkus,
                    existingSubSkus: existingSubSkus,
                    suggestion: 'Please create individual products for all subSKUs first, then create the multi-subSKU product.'
                  }
                });
              }
              
              // All subSKUs exist - proceed with subSkuData creation
              finalAttributes.subSkuData = {};
              
              for (const subSku of subSkus) {
                // Find products with exact subSku match (no comma-separated values)
                const relatedProduct = await prisma.product.findFirst({
                  where: { 
                    subSku: subSku
                  }
                });
                
                // Skip if product doesn't exist or is not a single subSKU product
                if (!relatedProduct || !relatedProduct.subSku || relatedProduct.subSku.includes(',')) {
                  console.warn(`⚠️ Skipping subSku ${subSku} - not found or is multi-subSKU product`);
                  continue;
                }
                
                // Store relative URLs (no base URL) in database
                let relativeMainImageUrl = relatedProduct.mainImageUrl;
                if (relativeMainImageUrl && relativeMainImageUrl.startsWith('/uploads/')) {
                  // Convert to relative URL for storage
                  relativeMainImageUrl = relativeMainImageUrl.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                }
                
                // Store relative gallery images (no base URL) in database
                let relativeGalleryImages = [];
                if (relatedProduct.galleryImages && Array.isArray(relatedProduct.galleryImages)) {
                  relativeGalleryImages = relatedProduct.galleryImages
                    .filter(img => img && !img.startsWith('data:image/'))
                    .map(img => {
                      if (img.startsWith('/uploads/')) {
                        // Convert to relative URL for storage
                        return img.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                      }
                      return img;
                    });
                }
                
                // Map complete single product data
                finalAttributes.subSkuData[subSku] = {
                  id: relatedProduct.id,
                  title: relatedProduct.title,
                  groupSku: relatedProduct.groupSku,
                  subSku: relatedProduct.subSku,
                  category: relatedProduct.category,
                  collectionName: relatedProduct.collectionName,
                  singleSetItem: relatedProduct.singleSetItem,
                  brandId: relatedProduct.brandId,
                  brandRealPrice: parseFloat(relatedProduct.brandRealPrice),
                  brandMiscellaneous: parseFloat(relatedProduct.brandMiscellaneous),
                  brandPrice: parseFloat(relatedProduct.brandPrice),
                  msrp: parseFloat(relatedProduct.msrp),
                  shippingPrice: parseFloat(relatedProduct.shippingPrice),
                  commissionPrice: parseFloat(relatedProduct.commissionPrice),
                  profitMarginPrice: parseFloat(relatedProduct.profitMarginPrice),
                  ecommerceMiscellaneous: parseFloat(relatedProduct.ecommerceMiscellaneous),
                  ecommercePrice: parseFloat(relatedProduct.ecommercePrice),
                  mainImageUrl: relativeMainImageUrl,
                  galleryImages: relativeGalleryImages,
                  attributes: relatedProduct.attributes,
                  createdAt: relatedProduct.createdAt,
                  updatedAt: relatedProduct.updatedAt
                };
              }
              
              console.log('✅ Multiple subSKUs detected in product, all validated and stored in attributes:', finalAttributes.subSkuData);
            }
          }
          
          // Filter out empty/null values from attributes (but keep subSkuData)
          Object.keys(finalAttributes).forEach(key => {
            const value = finalAttributes[key];
            // Don't delete subSkuData even if it appears empty
            if (key === 'subSkuData') {
              return; // Keep subSkuData
            }
            if (value === null || value === undefined || value === '' || 
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'object' && Object.keys(value).length === 0)) {
              delete finalAttributes[key];
            }
          });
          console.log('✅ Attributes processed:', finalAttributes);

          // Note: Images are processed separately after product creation
          // This allows products to be created first, then images uploaded later

          // Check if msrp was successfully validated
          if (msrp === null) {
            results.errors.push({
              title: productData.title,
              error: 'MSRP validation failed'
            });
            continue;
          }

          // Create product
          console.log('📝 Creating product with data:', {
            brandId: brand.id,
            title: productData.title,
            groupSku: productData.groupSku,
            msrp: msrp
          });
          
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
            if (productData.mainImageUrl) {
              finalMainImage = await processImage(productData.mainImageUrl);
            }
            
            if (productData.galleryImages && Array.isArray(productData.galleryImages)) {
              const downloadedGallery = await processImages(productData.galleryImages);
              if (downloadedGallery.length > 0) {
                finalGalleryImages = downloadedGallery;
              }
            }
          }

          const product = await ProductModel.create({
            brandId: brand.id,
            title: productData.title,
            groupSku: productData.groupSku,
            subSku: productData.subSku,
            category: productData.category,
            collectionName: productData.collectionName,
            singleSetItem: productData.singleSetItem,
            // Brand Pricing (using validated and converted values)
            brandRealPrice: brandRealPrice,
            brandMiscellaneous: brandMiscellaneous,
            brandPrice: brandRealPrice, // Calculate brandPrice as brandRealPrice + brandMiscellaneous
            msrp: msrp,
            // Ecommerce Pricing (from request or default to 0)
            shippingPrice: productData.shippingPrice || 0,
            commissionPrice: productData.commissionPrice || 0,
            profitMarginPrice: productData.profitMarginPrice || 0,
            ecommerceMiscellaneous: productData.ecommerceMiscellaneous || 0,
            ecommercePrice: productData.ecommercePrice || 0,
            // Image columns (optional during creation)
            mainImageUrl: finalMainImage,
            galleryImages: finalGalleryImages,
            attributes: finalAttributes
          });


          // Add full URLs for response (prepend base URL)
          const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;
          const productWithFullUrls = {
            ...product,
            mainImageUrl: product.mainImageUrl && product.mainImageUrl.startsWith('/uploads/') 
              ? `${IMAGE_BASE_URL}${product.mainImageUrl}` 
              : product.mainImageUrl,
            galleryImages: Array.isArray(product.galleryImages)
              ? product.galleryImages.map(img => 
                  img && img.startsWith('/uploads/') ? `${IMAGE_BASE_URL}${img}` : img
                )
              : product.galleryImages
          };

          results.created.push(productWithFullUrls);


        } catch (error) {
          // Convert technical errors to user-friendly messages
          let userFriendlyError = error.message;
          
          if (error.message.includes('Unique constraint failed') && error.message.includes('group_sku')) {
            userFriendlyError = `Product with group SKU "${productData.groupSku}" already exists`;
          } else if (error.message.includes('Unique constraint failed')) {
            userFriendlyError = 'Duplicate entry - product already exists';
          } else if (error.message.includes('foreign key constraint')) {
            userFriendlyError = 'Related data not found';
          } else if (error.message.includes('required field')) {
            userFriendlyError = 'Missing required information';
          } else if (error.message.includes('Invalid')) {
            userFriendlyError = 'Invalid data provided';
          }
          
          results.errors.push({
            title: productData.title,
            error: userFriendlyError
          });
        }
      }

      // Prepare response
      const response = {
        message: `Processed ${productsToCreate.length} product(s)`,
        summary: {
          total: productsToCreate.length,
          created: results.created.length,
          duplicates: results.duplicates.length,
          errors: results.errors.length
        },
        timestamp: new Date().toISOString(),
        results: results
      };

      // Add file information if file was uploaded
      if (req.file) {
        response.fileInfo = {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        };
      }

      // Determine status code
      if (results.created.length === 0) {
        return res.status(400).json({
          ...response,
          message: 'No products were created'
        });
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        error: 'Failed to create product(s)',
        details: error.message
      });
    }
  }

  // Update product - Users can update products from accessible brands, Admin can update any product
  static async updateProduct(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const { 
        title, groupSku, subSku, category, collectionName, singleSetItem, 
        attributes, mainImageUrl, galleryImages, brandId, brandName,
        // All price fields except brandPrice and ecommercePrice (calculated)
        brandRealPrice, brandMiscellaneous, msrp,
        shippingPrice, commissionPrice, profitMarginPrice, ecommerceMiscellaneous
      } = req.body;

      // Handle file uploads for images
      let finalMainImageUrl = mainImageUrl;
      let finalGalleryImages = galleryImages;
      
      if (req.files) {
        // Handle mainImageUrl file upload
        if (req.files.mainImageUrl && req.files.mainImageUrl.length > 0) {
          const mainImg = req.files.mainImageUrl[0];
          finalMainImageUrl = `/uploads/images/${mainImg.filename}`;
          console.log('📸 Main image uploaded:', finalMainImageUrl);
        }
        
        // Handle galleryImages file upload
        if (req.files.galleryImages && req.files.galleryImages.length > 0) {
          finalGalleryImages = req.files.galleryImages.map(img => `/uploads/images/${img.filename}`);
          console.log('🖼️ Gallery images uploaded:', finalGalleryImages.length, finalGalleryImages);
        }
      } 
      // If no files uploaded, check for URLs and download them
      else {
        if (mainImageUrl) {
          finalMainImageUrl = await processImage(mainImageUrl);
          console.log('🔗 Main image URL processed:', finalMainImageUrl);
        }
        
        if (galleryImages && Array.isArray(galleryImages)) {
          const downloadedGallery = await processImages(galleryImages);
          if (downloadedGallery.length > 0) {
            finalGalleryImages = downloadedGallery;
            console.log('🔗 Gallery images URLs processed:', finalGalleryImages.length, finalGalleryImages);
          }
        }
      }

      // Check if product exists
      const existingProduct = await ProductModel.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      // Handle brandId/brandName - find brand by ID or name
      let finalBrandId = existingProduct.brandId; // Default to existing brand
      
      if (brandId || brandName) {
        const brand = await ProductModel.checkBrandExists(brandId || brandName);
        if (brand) {
          finalBrandId = brand.id;
          console.log('✅ Brand found:', { id: brand.id, name: brand.name });
        } else {
          return res.status(400).json({
            error: 'Brand not found',
            message: `Brand with identifier "${brandId || brandName}" does not exist`
          });
        }
      }
      
      // Only include brandId in update if it's different from existing
      const updateData = {
        title,
        groupSku,
        subSku,
        category,
        collectionName,
        singleSetItem,
        attributes,
        mainImageUrl: finalMainImageUrl,
        galleryImages: finalGalleryImages,
        // All price fields except brandPrice and ecommercePrice (calculated)
        brandRealPrice: parseFloat(brandRealPrice) || 0,
        brandMiscellaneous: parseFloat(brandMiscellaneous) || 0,
        msrp: parseFloat(msrp) || 0,
        shippingPrice: parseFloat(shippingPrice) || 0,
        commissionPrice: parseFloat(commissionPrice) || 0,
        profitMarginPrice: parseFloat(profitMarginPrice) || 0,
        ecommerceMiscellaneous: parseFloat(ecommerceMiscellaneous) || 0
      };
      
      // Only update brandId if it's provided and different
      if (brandId || brandName) {
        updateData.brandId = finalBrandId;
      }

      // Check user access to product's brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: existingProduct.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to products from brand: ${existingProduct.brand.name}`
          });
        }
      }

      const updatedProduct = await ProductModel.update(productId, updateData);

      // Auto-update related multi-subSKU products and listings if this is a single subSKU product
      if (updatedProduct.subSku && !updatedProduct.subSku.includes(',')) {
        await ProductController.autoUpdateSubSkuData(updatedProduct);
      }

      res.json({
        message: 'Product updated successfully',
        productId: productId,
        timestamp: new Date().toISOString(),
        product: updatedProduct
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        error: 'Failed to update product',
        details: error.message
      });
    }
  }

  // Delete product - Users can delete products from accessible brands, Admin can delete any product
  static async deleteProduct(req, res) {
    try {
      const productId = parseInt(req.params.id);

      // Check if product exists
      const existingProduct = await ProductModel.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      // Check user access to product's brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: existingProduct.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to products from brand: ${existingProduct.brand.name}`
          });
        }
      }

      await ProductModel.delete(productId);

      res.json({
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        error: 'Failed to delete product',
        details: error.message
      });
    }
  }

  // Delete all products (Admin only) - Keep this admin only for safety
  static async deleteAllProducts(req, res) {
    try {
      // Only admin can delete all products
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Only administrators can delete all products'
        });
      }

      const deletedCount = await ProductModel.deleteAll();

      res.json({
        message: 'All products deleted successfully',
        deletedCount: deletedCount.count
      });
    } catch (error) {
      console.error('Delete all products error:', error);
      res.status(500).json({
        error: 'Failed to delete all products',
        details: error.message
      });
    }
  }

  // Bulk upload product images - Excel/JSON with image URLs - Unlimited with background processing
  static async bulkUploadProductImages(req, res) {
    try {
      console.log('📸 Bulk Image Upload Started');
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
        // Expected columns: groupSku, subSku (optional), mainImageUrl, galleryImages (comma-separated URLs)
        imageData = fileData.map(row => {
          const galleryImagesStr = ProductController.getFieldValue(row, 'galleryImages');
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
            groupSku: ProductController.getFieldValue(row, 'groupSku'),
            subSku: ProductController.getFieldValue(row, 'subSku'), // Optional subSku column
            mainImageUrl: ProductController.getFieldValue(row, 'mainImageUrl'),
            galleryImages: galleryImagesArray
          };
        }).filter(item => item.groupSku); // Only include rows with groupSku
        
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
            excelUpload: 'Upload Excel with columns: groupSku, subSku (optional), mainImageUrl, galleryImages',
            jsonUpload: '{ "imageData": [{ "groupSku": "SKU-001", "mainImageUrl": "url", "galleryImages": ["url1", "url2"] }] }'
          }
        });
      }
      
      // Validate imageData
      if (imageData.length === 0) {
        return res.status(400).json({
          error: 'No valid image data provided',
          message: 'Excel must contain groupSku column with image URLs'
        });
      }

      // Industry standard: Always use background processing for ALL operations
      console.log(`🚀 Processing ${imageData.length} image(s) in background...`);
      
      const jobId = await BackgroundProcessor.processBulk(
        req.user.userId,
        'PRODUCT_IMAGE',
        imageData,
        async (item) => {
          const product = await ProductModel.findByGroupSku(item.groupSku);
          if (!product) {
            throw new Error(`Product not found: ${item.groupSku}`);
          }

          // Process images (override, not append)
          const mainImage = item.mainImageUrl ? await processImage(item.mainImageUrl) : product.mainImageUrl;
          let galleryImages = product.galleryImages;
          
          if (item.galleryImages && Array.isArray(item.galleryImages)) {
            const downloadedGallery = await processImages(item.galleryImages);
            // Override existing gallery images (keep duplicates for subSku correspondence)
            galleryImages = downloadedGallery;
          }

          // Update product
          const updatedProduct = await ProductModel.update(product.id, {
            mainImageUrl: mainImage,
            galleryImages: galleryImages
          });


          return updatedProduct;
        },
        50 // Batch size
      );

      res.status(202).json({
        message: `Large image dataset detected (${imageData.length} products). Processing in background.`,
        jobId: jobId,
        status: 'PROCESSING',
        totalProducts: imageData.length,
        estimatedTime: `${Math.ceil(imageData.length / 50)} minutes`,
        checkStatus: `/api/products/status?jobId=${jobId}`,
        note: 'Use GET /api/products/status to check progress',
        timestamp: new Date().toISOString(),
        fileInfo: req.file ? {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          path: req.file.path,
          size: req.file.size
        } : null
      });

    } catch (error) {
      console.error('❌ Bulk image upload error:', error);
      res.status(500).json({
        error: 'Failed to upload product images',
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
          // Find product by groupSku
          const product = await prisma.product.findFirst({
            where: { groupSku: item.groupSku }
          });

          if (!product) {
            results.notFound.push({
              groupSku: item.groupSku,
              error: 'Product not found'
            });
            continue;
          }

          // Check user access (for non-admin users)
          if (req.user.role !== 'ADMIN') {
            const hasAccess = await prisma.userBrandAccess.findFirst({
              where: {
                userId: req.user.userId,
                brandId: product.brandId,
                isActive: true
              }
            });

            if (!hasAccess) {
              results.errors.push({
                groupSku: item.groupSku,
                error: 'Access denied to this product brand'
              });
              continue;
            }
          }

          // Process images (download URLs if provided)
          let finalMainImage = product.mainImageUrl; // Keep existing if not provided
          let finalGalleryImages = product.galleryImages || [];

          if (item.mainImageUrl) {
            finalMainImage = await processImage(item.mainImageUrl);
          }

          if (item.galleryImages && Array.isArray(item.galleryImages) && item.galleryImages.length > 0) {
            const downloadedGallery = await processImages(item.galleryImages);
            // Override (replace) existing gallery images (keep duplicates for subSku correspondence)
            finalGalleryImages = downloadedGallery;
          }

          // Update product with new images
          const updatedProduct = await prisma.product.update({
            where: { id: product.id },
            data: {
              mainImageUrl: finalMainImage,
              galleryImages: finalGalleryImages
            }
          });


          results.updated.push({
            groupSku: item.groupSku,
            productId: product.id,
            mainImageUrl: finalMainImage,
            galleryImagesCount: finalGalleryImages.length
          });

        } catch (error) {
          results.errors.push({
            groupSku: item.groupSku,
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
        message: `Processed ${imageData.length} product(s) for image upload`,
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
      console.error('Process image data sync error:', error);
      res.status(500).json({
        error: 'Failed to process image data',
        details: error.message
      });
    }
  }

  // OLD METHOD - Keep for backward compatibility if needed
  static async uploadProductImages(req, res) {
    try {
      console.log('🔍 Image Upload Request body:', req.body);
      console.log('🔍 Content-Type:', req.get('Content-Type'));
      
      let groupSku, subSku, imageUrls, productId;
      
      // Handle both JSON and Form Data
      if (req.get('Content-Type') && req.get('Content-Type').includes('application/json')) {
        // JSON request
        const body = req.body;
        
        // Check if this is bulk image data
        if (body.imageData && Array.isArray(body.imageData)) {
          // Bulk image upload - use background processing
          return ProductController.bulkUploadImages(req, res);
        }
        
        productId = body.productId;
        groupSku = body.groupSku;
        subSku = body.subSku;
        imageUrls = body.imageUrls;
      } else {
        // Form Data request
        productId = req.body.productId;
        groupSku = req.body.groupSku;
        subSku = req.body.subSku;
        imageUrls = req.body.imageUrls;
      }
      
      // Validate that we have a way to identify the product
      if (!productId && !groupSku && !subSku) {
        return res.status(400).json({
          error: 'Product identification required',
          message: 'Provide either productId, groupSku, or subSku to identify the product'
        });
      }

      // Find the product for image tracking
      let existingProduct;
      if (productId) {
        existingProduct = await ProductModel.findById(parseInt(productId));
      } else if (subSku) {
        existingProduct = await ProductModel.findBySubSku(subSku);
      } else if (groupSku) {
        existingProduct = await ProductModel.findByGroupSku(groupSku);
      }

      let results = {
        uploadedFiles: [],
        downloadedUrls: [],
        failed: []
      };

      // Handle uploaded files - UNLIMITED SUPPORT
      if (req.files && req.files.length > 0) {
        console.log('📁 Files Uploaded:', req.files.length, 'UNLIMITED SUPPORT!');
        
        for (const file of req.files) {
          try {
            // Verify file exists and is accessible
            const fs = await import('fs');
            if (fs.existsSync(file.path)) {
              const stats = fs.statSync(file.path);
              console.log(`🔍 Uploaded file verified: ${file.filename} (${stats.size} bytes) at ${file.path}`);
              
              const uploadedFile = {
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                url: `/uploads/images/${file.filename}`,
                size: file.size,
                permanent: true // Flag to indicate permanent storage
              };
              
              results.uploadedFiles.push(uploadedFile);
              
              // Track uploaded files in product attributes
              if (existingProduct) {
                const currentAttributes = existingProduct.attributes || {};
                const existingImages = currentAttributes.images || [];
                
                const newImage = {
                  type: 'uploaded',
                  originalName: file.originalname,
                  filename: file.filename,
                  url: uploadedFile.url,
                  uploadedAt: new Date().toISOString(),
                  permanent: true
                };
                
                currentAttributes.images = [...existingImages, newImage];
                
                // Update product with image tracking information
                await ProductModel.update(existingProduct.id, {
                  attributes: currentAttributes
                });
                
                console.log(`📝 Tracked uploaded file: ${file.filename} for product ${existingProduct.id}`);
              }
            } else {
              throw new Error(`File not found after upload: ${file.path}`);
            }
          } catch (error) {
            console.error(`❌ File verification failed: ${file.originalname}`, error);
            results.failed.push({
              type: 'file',
              name: file.originalname,
              error: error.message
            });
          }
        }
      }

      // Handle image URLs (download from URLs) - Supports unlimited URLs
      if (imageUrls) {
        console.log('🌐 Processing Image URLs:', imageUrls);
        
        const urls = typeof imageUrls === 'string' ? imageUrls.split(',').map(url => url.trim()).filter(url => url) : imageUrls;
        
        console.log(`📊 Total URLs to process: ${urls.length} - UNLIMITED SUPPORT!`);
        
        try {
          // Download all URLs using the new downloader utility
          const downloadedPaths = await processImages(urls);
          
          // Create results array with downloaded images
          for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const downloadedPath = downloadedPaths[i];
            
            if (downloadedPath && !downloadedPath.startsWith('http')) {
              // Successfully downloaded
              const filename = downloadedPath.split('/').pop();
              results.downloadedUrls.push({
                originalUrl: url,
                filename: filename,
                url: downloadedPath,
                localPath: downloadedPath,
                permanent: true
              });
            } else {
              // Download failed
              results.failed.push({
                type: 'url',
                url: url,
                error: 'Failed to download image'
              });
            }
          }
          
          // Store image information in product attributes for tracking
          if (results.downloadedUrls.length > 0 && existingProduct) {
            const currentAttributes = existingProduct.attributes || {};
            const existingImages = currentAttributes.images || [];
            
            const newImages = results.downloadedUrls.map(item => ({
              type: 'downloaded',
              originalUrl: item.originalUrl,
              filename: item.filename,
              url: item.url,
              uploadedAt: new Date().toISOString(),
              permanent: true
            }));
            
            currentAttributes.images = [...existingImages, ...newImages];
            
            // Update product with image tracking information
            await ProductModel.update(existingProduct.id, {
              attributes: currentAttributes
            });
            
            console.log(`📝 Updated product ${existingProduct.id} with ${newImages.length} new images`);
          }
          
        } catch (error) {
          results.failed.push({
            type: 'url',
            error: error.message
          });
        }
      }

      // Update product attributes if product exists
      if (productId || groupSku || subSku) {
        try {
          let product;
          
          if (productId) {
            // Find by product ID
            product = await prisma.product.findUnique({
              where: { id: parseInt(productId) }
            });
          } else {
            // Find by SKU
            product = await prisma.product.findFirst({
              where: {
                OR: [
                  { groupSku: groupSku },
                  { subSku: subSku }
                ]
              }
            });
          }

          if (product) {
            const currentAttributes = product.attributes || {};
            const newAttributes = { ...currentAttributes };

            // Add uploaded files to attributes
            if (results.uploadedFiles.length > 0) {
              const uploadedUrls = results.uploadedFiles.map(file => file.url);
              newAttributes.galleryImages = [...(currentAttributes.galleryImages || []), ...uploadedUrls];
            }

            // Add downloaded URLs to attributes
            if (results.downloadedUrls.length > 0) {
              const downloadedUrls = results.downloadedUrls.map(item => item.url);
              newAttributes.galleryImages = [...(currentAttributes.galleryImages || []), ...downloadedUrls];
            }

            // Set main image if not already set
            if (!newAttributes.mainImageUrl && (results.uploadedFiles.length > 0 || results.downloadedUrls.length > 0)) {
              newAttributes.mainImageUrl = results.uploadedFiles[0]?.url || results.downloadedUrls[0]?.url;
            }

            await prisma.product.update({
              where: { id: product.id },
              data: { attributes: newAttributes }
            });
          }
        } catch (error) {
          console.error('Error updating product attributes:', error);
          results.failed.push({
            type: 'database',
            error: 'Failed to update product attributes: ' + error.message
          });
        }
      }

      res.json({
        message: 'Product images uploaded successfully',
        summary: {
          uploadedFiles: results.uploadedFiles.length,
          downloadedUrls: results.downloadedUrls.length,
          failed: results.failed.length
        },
        note: 'Images uploaded for existing product(s)',
        timestamp: new Date().toISOString(),
        results: results
      });

    } catch (error) {
      console.error('Upload product images error:', error);
      res.status(500).json({
        error: 'Failed to upload product images',
        details: error.message
      });
    }
  }

  // Get simple image template - groupSku, subSku, mainImageUrl, galleryImages (products without images first)
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
      
      // Get all products with image fields
      const products = await prisma.product.findMany({
        where: whereClause,
        select: {
          groupSku: true,
          subSku: true,
          mainImageUrl: true,
          galleryImages: true
        },
        orderBy: {
          groupSku: 'asc'
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
      
      // Separate products with and without images
      const productsWithoutImages = [];
      const productsWithImages = [];
      
      products.forEach(product => {
        const hasMainImage = product.mainImageUrl && product.mainImageUrl.trim() !== '';
        const hasGalleryImages = product.galleryImages && Array.isArray(product.galleryImages) && product.galleryImages.length > 0;
        const hasImages = hasMainImage || hasGalleryImages;
        
        // Process main image URL
        const mainImageWithBaseUrl = prependBaseUrl(product.mainImageUrl);
        
        // Process gallery images and format as comma-separated string for Excel
        let galleryImagesStr = '';
        if (product.galleryImages && Array.isArray(product.galleryImages)) {
          const galleryWithBaseUrls = product.galleryImages.map(img => prependBaseUrl(img));
          galleryImagesStr = galleryWithBaseUrls.join(',');
        }
        
        const productData = {
          groupSku: product.groupSku,
          subSku: product.subSku || '',
          mainImageUrl: mainImageWithBaseUrl,
          galleryImages: galleryImagesStr
        };
        
        if (hasImages) {
          productsWithImages.push(productData);
        } else {
          productsWithoutImages.push(productData);
        }
      });
      
      // Combine data: products WITHOUT images first, then products WITH images
      const templateData = [...productsWithoutImages, ...productsWithImages];
      
      res.json({
        message: 'Image template data retrieved successfully - Products without images shown first',
        timestamp: new Date().toISOString(),
        summary: {
          totalProducts: products.length,
          productsWithoutImages: productsWithoutImages.length,
          productsWithImages: productsWithImages.length
        },
        columns: ['groupSku', 'subSku', 'mainImageUrl', 'galleryImages'],
        imageBaseUrl: IMAGE_BASE_URL,
        templateData: templateData
      });
      
    } catch (error) {
      console.error('Get image template error:', error);
      res.status(500).json({
        error: 'Failed to get image template',
        details: error.message
      });
    }
  }

  // Get product template data for Excel generation (brand-wise, with image status)
  static async generateExcelTemplate(req, res) {
    try {
      // Get query parameters
      const brandId = req.query.brandId;
      const includeImages = req.query.includeImages === 'true';
      
      // Build where clause based on user access
      let whereClause = {};
      
      // Filter by brand if specified
      if (brandId) {
        whereClause.brandId = parseInt(brandId);
      }
      
      // For non-admin users, filter by accessible brands
      if (req.user.role !== 'ADMIN') {
        const userBrands = await prisma.userBrandAccess.findMany({
          where: {
            userId: req.user.userId,
            isActive: true
          },
          include: { brand: true }
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
      
      // Get all products with brand information
      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          brand: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { brand: { name: 'asc' } },
          { title: 'asc' }
        ]
      });
      
      // Separate products with and without images
      const productsWithoutImages = [];
      const productsWithImages = [];
      
      products.forEach(product => {
        const attributes = product.attributes || {};
        const hasMainImage = attributes.mainImageUrl && attributes.mainImageUrl.trim() !== '';
        const hasGalleryImages = attributes.galleryImages && Array.isArray(attributes.galleryImages) && attributes.galleryImages.length > 0;
        const hasImages = hasMainImage || hasGalleryImages;
        
        const productData = {
          brandName: product.brand.name,
          brandId: product.brand.id,
          title: product.title,
          groupSku: product.groupSku,
          subSku: product.subSku || '',
          category: product.category || '',
          collections: product.collections || '',
          singleSetItem: product.singleSetItem || '',
          brandRealPrice: parseFloat(product.brandRealPrice),
          brandMiscellaneous: parseFloat(product.brandMiscellaneous),
          mainImage: hasMainImage ? attributes.mainImageUrl : '',
          galleryImages: hasGalleryImages ? attributes.galleryImages.join(',') : '',
          hasImages: hasImages,
          imageCount: (hasMainImage ? 1 : 0) + (hasGalleryImages ? attributes.galleryImages.length : 0)
        };
        
        if (hasImages) {
          productsWithImages.push(productData);
        } else {
          productsWithoutImages.push(productData);
        }
      });
      
      // Combine data: products without images first, then products with images
      const templateData = [...productsWithoutImages, ...productsWithImages];
      
      // Group by brand for better organization
      const brandGroups = {};
      templateData.forEach(product => {
        if (!brandGroups[product.brandName]) {
          brandGroups[product.brandName] = {
            brandId: product.brandId,
            brandName: product.brandName,
            products: [],
            withoutImages: 0,
            withImages: 0,
            totalImages: 0
          };
        }
        
        brandGroups[product.brandName].products.push(product);
        
        if (product.hasImages) {
          brandGroups[product.brandName].withImages++;
          brandGroups[product.brandName].totalImages += product.imageCount;
        } else {
          brandGroups[product.brandName].withoutImages++;
        }
      });
      
      // Calculate summary statistics
      const summary = {
        totalProducts: products.length,
        totalBrands: Object.keys(brandGroups).length,
        productsWithoutImages: productsWithoutImages.length,
        productsWithImages: productsWithImages.length,
        totalImages: productsWithImages.reduce((sum, product) => sum + product.imageCount, 0),
        averageImagesPerProduct: productsWithImages.length > 0 ? 
          (productsWithImages.reduce((sum, product) => sum + product.imageCount, 0) / productsWithImages.length).toFixed(2) : 0
      };
      
      // Return JSON data for frontend Excel generation
      res.json({
        message: 'Product template data retrieved successfully',
        timestamp: new Date().toISOString(),
        summary: summary,
        brandGroups: brandGroups,
        templateData: templateData,
        excelColumns: [
          { key: 'brandName', header: 'Brand Name', width: 20 },
          { key: 'brandId', header: 'Brand ID', width: 10 },
          { key: 'title', header: 'Title', width: 30 },
          { key: 'groupSku', header: 'Group SKU', width: 20 },
          { key: 'subSku', header: 'Sub SKU', width: 20 },
          { key: 'category', header: 'Category', width: 15 },
          { key: 'collections', header: 'Collections', width: 15 },
          { key: 'singleSetItem', header: 'Single Set Item', width: 15 },
          { key: 'brandRealPrice', header: 'Brand Real Price', width: 15 },
          { key: 'brandMiscellaneous', header: 'Brand Miscellaneous', width: 20 },
          { key: 'mainImage', header: 'Main Image URL', width: 30 },
          { key: 'galleryImages', header: 'Gallery Images (Comma Separated)', width: 40 },
          { key: 'hasImages', header: 'Has Images', width: 12 },
          { key: 'imageCount', header: 'Image Count', width: 12 }
        ]
      });
      
    } catch (error) {
      console.error('Generate Excel template error:', error);
      res.status(500).json({
        error: 'Failed to generate Excel template',
        details: error.message
      });
    }
  }

  // Search product by individual SKU (handles comma-separated subSku)
  static async getProductBySku(req, res) {
    try {
      const { sku } = req.params;
      
      if (!sku || sku.trim() === '') {
        return res.status(400).json({
          error: 'SKU parameter is required'
        });
      }

      const product = await ProductModel.findBySubSku(sku);
      
      if (!product) {
        return res.status(404).json({
          error: 'Product not found',
          message: `No product found with SKU: ${sku}`
        });
      }

      // Check user access to product's brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: product.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to products from brand: ${product.brand.name}`
          });
        }
      }

      // Parse individual SKUs for response
      const individualSkus = ProductModel.parseSubSkus(product.subSku);

      res.json({
        message: 'Product found successfully',
        product: {
          ...product,
          individualSkus: individualSkus
        },
        searchedSku: sku
      });
    } catch (error) {
      console.error('Get product by SKU error:', error);
      res.status(500).json({
        error: 'Failed to retrieve product',
        details: error.message
      });
    }
  }

  // Bulk product creation - Background processing (for large datasets)
  static async bulkCreateProducts(req, res) {
    try {
      let productsToCreate = [];
      let fileInfo = null;

      // Check if file was uploaded (note: uploadFileAndImages uses .fields() so files are in req.files)
      const uploadedFile = req.files && req.files.file ? req.files.file[0] : req.file;
      
      if (uploadedFile) {
        console.log('📁 Bulk File Upload Detected:', {
          filename: uploadedFile.originalname,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype,
          path: uploadedFile.path
        });

        // Process file upload from disk
        const FileProcessor = (await import('../utils/fileProcessor.js')).default;
        const fs = await import('fs');
        
        // Read file from disk path
        const fileBuffer = fs.readFileSync(uploadedFile.path);
        const fileData = await FileProcessor.processFileBuffer(fileBuffer, uploadedFile.originalname);
        
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

        productsToCreate = validData;
        fileInfo = {
          originalName: uploadedFile.originalname,
          storedName: uploadedFile.filename,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype
        };
      } else {
        // Handle JSON data (single product, multiple products, or products array)
        const { products, title, groupSku, brandName } = req.body;

        if (products && Array.isArray(products)) {
          // Multiple products in array format
          productsToCreate = products;
        } else if (title && groupSku) {
          // Single product format - convert to array
          productsToCreate = [req.body];
          // Update req.body to have products array for createProduct method
          req.body = { products: productsToCreate };
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "products" array, single product data (with title and groupSku), or upload a file',
            supported: {
              singleProduct: ['title', 'groupSku', 'brandName', '...'],
              multipleProducts: ['products array'],
              fileUpload: ['Excel/CSV file']
            }
          });
        }
      }

      // Industry standard: Always use background processing for ALL operations
      // This ensures consistent behavior, progress tracking, and non-blocking UI
      console.log(`🚀 Processing ${productsToCreate.length} product(s) in background...`);
      
      const jobId = await BackgroundProcessor.processCustom(
        req.user.userId,
        'PRODUCT_CREATE',
        { total: productsToCreate.length },
        async (jobId, tracker) => {
          // Process products using same logic as createProduct
          for (let i = 0; i < productsToCreate.length; i++) {
            const productData = productsToCreate[i];
            
            try {
              // Check brand
              const brand = await ProductModel.checkBrandExists(productData.brandId || productData.brandName);
              if (!brand) {
                tracker.updateProgress(jobId, {
                  processed: i + 1,
                  failed: (tracker.getJob(jobId).data.failed || 0) + 1,
                  errors: [...(tracker.getJob(jobId).data.errors || []), 
                    { item: productData.title, error: `Brand not found: ${productData.brandId || productData.brandName}` }
                  ].slice(-20)
                });
                continue;
              }

              // Check user access (if not admin)
              if (req.user.role !== 'ADMIN') {
                const hasAccess = await prisma.userBrandAccess.findFirst({
                  where: { userId: req.user.userId, brandId: brand.id, isActive: true }
                });
                if (!hasAccess) {
                  tracker.updateProgress(jobId, {
                    processed: i + 1,
                    failed: (tracker.getJob(jobId).data.failed || 0) + 1,
                    errors: [...(tracker.getJob(jobId).data.errors || []), 
                      { item: productData.title, error: `Access denied to brand: ${brand.name}` }
                    ].slice(-20)
                  });
                  continue;
                }
              }

              // Create product
              const product = await ProductModel.create({
                brandId: brand.id,
                title: productData.title,
                groupSku: productData.groupSku,
                subSku: productData.subSku || productData.groupSku,
                category: productData.category,
                collectionName: productData.collectionName || '',
                singleSetItem: productData.singleSetItem,
                brandRealPrice: parseFloat(productData.brandRealPrice),
                brandMiscellaneous: parseFloat(productData.brandMiscellaneous || 0),
                brandPrice: parseFloat(productData.brandRealPrice) + parseFloat(productData.brandMiscellaneous || 0),
                msrp: parseFloat(productData.msrp),
                shippingPrice: parseFloat(productData.shippingPrice || 0),
                commissionPrice: parseFloat(productData.commissionPrice || 0),
                profitMarginPrice: parseFloat(productData.profitMarginPrice || 0),
                ecommerceMiscellaneous: parseFloat(productData.ecommerceMiscellaneous || 0),
                ecommercePrice: parseFloat(productData.ecommercePrice || 0),
                mainImageUrl: productData.mainImageUrl ? await processImage(productData.mainImageUrl) : null,
                galleryImages: productData.galleryImages ? await processImages(productData.galleryImages) : null,
                attributes: productData.attributes || {}
              });


              tracker.updateProgress(jobId, {
                processed: i + 1,
                success: (tracker.getJob(jobId).data.success || 0) + 1
              });

            } catch (error) {
              // Convert technical errors to user-friendly messages
              let userFriendlyError = error.message;
              
              if (error.message.includes('Unique constraint failed') && error.message.includes('group_sku')) {
                userFriendlyError = `Product with group SKU "${productData.groupSku}" already exists`;
              } else if (error.message.includes('Unique constraint failed')) {
                userFriendlyError = 'Duplicate entry - product already exists';
              } else if (error.message.includes('foreign key constraint')) {
                userFriendlyError = 'Related data not found';
              } else if (error.message.includes('required field')) {
                userFriendlyError = 'Missing required information';
              } else if (error.message.includes('Invalid')) {
                userFriendlyError = 'Invalid data provided';
              }
              
              tracker.updateProgress(jobId, {
                processed: i + 1,
                failed: (tracker.getJob(jobId).data.failed || 0) + 1,
                errors: [...(tracker.getJob(jobId).data.errors || []), 
                  { item: productData.title || productData.groupSku, error: userFriendlyError }
                ].slice(-20)
              });
            }
          }
        }
      );

      res.status(202).json({
        message: `${productsToCreate.length} product(s) processing in background.`,
        jobId: jobId,
        status: 'PROCESSING',
        totalProducts: productsToCreate.length,
        estimatedTime: TimeEstimator.estimateProducts(productsToCreate.length),
        checkStatus: `/api/products/status?jobId=${jobId}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Bulk product creation error:', error);
      res.status(500).json({
        error: 'Failed to queue bulk product creation',
        details: error.message
      });
    }
  }

  // Get bulk processing status - Shows all product background jobs
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
            id: job.jobId, // Frontend expects 'id'
            jobId: job.jobId, // Keep for backward compatibility
            userId: job.userId?.toString(), // Convert to string for frontend comparison
            type: job.type?.toLowerCase() || 'product',
            status: job.status?.toLowerCase() || 'pending',
            progress: job.progress || 0, // Frontend expects number
            totalItems: job.data.total || 0, // Frontend expects 'totalItems'
            processedItems: job.data.processed || 0, // Frontend expects 'processedItems'
            total: job.data.total,
            processed: job.data.processed,
            success: job.data.success,
            failed: job.data.failed,
            errors: job.data.errors || [],
            startedAt: job.startedAt instanceof Date ? job.startedAt.toISOString() : job.startedAt,
            completedAt: job.completedAt instanceof Date ? job.completedAt.toISOString() : job.completedAt,
            duration: job.completedAt 
              ? `${Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000)}s`
              : `${Math.round((Date.now() - new Date(job.startedAt)) / 1000)}s`
          },
          timestamp: new Date().toISOString()
        });
      }

      // Admin can see all jobs, users see only their own
      const productJobs = req.user.role === 'ADMIN'
        ? jobTracker.getJobsByType(null, 'PRODUCT')  // Admin: all jobs
        : jobTracker.getJobsByType(req.user.userId, 'PRODUCT'); // User: only their jobs
      
      // Format jobs for response (frontend expects specific format)
      const formattedJobs = productJobs.map(job => ({
        id: job.jobId, // Frontend expects 'id' not 'jobId'
        jobId: job.jobId, // Keep for backward compatibility
        userId: job.userId?.toString(), // Convert to string for frontend comparison
        ...(req.user.role === 'ADMIN' && { username: `User ${job.userId}` }), // Show username for admin
        type: job.type?.toLowerCase() || 'product', // Ensure lowercase for frontend
        status: job.status?.toLowerCase() || 'pending', // Ensure lowercase
        progress: job.progress || 0, // Frontend expects number, not string
        totalItems: job.data.total || 0, // Frontend expects 'totalItems'
        processedItems: job.data.processed || 0, // Frontend expects 'processedItems'
        summary: {
          total: job.data.total,
          processed: job.data.processed,
          success: job.data.success,
          failed: job.data.failed
        },
        recentErrors: job.data.errors || [], // Show all errors
        startedAt: job.startedAt instanceof Date ? job.startedAt.toISOString() : job.startedAt,
        completedAt: job.completedAt instanceof Date ? job.completedAt.toISOString() : job.completedAt,
        duration: job.completedAt 
          ? `${Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000)}s`
          : `${Math.round((Date.now() - new Date(job.startedAt)) / 1000)}s`
      }));

      // Get statistics if admin
      let stats = null;
      if (req.user.role === 'ADMIN') {
        stats = jobTracker.getStats();
      }

      res.json({
        message: 'Product background jobs status',
        userRole: req.user.role,
        totalJobs: formattedJobs.length,
        jobs: formattedJobs,
        ...(stats && { systemStats: stats }),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get bulk status error:', error);
      res.status(500).json({
        error: 'Failed to get bulk processing status',
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

  // Bulk image upload - Background processing (for large datasets)
  static async bulkUploadImages(req, res) {
    try {
      const { imageData } = req.body;

      if (!imageData || !Array.isArray(imageData)) {
        return res.status(400).json({
          error: 'Invalid request format',
          message: 'Provide "imageData" array'
        });
      }

      // Validate image data structure
      const validImageData = imageData.filter(item => {
        return item.productId && (item.imageUrls || item.imageFiles);
      });

      if (validImageData.length === 0) {
        return res.status(400).json({
          error: 'No valid image data provided',
          message: 'Each item must have productId and imageUrls or imageFiles'
        });
      }

      // For large datasets, use background processing
      const jobId = await BackgroundProcessor.processBulk(
        req.user.userId,
        'PRODUCT_IMAGE',
        validImageData,
        async (item) => {
          const product = await ProductModel.findById(parseInt(item.productId));
          if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
          }

          // Process images (URLs or files)
          const imageUrls = item.imageUrls || [];
          const downloadedImages = await processImages(imageUrls);

          // Update product
          return await ProductModel.update(product.id, {
            mainImageUrl: downloadedImages[0] || product.mainImageUrl,
            galleryImages: downloadedImages.length > 1 ? downloadedImages.slice(1) : product.galleryImages
          });
        },
        50 // Batch size
      );

      res.status(202).json({
        message: `Large image dataset detected (${validImageData.length} products). Processing in background.`,
        jobId: jobId,
        status: 'PROCESSING',
        totalProducts: validImageData.length,
        estimatedTime: `${Math.ceil(validImageData.length / 50)} minutes`,
        checkStatus: `/api/products/status?jobId=${jobId}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Bulk image upload error:', error);
      res.status(500).json({
        error: 'Failed to queue bulk image upload',
        details: error.message
      });
    }
  }

  // Auto-update mechanism: when single product is updated, update all related multi-subSKU products and listings
  static async autoUpdateSubSkuData(updatedSingleProduct) {
    try {
      const subSku = updatedSingleProduct.subSku;
      console.log(`🔄 Auto-updating subSkuData for subSKU: ${subSku}`);
      
      // Find all products that contain this subSKU (we'll filter multi-subSKU products next)
      const allRelatedProducts = await prisma.product.findMany({
        where: {
          subSku: { contains: subSku },
          id: { not: updatedSingleProduct.id }
        }
      });
      
      // Filter to only multi-subSKU products (those with comma-separated values)
      const relatedProducts = allRelatedProducts.filter(p => p.subSku && p.subSku.includes(','));
      
      // Find all listings that contain this subSKU (we'll filter multi-subSKU listings next)
      const allRelatedListings = await prisma.listing.findMany({
        where: {
          subSku: { contains: subSku }
        }
      });
      
      // Filter to only multi-subSKU listings (those with comma-separated values)
      const relatedListings = allRelatedListings.filter(l => l.subSku && l.subSku.includes(','));
      
      console.log(`📦 Found ${relatedProducts.length} related products and ${relatedListings.length} related listings`);
      
      // Update each related product
      for (const product of relatedProducts) {
        if (product.attributes && product.attributes.subSkuData && product.attributes.subSkuData[subSku]) {
          // Update the specific subSKU data with relative URLs
          let relativeMainImageUrl = updatedSingleProduct.mainImageUrl;
          if (relativeMainImageUrl && relativeMainImageUrl.startsWith('/uploads/')) {
            relativeMainImageUrl = relativeMainImageUrl.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
          }
          
          let relativeGalleryImages = [];
          if (updatedSingleProduct.galleryImages && Array.isArray(updatedSingleProduct.galleryImages)) {
            relativeGalleryImages = updatedSingleProduct.galleryImages
              .filter(img => img && !img.startsWith('data:image/'))
              .map(img => {
                if (img.startsWith('/uploads/')) {
                  return img.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                }
                return img;
              });
          }
          
          // Map complete single product data
          product.attributes.subSkuData[subSku] = {
            id: updatedSingleProduct.id,
            title: updatedSingleProduct.title,
            groupSku: updatedSingleProduct.groupSku,
            subSku: updatedSingleProduct.subSku,
            category: updatedSingleProduct.category,
            collectionName: updatedSingleProduct.collectionName,
            singleSetItem: updatedSingleProduct.singleSetItem,
            brandId: updatedSingleProduct.brandId,
            brandRealPrice: parseFloat(updatedSingleProduct.brandRealPrice),
            brandMiscellaneous: parseFloat(updatedSingleProduct.brandMiscellaneous),
            brandPrice: parseFloat(updatedSingleProduct.brandPrice),
            msrp: parseFloat(updatedSingleProduct.msrp),
            shippingPrice: parseFloat(updatedSingleProduct.shippingPrice),
            commissionPrice: parseFloat(updatedSingleProduct.commissionPrice),
            profitMarginPrice: parseFloat(updatedSingleProduct.profitMarginPrice),
            ecommerceMiscellaneous: parseFloat(updatedSingleProduct.ecommerceMiscellaneous),
            ecommercePrice: parseFloat(updatedSingleProduct.ecommercePrice),
            mainImageUrl: relativeMainImageUrl,
            galleryImages: relativeGalleryImages,
            attributes: updatedSingleProduct.attributes,
            createdAt: updatedSingleProduct.createdAt,
            updatedAt: updatedSingleProduct.updatedAt
          };
          
          // Save to database
          await prisma.product.update({
            where: { id: product.id },
            data: { attributes: product.attributes }
          });
          
          console.log(`✅ Updated product ${product.id} subSkuData for ${subSku}`);
        }
      }
      
      // Update each related listing
      for (const listing of relatedListings) {
        if (listing.attributes && listing.attributes.subSkuData && listing.attributes.subSkuData[subSku]) {
          // Update the specific subSKU data with relative URLs
          let relativeMainImageUrl = updatedSingleProduct.mainImageUrl;
          if (relativeMainImageUrl && relativeMainImageUrl.startsWith('/uploads/')) {
            relativeMainImageUrl = relativeMainImageUrl.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
          }
          
          let relativeGalleryImages = [];
          if (updatedSingleProduct.galleryImages && Array.isArray(updatedSingleProduct.galleryImages)) {
            relativeGalleryImages = updatedSingleProduct.galleryImages
              .filter(img => img && !img.startsWith('data:image/'))
              .map(img => {
                if (img.startsWith('/uploads/')) {
                  return img.replace('/uploads/downloaded/', '/uploads/downloadedUrlimages/');
                }
                return img;
              });
          }
          
          // Map complete single product data
          listing.attributes.subSkuData[subSku] = {
            id: updatedSingleProduct.id,
            title: updatedSingleProduct.title,
            groupSku: updatedSingleProduct.groupSku,
            subSku: updatedSingleProduct.subSku,
            category: updatedSingleProduct.category,
            collectionName: updatedSingleProduct.collectionName,
            singleSetItem: updatedSingleProduct.singleSetItem,
            brandId: updatedSingleProduct.brandId,
            brandRealPrice: parseFloat(updatedSingleProduct.brandRealPrice),
            brandMiscellaneous: parseFloat(updatedSingleProduct.brandMiscellaneous),
            brandPrice: parseFloat(updatedSingleProduct.brandPrice),
            msrp: parseFloat(updatedSingleProduct.msrp),
            shippingPrice: parseFloat(updatedSingleProduct.shippingPrice),
            commissionPrice: parseFloat(updatedSingleProduct.commissionPrice),
            profitMarginPrice: parseFloat(updatedSingleProduct.profitMarginPrice),
            ecommerceMiscellaneous: parseFloat(updatedSingleProduct.ecommerceMiscellaneous),
            ecommercePrice: parseFloat(updatedSingleProduct.ecommercePrice),
            mainImageUrl: relativeMainImageUrl,
            galleryImages: relativeGalleryImages,
            attributes: updatedSingleProduct.attributes,
            createdAt: updatedSingleProduct.createdAt,
            updatedAt: updatedSingleProduct.updatedAt
          };
          
          // Save to database
          await prisma.listing.update({
            where: { id: listing.id },
            data: { attributes: listing.attributes }
          });
          
          console.log(`✅ Updated listing ${listing.id} subSkuData for ${subSku}`);
        }
      }
      
      console.log(`🎉 Auto-update completed for subSKU: ${subSku}`);
      
    } catch (error) {
      console.error('❌ Auto-update error:', error);
    }
  }

}

export default ProductController;
