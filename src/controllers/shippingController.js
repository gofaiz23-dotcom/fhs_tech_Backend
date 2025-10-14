import ShippingCompanyModel from '../models/ShippingCompany.js';

class ShippingController {
  // Get all shipping companies with pagination (filtered by user access for regular users)
  static async getAllShippingCompanies(req, res) {
    try {
      // Extract pagination parameters from query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      let result;

      if (req.user.role === 'ADMIN') {
        // Admin sees all shipping companies with pagination
        result = await ShippingCompanyModel.findAllWithPagination(offset, limit);
      } else {
        // Regular user sees only accessible shipping companies with pagination
        result = await ShippingCompanyModel.findByUserAccessWithPagination(req.user.userId, offset, limit);
      }

      res.json({
        message: 'Shipping companies retrieved successfully',
        shippingCompanies: result.shippingCompanies,
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
      console.error('Get all shipping companies error:', error);
      res.status(500).json({
        error: 'Failed to retrieve shipping companies',
        details: error.message
      });
    }
  }

  // Get specific shipping company by ID
  static async getShippingCompanyById(req, res) {
    try {
      const shippingId = parseInt(req.params.id);

      // Check if shipping company exists
      const shippingCompany = await ShippingCompanyModel.findById(shippingId);
      if (!shippingCompany) {
        return res.status(404).json({
          error: 'Shipping company not found'
        });
      }

      // For regular users, check if they have access to this shipping company
      if (req.user.role !== 'ADMIN') {
        const userShippingCompanies = await ShippingCompanyModel.findByUserAccess(req.user.userId);
        const hasAccess = userShippingCompanies.some(userShipping => userShipping.id === shippingId);
        
        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied to this shipping company'
          });
        }
      }

      res.json({
        message: 'Shipping company retrieved successfully',
        shippingCompany: shippingCompany
      });
    } catch (error) {
      console.error('Get shipping company by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve shipping company',
        details: error.message
      });
    }
  }

  // Create new shipping company(s) (Admin only) - Supports multiple companies and file upload
  static async createShippingCompany(req, res) {
    try {
      let shippingCompaniesToCreate = [];
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
        const { validData, errors } = FileProcessor.validateShippingData(fileData);
        
        if (errors.length > 0) {
          return res.status(400).json({
            error: 'File validation failed',
            details: errors
          });
        }

        shippingCompaniesToCreate = validData;
      } else {
        // Handle JSON data (single or multiple shipping companies)
        const { shippingCompanies, name, description } = req.body;

        if (shippingCompanies && Array.isArray(shippingCompanies)) {
          // Multiple shipping companies
          shippingCompaniesToCreate = shippingCompanies.map(company => ({
            name: company.name?.trim(),
            description: company.description?.trim() || null
          }));
        } else if (name) {
          // Single shipping company - check for duplicates
          const existingShippingCompanies = await ShippingCompanyModel.findAll();
          const existingNames = existingShippingCompanies.map(company => company.name.toLowerCase());
          
          if (existingNames.includes(name.toLowerCase())) {
            return res.status(400).json({
              error: 'Duplicate shipping company name',
              message: 'Shipping company name already exists',
              duplicate: {
                name: name,
                error: 'Shipping company name already exists'
              }
            });
          }
          
          shippingCompaniesToCreate = [{
            name: name.trim(),
            description: description?.trim() || null
          }];
        } else {
          return res.status(400).json({
            error: 'Invalid request format',
            message: 'Provide either "shippingCompanies" array, single "name", or upload a file'
          });
        }

        // Validate JSON data
        for (let i = 0; i < shippingCompaniesToCreate.length; i++) {
          if (!shippingCompaniesToCreate[i].name || shippingCompaniesToCreate[i].name === '') {
            return res.status(400).json({
              error: `Shipping company name is required for item ${i + 1}`
            });
          }
        }
      }

      // Check for duplicates before creating
      const existingShippingCompanies = await ShippingCompanyModel.findAll();
      const existingNames = existingShippingCompanies.map(company => company.name.toLowerCase());
      
      // Separate unique and duplicate shipping companies
      const uniqueShippingCompanies = [];
      const duplicateShippingCompanies = [];
      
      for (const companyData of shippingCompaniesToCreate) {
        const companyName = companyData.name.toLowerCase();
        if (existingNames.includes(companyName)) {
          duplicateShippingCompanies.push({
            name: companyData.name,
            error: 'Shipping company name already exists'
          });
        } else {
          uniqueShippingCompanies.push(companyData);
          existingNames.push(companyName); // Add to list to prevent duplicates within the same batch
        }
      }
      
      // Create only unique shipping companies
      for (const companyData of uniqueShippingCompanies) {
        try {
          const shippingCompany = await ShippingCompanyModel.create(companyData);
          results.created.push(shippingCompany);
        } catch (error) {
          results.errors.push({
            name: companyData.name,
            error: error.message
          });
        }
      }
      
      // Add duplicates to results
      results.duplicates = duplicateShippingCompanies;

      // Prepare response
      const response = {
        message: `Processed ${shippingCompaniesToCreate.length} shipping company(s)`,
        summary: {
          total: shippingCompaniesToCreate.length,
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
          message: 'No shipping companies were created'
        });
      }

      res.status(201).json(response);
    } catch (error) {
      console.error('Create shipping company error:', error);
      res.status(500).json({
        error: 'Failed to create shipping company(s)',
        details: error.message
      });
    }
  }

  // Update shipping company (Admin only)
  static async updateShippingCompany(req, res) {
    try {
      const shippingId = parseInt(req.params.id);
      const { name, description } = req.body;

      // Check if shipping company exists
      const existingShippingCompany = await ShippingCompanyModel.findById(shippingId);
      if (!existingShippingCompany) {
        return res.status(404).json({
          error: 'Shipping company not found'
        });
      }

      const updatedShippingCompany = await ShippingCompanyModel.update(shippingId, {
        name,
        description
      });

      res.json({
        message: 'Shipping company updated successfully',
        shippingCompany: updatedShippingCompany
      });
    } catch (error) {
      console.error('Update shipping company error:', error);
      res.status(500).json({
        error: 'Failed to update shipping company',
        details: error.message
      });
    }
  }

  // Delete shipping company (Admin only)
  static async deleteShippingCompany(req, res) {
    try {
      const shippingId = parseInt(req.params.id);

      // Check if shipping company exists
      const existingShippingCompany = await ShippingCompanyModel.findById(shippingId);
      if (!existingShippingCompany) {
        return res.status(404).json({
          error: 'Shipping company not found'
        });
      }

      await ShippingCompanyModel.delete(shippingId);

      res.json({
        message: 'Shipping company deleted successfully'
      });
    } catch (error) {
      console.error('Delete shipping company error:', error);
      res.status(500).json({
        error: 'Failed to delete shipping company',
        details: error.message
      });
    }
  }
}

export default ShippingController;
