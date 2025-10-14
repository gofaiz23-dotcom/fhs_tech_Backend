import MarketplaceModel from '../models/Marketplace.js';

class MarketplaceController {
  // Get all marketplaces with pagination (filtered by user access for regular users)
  static async getAllMarketplaces(req, res) {
    try {
      // Extract pagination parameters from query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      let result;

      if (req.user.role === 'ADMIN') {
        // Admin sees all marketplaces with pagination
        result = await MarketplaceModel.findAllWithPagination(offset, limit);
      } else {
        // Regular user sees only accessible marketplaces with pagination
        result = await MarketplaceModel.findByUserAccessWithPagination(req.user.userId, offset, limit);
      }

      res.json({
        message: 'Marketplaces retrieved successfully',
        marketplaces: result.marketplaces,
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
      console.error('Get all marketplaces error:', error);
      res.status(500).json({
        error: 'Failed to retrieve marketplaces',
        details: error.message
      });
    }
  }

  // Get specific marketplace by ID
  static async getMarketplaceById(req, res) {
    try {
      const marketplaceId = parseInt(req.params.id);

      // Check if marketplace exists
      const marketplace = await MarketplaceModel.findById(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({
          error: 'Marketplace not found'
        });
      }

      // For regular users, check if they have access to this marketplace
      if (req.user.role !== 'ADMIN') {
        const userMarketplaces = await MarketplaceModel.findByUserAccess(req.user.userId);
        const hasAccess = userMarketplaces.some(userMarketplace => userMarketplace.id === marketplaceId);
        
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied to this marketplace'
          });
        }
      }

      res.json({
        message: 'Marketplace retrieved successfully',
        marketplace: marketplace
      });
    } catch (error) {
      console.error('Get marketplace by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve marketplace',
        details: error.message
      });
    }
  }

  // Create new marketplace(s) (Admin only) - Supports multiple marketplaces and file upload
  static async createMarketplace(req, res) {
    try {
      let marketplacesToCreate = [];
      let results = {
        created: [],
        errors: [],
        duplicates: []
      };

      // Check if file was uploaded
      if (req.file) {
        // Process file upload from memory buffer
        const FileProcessor = (await import('../utils/fileProcessor.js')).default;
        const fileData = await FileProcessor.processFileBuffer(req.file.buffer, req.file.originalname);
        
        if (fileData.length === 0) {
          return res.status(400).json({
            error: 'File is empty or contains no valid data'
          });
        }

        // Validate file data
        const { validData, errors } = FileProcessor.validateMarketplaceData(fileData);
        
        if (errors.length > 0) {
          return res.status(400).json({
            error: 'File validation failed',
            details: errors
          });
        }

        marketplacesToCreate = validData;
      } else {
        // Handle JSON data (single or multiple marketplaces)
        const { marketplaces, name, description } = req.body;

        if (marketplaces && Array.isArray(marketplaces)) {
          // Multiple marketplaces
          marketplacesToCreate = marketplaces.map(marketplace => ({
            name: marketplace.name?.trim(),
            description: marketplace.description?.trim() || null
          }));
        } else if (name) {
          // Single marketplace - check for duplicates
          const existingMarketplaces = await MarketplaceModel.findAll();
          const existingNames = existingMarketplaces.map(marketplace => marketplace.name.toLowerCase());
          
          if (existingNames.includes(name.toLowerCase())) {
            return res.status(400).json({
              error: 'Duplicate marketplace name',
              message: 'Marketplace name already exists',
              duplicate: {
                name: name,
                error: 'Marketplace name already exists'
              }
            });
          }
          
          marketplacesToCreate = [{
            name: name.trim(),
            description: description?.trim() || null
          }];
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "marketplaces" array, single "name", or upload a file'
          });
        }

        // Validate JSON data
        for (let i = 0; i < marketplacesToCreate.length; i++) {
          if (!marketplacesToCreate[i].name || marketplacesToCreate[i].name === '') {
            return res.status(400).json({
              error: `Marketplace name is required for item ${i + 1}`
            });
          }
        }
      }

      // Check for duplicates before creating
      const existingMarketplaces = await MarketplaceModel.findAll();
      const existingNames = existingMarketplaces.map(marketplace => marketplace.name.toLowerCase());
      
      // Separate unique and duplicate marketplaces
      const uniqueMarketplaces = [];
      const duplicateMarketplaces = [];
      
      for (const marketplaceData of marketplacesToCreate) {
        const marketplaceName = marketplaceData.name.toLowerCase();
        if (existingNames.includes(marketplaceName)) {
          duplicateMarketplaces.push({
            name: marketplaceData.name,
            error: 'Marketplace name already exists'
          });
        } else {
          uniqueMarketplaces.push(marketplaceData);
          existingNames.push(marketplaceName); // Add to list to prevent duplicates within the same batch
        }
      }
      
      // Create only unique marketplaces
      for (const marketplaceData of uniqueMarketplaces) {
        try {
          const marketplace = await MarketplaceModel.create(marketplaceData);
          results.created.push(marketplace);
        } catch (error) {
          results.errors.push({
            name: marketplaceData.name,
            error: error.message
          });
        }
      }
      
      // Add duplicates to results
      results.duplicates = duplicateMarketplaces;

      // Prepare response
      const response = {
        message: `Processed ${marketplacesToCreate.length} marketplace(s)`,
        summary: {
          total: marketplacesToCreate.length,
          created: results.created.length,
          duplicates: results.duplicates.length,
          errors: results.errors.length
        },
        results: results
      };

      // Determine status code
      if (results.created.length === 0) {
        return res.status(400).json({
          ...response,
          message: 'No marketplaces were created'
        });
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Create marketplace error:', error);
      res.status(500).json({
        error: 'Failed to create marketplace(s)',
        details: error.message
      });
    }
  }

  // Update marketplace (Admin only)
  static async updateMarketplace(req, res) {
    try {
      const marketplaceId = parseInt(req.params.id);
      const { name, description } = req.body;

      // Check if marketplace exists
      const existingMarketplace = await MarketplaceModel.findById(marketplaceId);
      if (!existingMarketplace) {
        return res.status(404).json({
          error: 'Marketplace not found'
        });
      }

      const updatedMarketplace = await MarketplaceModel.update(marketplaceId, {
        name,
        description
      });

      res.json({
        message: 'Marketplace updated successfully',
        marketplace: updatedMarketplace
      });
    } catch (error) {
      console.error('Update marketplace error:', error);
      res.status(500).json({
        error: 'Failed to update marketplace',
        details: error.message
      });
    }
  }

  // Delete marketplace (Admin only)
  static async deleteMarketplace(req, res) {
    try {
      const marketplaceId = parseInt(req.params.id);

      // Check if marketplace exists
      const existingMarketplace = await MarketplaceModel.findById(marketplaceId);
      if (!existingMarketplace) {
        return res.status(404).json({
          error: 'Marketplace not found'
        });
      }

      await MarketplaceModel.delete(marketplaceId);

      res.json({
        message: 'Marketplace deleted successfully'
      });
    } catch (error) {
      console.error('Delete marketplace error:', error);
      res.status(500).json({
        error: 'Failed to delete marketplace',
        details: error.message
      });
    }
  }
}

export default MarketplaceController;
