import BrandModel from '../models/Brand.js';

class BrandController {
  // Get all brands with pagination (filtered by user access for regular users)
  static async getAllBrands(req, res) {
    try {
      // Extract pagination parameters from query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      let result;

      if (req.user.role === 'ADMIN') {
        // Admin sees all brands with pagination
        result = await BrandModel.findAllWithPagination(offset, limit);
      } else {
        // Regular user sees only accessible brands with pagination
        result = await BrandModel.findByUserAccessWithPagination(req.user.userId, offset, limit);
      }

      res.json({
        message: 'Brands retrieved successfully',
        brands: result.brands,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.totalCount / limit),
          totalCount: result.totalCount,
          limit: limit,
          hasNextPage: page < Math.ceil(result.totalCount / limit),
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Get all brands error:', error);
      res.status(500).json({
        error: 'Failed to retrieve brands',
        details: error.message
      });
    }
  }

  // Get specific brand by ID
  static async getBrandById(req, res) {
    try {
      const brandId = parseInt(req.params.id);

      // Check if brand exists
      const brand = await BrandModel.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          error: 'Brand not found'
        });
      }

      // For regular users, check if they have access to this brand
      if (req.user.role !== 'ADMIN') {
        const userBrands = await BrandModel.findByUserAccess(req.user.userId);
        const hasAccess = userBrands.some(userBrand => userBrand.id === brandId);
        
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied to this brand'
          });
        }
      }

      res.json({
        message: 'Brand retrieved successfully',
        brand: brand
      });
    } catch (error) {
      console.error('Get brand by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve brand',
        details: error.message
      });
    }
  }

  // Create new brand(s) (Admin only) - Supports multiple brands and file upload
  static async createBrand(req, res) {
    try {
      let brandsToCreate = [];
      let results = {
        created: [],
        errors: [],
        duplicates: []
      };

      // Check if file was uploaded
      if (req.file) {
        console.log('📁 Brand File Upload:', {
          filename: req.file.originalname,
          storedFilename: req.file.filename,
          path: req.file.path,
          size: req.file.size
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
        const { validData, errors } = FileProcessor.validateBrandData(fileData);
        
        if (errors.length > 0) {
          return res.status(400).json({
            error: 'File validation failed',
            details: errors
          });
        }

        brandsToCreate = validData;
      } else {
        // Handle JSON data (single or multiple brands)
        const { brands, name, description } = req.body;

        if (brands && Array.isArray(brands)) {
          // Multiple brands
          brandsToCreate = brands.map(brand => ({
            name: brand.name?.trim(),
            description: brand.description?.trim() || null
          }));
        } else if (name) {
          // Single brand - check for duplicates
          const existingBrands = await BrandModel.findAll();
          const existingNames = existingBrands.map(brand => brand.name.toLowerCase());
          
          if (existingNames.includes(name.toLowerCase())) {
            return res.status(400).json({
              error: 'Duplicate brand name',
              message: 'Brand name already exists',
              duplicate: {
                name: name,
                error: 'Brand name already exists'
              }
            });
          }
          
          brandsToCreate = [{
            name: name.trim(),
            description: description?.trim() || null
          }];
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "brands" array, single "name", or upload a file'
          });
        }

        // Validate JSON data
        for (let i = 0; i < brandsToCreate.length; i++) {
          if (!brandsToCreate[i].name || brandsToCreate[i].name === '') {
            return res.status(400).json({
              error: `Brand name is required for item ${i + 1}`
            });
          }
        }
      }

      // Check for duplicates before creating
      const existingBrands = await BrandModel.findAll();
      const existingNames = existingBrands.map(brand => brand.name.toLowerCase());
      
      // Separate unique and duplicate brands
      const uniqueBrands = [];
      const duplicateBrands = [];
      
      for (const brandData of brandsToCreate) {
        const brandName = brandData.name.toLowerCase();
        if (existingNames.includes(brandName)) {
          duplicateBrands.push({
            name: brandData.name,
            error: 'Brand name already exists'
          });
        } else {
          uniqueBrands.push(brandData);
          existingNames.push(brandName); // Add to list to prevent duplicates within the same batch
        }
      }
      
      // Create only unique brands
      for (const brandData of uniqueBrands) {
        try {
          const brand = await BrandModel.create(brandData);
          results.created.push(brand);
        } catch (error) {
          results.errors.push({
            name: brandData.name,
            error: error.message
          });
        }
      }
      
      // Add duplicates to results
      results.duplicates = duplicateBrands;

      // Prepare response
      const response = {
        message: `Processed ${brandsToCreate.length} brand(s)`,
        summary: {
          total: brandsToCreate.length,
          created: results.created.length,
          duplicates: results.duplicates.length,
          errors: results.errors.length
        },
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
          message: 'No brands were created'
        });
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Create brand error:', error);
      res.status(500).json({
        error: 'Failed to create brand(s)',
        details: error.message
      });
    }
  }

  // Update brand (Admin only)
  static async updateBrand(req, res) {
    try {
      const brandId = parseInt(req.params.id);
      const { name, description } = req.body;

      // Check if brand exists
      const existingBrand = await BrandModel.findById(brandId);
      if (!existingBrand) {
        return res.status(404).json({
          error: 'Brand not found'
        });
      }

      const updatedBrand = await BrandModel.update(brandId, {
        name,
        description
      });

      res.json({
        message: 'Brand updated successfully',
        brand: updatedBrand
      });
    } catch (error) {
      console.error('Update brand error:', error);
      res.status(500).json({
        error: 'Failed to update brand',
        details: error.message
      });
    }
  }

  // Delete brand (Admin only)
  static async deleteBrand(req, res) {
    try {
      const brandId = parseInt(req.params.id);

      // Check if brand exists
      const existingBrand = await BrandModel.findById(brandId);
      if (!existingBrand) {
        return res.status(404).json({
          error: 'Brand not found'
        });
      }

      await BrandModel.delete(brandId);

      res.json({
        message: 'Brand deleted successfully'
      });
    } catch (error) {
      console.error('Delete brand error:', error);
      res.status(500).json({
        error: 'Failed to delete brand',
        details: error.message
      });
    }
  }
}

export default BrandController;
