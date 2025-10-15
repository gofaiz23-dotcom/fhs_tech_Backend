import ProductModel from '../models/Product.js';
import ManagementLogger from '../utils/managementLogger.js';
import ImageService from '../services/imageService.js';
import queueService from '../services/queueService.js';
import { prisma } from '../config/database.js';

class ProductController {
  // Helper method for validating and converting price values
  static validatePrice(value, fieldName) {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Convert to string first to handle all types, then trim
    const valueStr = String(value).trim();
    
    // If empty after trimming, return null
    if (valueStr === '') {
      return null;
    }
    
    // Try to parse as float
    const numericValue = parseFloat(valueStr);
    
    // Check if it's a valid number and not negative
    if (isNaN(numericValue) || numericValue < 0) {
      throw new Error(`Invalid ${fieldName}: "${value}" - must be a valid positive number`);
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

      res.json({
        message: 'Products retrieved successfully',
        userAccess: {
          userId: req.user.userId,
          role: req.user.role,
          email: req.user.email
        },
        timestamp: new Date().toISOString(),
        products: result.products,
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
        
        console.log('🔍 File Processing Debug:', {
          filename: req.file.originalname,
          bufferLength: req.file.buffer ? req.file.buffer.length : 'undefined',
          bufferType: typeof req.file.buffer,
          mimetype: req.file.mimetype
        });
        
        const fileData = await FileProcessor.processFileBuffer(req.file.buffer, req.file.originalname);
        
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
        const { products, brandId, brandName, title, groupSku, subSku, category, collectionName, shipTypes, singleSetItem, attributes } = req.body;

        if (products && Array.isArray(products)) {
          // Multiple products
          productsToCreate = products.map(product => ({
            brandId: product.brandId,
            brandName: product.brandName,
            title: product.title?.trim(),
            groupSku: product.groupSku?.trim(),
            subSku: product.subSku?.trim(),
            category: product.category?.trim(),
            collectionName: product.collectionName?.trim(),
            shipTypes: product.shipTypes?.trim(),
            singleSetItem: product.singleSetItem?.trim(),
            brandRealPrice: product.brandRealPrice,
            brandMiscellaneous: product.brandMiscellaneous,
            attributes: product.attributes || {}
          }));
        } else if (title && groupSku) {
          // Single product
          const { brandRealPrice, brandMiscellaneous } = req.body;
          productsToCreate = [{
            brandId: brandId,
            brandName: brandName,
            title: title.trim(),
            groupSku: groupSku.trim(),
            subSku: subSku?.trim() || '',
            category: category?.trim() || '',
            collectionName: collectionName?.trim() || '',
            shipTypes: shipTypes?.trim() || '',
            singleSetItem: singleSetItem?.trim() || '',
            brandRealPrice: brandRealPrice,
            brandMiscellaneous: brandMiscellaneous,
            attributes: attributes || {}
          }];
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "products" array, single product data, or upload a file'
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
          let brandRealPrice, brandMiscellaneous;
          
          console.log('🔍 Price Validation Debug:', {
            title: productData.title,
            brandRealPrice: productData.brandRealPrice,
            brandRealPriceType: typeof productData.brandRealPrice,
            brandMiscellaneous: productData.brandMiscellaneous,
            brandMiscellaneousType: typeof productData.brandMiscellaneous,
            msrp: productData.msrp,
            msrpType: typeof productData.msrp,
            allFields: Object.keys(productData)
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
            
            // Validate MSRP
            if (productData.msrp === undefined || productData.msrp === null || productData.msrp === '') {
              results.errors.push({
                title: productData.title,
                error: 'MSRP is mandatory'
              });
              continue;
            }
            
            const msrp = ProductController.validatePrice(productData.msrp, 'MSRP');
            console.log('✅ MSRP validation result:', msrp);
          } catch (error) {
            console.error('❌ Price validation error:', error.message);
            results.errors.push(`Product "${productData.title}": ${error.message}`);
            continue;
          }

          // Process attributes (without image processing during product creation)
          let finalAttributes = { ...productData.attributes };
          
          // Filter out empty/null values from attributes
          Object.keys(finalAttributes).forEach(key => {
            const value = finalAttributes[key];
            if (value === null || value === undefined || value === '' || 
                (Array.isArray(value) && value.length === 0) ||
                (typeof value === 'object' && Object.keys(value).length === 0)) {
              delete finalAttributes[key];
            }
          });

          // Note: Images are processed separately after product creation
          // This allows products to be created first, then images uploaded later

          // Create product
          const product = await ProductModel.create({
            brandId: brand.id,
            title: productData.title,
            groupSku: productData.groupSku,
            subSku: productData.subSku,
            category: productData.category,
            collectionName: productData.collectionName,
            shipTypes: productData.shipTypes,
            singleSetItem: productData.singleSetItem,
            // Brand Pricing (using validated and converted values)
            brandRealPrice: brandRealPrice,
            brandMiscellaneous: brandMiscellaneous,
            msrp: msrp,
            // Ecommerce Pricing (All default to 0 - will be set via separate API)
            shippingPrice: 0,
            commissionPrice: 0,
            profitMarginPrice: 0,
            ecommerceMiscellaneous: 0,
            attributes: finalAttributes
          });

          results.created.push(product);

          // Log management action
          await ManagementLogger.logProductAction(
            req.user.userId,
            'CREATE',
            product.id,
            brand.id,
            { oldData: null, newData: product },
            req
          );

        } catch (error) {
          results.errors.push({
            title: productData.title,
            error: error.message
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
      const { title, groupSku, subSku, category, collectionName, shipTypes, singleSetItem, attributes } = req.body;

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

      const updatedProduct = await ProductModel.update(productId, {
        title,
        groupSku,
        subSku,
        category,
        collectionName,
        shipTypes,
        singleSetItem,
        attributes
      });

      // Log management action
      await ManagementLogger.logProductAction(
        req.user.userId,
        'UPDATE',
        productId,
        existingProduct.brandId,
        { oldData: existingProduct, newData: updatedProduct },
        req
      );

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

      // Log management action
      await ManagementLogger.logProductAction(
        req.user.userId,
        'DELETE',
        productId,
        existingProduct.brandId,
        { oldData: existingProduct, newData: null },
        req
      );

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

      // Log management action
      await ManagementLogger.logProductAction(
        req.user.userId,
        'DELETE_ALL',
        null,
        null,
        { deletedCount: deletedCount.count },
        req
      );

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

  // Upload product images - supports both single and bulk uploads (JSON and Form Data) - Only for existing products
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
        const productSku = groupSku || subSku;
        
        console.log(`📊 Total URLs to process: ${urls.length} - UNLIMITED SUPPORT!`);
        
        try {
          const downloadResults = await ImageService.downloadMultipleImages(urls, productSku);
          
          results.downloadedUrls = downloadResults.successful.map(item => ({
            originalUrl: item.originalUrl,
            filename: item.filename,
            url: item.url,
            localPath: item.localPath,
            permanent: true // Flag to indicate permanent storage
          }));
          
          results.failed = results.failed.concat(downloadResults.failed.map(item => ({
            type: 'url',
            url: item.originalUrl,
            error: item.error
          })));
          
          // Store image information in product attributes for tracking
          if (downloadResults.successful.length > 0 && existingProduct) {
            const currentAttributes = existingProduct.attributes || {};
            const existingImages = currentAttributes.images || [];
            
            const newImages = downloadResults.successful.map(item => ({
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

            // Log management action
            await ManagementLogger.logProductAction(
              req.user.userId,
              'UPDATE_IMAGES',
              product.id,
              product.brandId,
              { 
                oldImages: currentAttributes,
                newImages: newAttributes,
                uploadedCount: results.uploadedFiles.length,
                downloadedCount: results.downloadedUrls.length
              },
              req
            );
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

  // Get simple image template - only groupSku, subSku, mainImage for products with images
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
      
      // Get all products
      const products = await prisma.product.findMany({
        where: whereClause,
        select: {
          groupSku: true,
          subSku: true,
          attributes: true
        }
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
          groupSku: product.groupSku,
          subSku: product.subSku || '',
          mainImage: attributes.mainImageUrl || '',
          galleryImages: attributes.galleryImages || []
        };
        
        if (hasImages) {
          productsWithImages.push(productData);
        } else {
          productsWithoutImages.push(productData);
        }
      });
      
      // Combine data: products without images first, then products with images
      const templateData = [...productsWithoutImages, ...productsWithImages];
      
      res.json({
        message: 'Image template data retrieved successfully',
        timestamp: new Date().toISOString(),
        summary: {
          totalProducts: products.length,
          productsWithImages: productsWithImages.length,
          productsWithoutImages: products.length - productsWithImages.length
        },
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
          shipTypes: product.shipTypes || '',
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
          { key: 'shipTypes', header: 'Ship Types', width: 15 },
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

      // Check if file was uploaded
      if (req.file) {
        console.log('📁 Bulk File Upload Detected:', {
          filename: req.file.originalname,
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

        productsToCreate = validData;
        fileInfo = {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        };
      } else {
        // Handle JSON data
        const { products } = req.body;

        if (!products || !Array.isArray(products)) {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide "products" array or upload a file'
          });
        }

        productsToCreate = products;
      }

      // For small datasets (< 1000), process immediately
      if (productsToCreate.length < 1000) {
        return ProductController.createProduct(req, res);
      }

      // For large datasets, use background processing
      const jobResult = await queueService.addBulkProductJob({
        fileData: productsToCreate,
        fileInfo,
        userRole: req.user.role
      }, req.user.userId);

      res.status(202).json({
        message: `Large dataset detected (${productsToCreate.length} products). Processing in background.`,
        jobId: jobResult.jobId,
        status: jobResult.status,
        totalProducts: productsToCreate.length,
        estimatedTime: `${Math.ceil(productsToCreate.length / 100)} minutes`,
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

  // Get bulk processing status (for users and admin)
  static async getBulkStatus(req, res) {
    try {
      const { jobId, queueName } = req.query;

      // If specific job ID provided
      if (jobId && queueName) {
        const jobStatus = await queueService.getJobStatus(queueName, jobId);
        return res.json({
          message: 'Job status retrieved successfully',
          jobStatus,
          timestamp: new Date().toISOString()
        });
      }

      // Get user's jobs
      const userJobs = await queueService.getUserJobs(req.user.userId);

      // If admin, also get queue statistics
      let queueStats = null;
      if (req.user.role === 'ADMIN') {
        queueStats = await queueService.getQueueStats();
      }

      res.json({
        message: 'Bulk processing status retrieved successfully',
        userRole: req.user.role,
        userJobs: userJobs,
        ...(queueStats && { queueStats }),
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
      const jobResult = await queueService.addBulkImageJob({
        imageData: validImageData
      }, req.user.userId);

      res.status(202).json({
        message: `Large image dataset detected (${validImageData.length} products). Processing in background.`,
        jobId: jobResult.jobId,
        status: jobResult.status,
        totalProducts: validImageData.length,
        estimatedTime: `${Math.ceil(validImageData.length / 50)} minutes`,
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

}

export default ProductController;
