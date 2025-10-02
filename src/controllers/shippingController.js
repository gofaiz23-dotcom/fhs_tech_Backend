import ShippingCompanyModel from '../models/ShippingCompany.js';

class ShippingController {
  // Get all shipping companies (filtered by user access for regular users)
  static async getAllShippingCompanies(req, res) {
    try {
      let shippingCompanies;

      if (req.user.role === 'ADMIN') {
        // Admin sees all shipping companies
        shippingCompanies = await ShippingCompanyModel.findAll();
      } else {
        // Regular user sees only accessible shipping companies
        shippingCompanies = await ShippingCompanyModel.findByUserAccess(req.user.userId);
      }

      res.json({
        message: 'Shipping companies retrieved successfully',
        shippingCompanies: shippingCompanies
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
          // Single shipping company
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

      // Create shipping companies one by one to handle duplicates
      for (const companyData of shippingCompaniesToCreate) {
        try {
          const shippingCompany = await ShippingCompanyModel.create(companyData);
          results.created.push(shippingCompany);
        } catch (error) {
          if (error.code === 'P2002') {
            // Duplicate entry
            results.duplicates.push({
              name: companyData.name,
              error: 'Shipping company name already exists'
            });
          } else {
            results.errors.push({
              name: companyData.name,
              error: error.message
            });
          }
        }
      }

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
