import UserModel from '../models/User.js';
import BrandModel from '../models/Brand.js';
import ManagementHistoryModel from '../models/ManagementHistory.js';

class UserActivityController {
  // Log when user accesses a brand
  static async logBrandAccess(req, res) {
    try {
      const userId = req.user.userId;
      const { brandId } = req.params;
      const { action, details } = req.body;

      // Check if user has access to this brand
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if brand exists
      const brand = await BrandModel.findById(parseInt(brandId));
      if (!brand) {
        return res.status(404).json({
          error: 'Brand not found'
        });
      }

      // Check if user has access to this brand
      const hasAccess = await UserModel.checkBrandAccess(userId, parseInt(brandId));
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this brand'
        });
      }

      // Log the user activity
      await ManagementHistoryModel.createProductHistory({
        userId,
        brandId: parseInt(brandId),
        action: action || 'ACCESS',
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Brand access logged successfully',
        activity: {
          userId,
          brandId: parseInt(brandId),
          brandName: brand.name,
          action: action || 'ACCESS',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Log brand access error:', error);
      res.status(500).json({
        error: 'Failed to log brand access',
        details: error.message
      });
    }
  }

  // Log when user adds products to a brand
  static async logProductAdd(req, res) {
    try {
      const userId = req.user.userId;
      const { brandId } = req.params;
      const { productData } = req.body;

      // Check if user has access to this brand
      const hasAccess = await UserModel.checkBrandAccess(userId, parseInt(brandId));
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this brand'
        });
      }

      // Log the product addition
      await ManagementHistoryModel.createProductHistory({
        userId,
        brandId: parseInt(brandId),
        action: 'ADD',
        details: {
          productData,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Product addition logged successfully',
        activity: {
          userId,
          brandId: parseInt(brandId),
          action: 'ADD',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Log product add error:', error);
      res.status(500).json({
        error: 'Failed to log product addition',
        details: error.message
      });
    }
  }

  // Log when user updates products
  static async logProductUpdate(req, res) {
    try {
      const userId = req.user.userId;
      const { brandId } = req.params;
      const { productId, oldData, newData } = req.body;

      // Check if user has access to this brand
      const hasAccess = await UserModel.checkBrandAccess(userId, parseInt(brandId));
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this brand'
        });
      }

      // Log the product update
      await ManagementHistoryModel.createProductHistory({
        userId,
        brandId: parseInt(brandId),
        productId,
        action: 'UPDATE',
        details: {
          oldData,
          newData,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        message: 'Product update logged successfully',
        activity: {
          userId,
          brandId: parseInt(brandId),
          productId,
          action: 'UPDATE',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Log product update error:', error);
      res.status(500).json({
        error: 'Failed to log product update',
        details: error.message
      });
    }
  }

  // Get user's activity history
  static async getUserActivityHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { brandId } = req.query;

      let whereClause = { userId };
      if (brandId) {
        whereClause.brandId = parseInt(brandId);
      }

      const activities = await ManagementHistoryModel.getUserActivityHistory(whereClause);

      res.json({
        message: 'User activity history retrieved successfully',
        activities: activities.map(activity => ({
          id: activity.id,
          brandId: activity.brandId,
          brandName: activity.brand?.name,
          action: activity.action,
          details: activity.details,
          timestamp: activity.createdAt,
          ipAddress: activity.ipAddress
        }))
      });
    } catch (error) {
      console.error('Get user activity history error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user activity history',
        details: error.message
      });
    }
  }

  // Get all user activities (Admin only)
  static async getAllUserActivities(req, res) {
    try {
      const { userId, brandId, action } = req.query;

      let whereClause = {};
      if (userId) whereClause.userId = parseInt(userId);
      if (brandId) whereClause.brandId = parseInt(brandId);
      if (action) whereClause.action = action;

      const activities = await ManagementHistoryModel.getAllUserActivities(whereClause);

      res.json({
        message: 'All user activities retrieved successfully',
        activities: activities.map(activity => ({
          id: activity.id,
          userId: activity.userId,
          user: activity.user,
          brandId: activity.brandId,
          brand: activity.brand,
          action: activity.action,
          details: activity.details,
          timestamp: activity.createdAt,
          ipAddress: activity.ipAddress
        }))
      });
    } catch (error) {
      console.error('Get all user activities error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user activities',
        details: error.message
      });
    }
  }
}

export default UserActivityController;
