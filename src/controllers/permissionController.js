import UserAccessModel from '../models/UserAccess.js';
import BrandModel from '../models/Brand.js';
import MarketplaceModel from '../models/Marketplace.js';
import ShippingCompanyModel from '../models/ShippingCompany.js';
import UserModel from '../models/User.js';

class PermissionController {
  // Brand Access Methods
  static async getUserBrandAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const brandAccess = await UserAccessModel.getUserBrandAccess(userId);

      res.json({
        message: 'User brand access retrieved successfully',
        brandAccess: brandAccess.map(access => ({
          id: access.brand.id,
          name: access.brand.name,
          description: access.brand.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        }))
      });
    } catch (error) {
      console.error('Get user brand access error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user brand access',
        details: error.message
      });
    }
  }

  static async grantBrandAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { brandId } = req.body;

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if brand exists
      const brand = await BrandModel.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          error: 'Brand not found'
        });
      }

      const access = await UserAccessModel.createBrandAccess(userId, brandId);

      res.status(201).json({
        message: 'Brand access granted successfully',
        access: {
          userId: access.userId,
          brandId: access.brandId,
          isActive: access.isActive,
          grantedAt: access.createdAt
        }
      });
    } catch (error) {
      console.error('Grant brand access error:', error);
      res.status(500).json({
        error: 'Failed to grant brand access',
        details: error.message
      });
    }
  }

  static async toggleBrandAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const brandId = parseInt(req.params.brandId);

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if brand exists
      const brand = await BrandModel.findById(brandId);
      if (!brand) {
        return res.status(404).json({
          error: 'Brand not found'
        });
      }

      const access = await UserAccessModel.toggleBrandAccess(userId, brandId);

      res.json({
        message: `Brand access ${access.isActive ? 'enabled' : 'disabled'} successfully`,
        access: {
          userId: access.userId,
          brandId: access.brandId,
          isActive: access.isActive,
          updatedAt: access.createdAt
        }
      });
    } catch (error) {
      console.error('Toggle brand access error:', error);
      res.status(500).json({
        error: 'Failed to toggle brand access',
        details: error.message
      });
    }
  }

  // Marketplace Access Methods
  static async getUserMarketplaceAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const marketplaceAccess = await UserAccessModel.getUserMarketplaceAccess(userId);

      res.json({
        message: 'User marketplace access retrieved successfully',
        marketplaceAccess: marketplaceAccess.map(access => ({
          id: access.marketplace.id,
          name: access.marketplace.name,
          description: access.marketplace.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        }))
      });
    } catch (error) {
      console.error('Get user marketplace access error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user marketplace access',
        details: error.message
      });
    }
  }

  static async grantMarketplaceAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { marketplaceId } = req.body;

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if marketplace exists
      const marketplace = await MarketplaceModel.findById(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({
          error: 'Marketplace not found'
        });
      }

      const access = await UserAccessModel.createMarketplaceAccess(userId, marketplaceId);

      res.status(201).json({
        message: 'Marketplace access granted successfully',
        access: {
          userId: access.userId,
          marketplaceId: access.marketplaceId,
          isActive: access.isActive,
          grantedAt: access.createdAt
        }
      });
    } catch (error) {
      console.error('Grant marketplace access error:', error);
      res.status(500).json({
        error: 'Failed to grant marketplace access',
        details: error.message
      });
    }
  }

  static async toggleMarketplaceAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const marketplaceId = parseInt(req.params.marketplaceId);

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if marketplace exists
      const marketplace = await MarketplaceModel.findById(marketplaceId);
      if (!marketplace) {
        return res.status(404).json({
          error: 'Marketplace not found'
        });
      }

      const access = await UserAccessModel.toggleMarketplaceAccess(userId, marketplaceId);

      res.json({
        message: `Marketplace access ${access.isActive ? 'enabled' : 'disabled'} successfully`,
        access: {
          userId: access.userId,
          marketplaceId: access.marketplaceId,
          isActive: access.isActive,
          updatedAt: access.createdAt
        }
      });
    } catch (error) {
      console.error('Toggle marketplace access error:', error);
      res.status(500).json({
        error: 'Failed to toggle marketplace access',
        details: error.message
      });
    }
  }

  // Shipping Access Methods
  static async getUserShippingAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      const shippingAccess = await UserAccessModel.getUserShippingAccess(userId);

      res.json({
        message: 'User shipping access retrieved successfully',
        shippingAccess: shippingAccess.map(access => ({
          id: access.shippingCompany.id,
          name: access.shippingCompany.name,
          description: access.shippingCompany.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        }))
      });
    } catch (error) {
      console.error('Get user shipping access error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user shipping access',
        details: error.message
      });
    }
  }

  static async grantShippingAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { shippingCompanyId } = req.body;

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if shipping company exists
      const shippingCompany = await ShippingCompanyModel.findById(shippingCompanyId);
      if (!shippingCompany) {
        return res.status(404).json({
          error: 'Shipping company not found'
        });
      }

      const access = await UserAccessModel.createShippingAccess(userId, shippingCompanyId);

      res.status(201).json({
        message: 'Shipping access granted successfully',
        access: {
          userId: access.userId,
          shippingCompanyId: access.shippingCompanyId,
          isActive: access.isActive,
          grantedAt: access.createdAt
        }
      });
    } catch (error) {
      console.error('Grant shipping access error:', error);
      res.status(500).json({
        error: 'Failed to grant shipping access',
        details: error.message
      });
    }
  }

  static async toggleShippingAccess(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const shippingId = parseInt(req.params.shippingId);

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if shipping company exists
      const shippingCompany = await ShippingCompanyModel.findById(shippingId);
      if (!shippingCompany) {
        return res.status(404).json({
          error: 'Shipping company not found'
        });
      }

      const access = await UserAccessModel.toggleShippingAccess(userId, shippingId);

      res.json({
        message: `Shipping access ${access.isActive ? 'enabled' : 'disabled'} successfully`,
        access: {
          userId: access.userId,
          shippingCompanyId: access.shippingCompanyId,
          isActive: access.isActive,
          updatedAt: access.createdAt
        }
      });
    } catch (error) {
      console.error('Toggle shipping access error:', error);
      res.status(500).json({
        error: 'Failed to toggle shipping access',
        details: error.message
      });
    }
  }
}

export default PermissionController;
