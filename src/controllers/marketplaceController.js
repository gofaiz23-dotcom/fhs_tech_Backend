import MarketplaceModel from '../models/Marketplace.js';

class MarketplaceController {
  // Get all marketplaces (filtered by user access for regular users)
  static async getAllMarketplaces(req, res) {
    try {
      let marketplaces;

      if (req.user.role === 'ADMIN') {
        // Admin sees all marketplaces
        marketplaces = await MarketplaceModel.findAll();
      } else {
        // Regular user sees only accessible marketplaces
        marketplaces = await MarketplaceModel.findByUserAccess(req.user.userId);
      }

      res.json({
        message: 'Marketplaces retrieved successfully',
        marketplaces: marketplaces
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
          // Single marketplace
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

      // Create marketplaces one by one to handle duplicates
      for (const marketplaceData of marketplacesToCreate) {
        try {
          const marketplace = await MarketplaceModel.create(marketplaceData);
          results.created.push(marketplace);
        } catch (error) {
          if (error.code === 'P2002') {
            // Duplicate entry
            results.duplicates.push({
              name: marketplaceData.name,
              error: 'Marketplace name already exists'
            });
          } else {
            results.errors.push({
              name: marketplaceData.name,
              error: error.message
            });
          }
        }
      }

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
