import ManagementHistoryModel from '../models/ManagementHistory.js';

class ManagementLogger {
  // Log User Management Actions
  static async logUserAction(adminId, action, targetUserId = null, details = null, req = null) {
    try {
      const logData = {
        adminId,
        targetUserId,
        action,
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null
      };

      await ManagementHistoryModel.createUserHistory(logData);
    } catch (error) {
      console.error('Failed to log user management action:', error);
    }
  }

  // Log Brand Management Actions
  static async logBrandAction(adminId, action, brandId, details = null, req = null) {
    try {
      const logData = {
        adminId,
        brandId,
        action,
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null
      };

      await ManagementHistoryModel.createBrandHistory(logData);
    } catch (error) {
      console.error('Failed to log brand management action:', error);
    }
  }

  // Log Marketplace Management Actions
  static async logMarketplaceAction(adminId, action, marketplaceId, details = null, req = null) {
    try {
      const logData = {
        adminId,
        marketplaceId,
        action,
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null
      };

      await ManagementHistoryModel.createMarketplaceHistory(logData);
    } catch (error) {
      console.error('Failed to log marketplace management action:', error);
    }
  }

  // Log Shipping Management Actions
  static async logShippingAction(adminId, action, shippingId, details = null, req = null) {
    try {
      const logData = {
        adminId,
        shippingId,
        action,
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null
      };

      await ManagementHistoryModel.createShippingHistory(logData);
    } catch (error) {
      console.error('Failed to log shipping management action:', error);
    }
  }

  // Log Permission Management Actions
  static async logPermissionAction(adminId, action, targetUserId, entityType, entityId, details = null, req = null) {
    try {
      const logData = {
        adminId,
        targetUserId,
        entityType, // BRAND, MARKETPLACE, SHIPPING
        entityId,
        action, // GRANT, REVOKE, TOGGLE
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null
      };

      await ManagementHistoryModel.createPermissionHistory(logData);
    } catch (error) {
      console.error('Failed to log permission management action:', error);
    }
  }

  // Log Product Management Actions
  static async logProductAction(userId, action, productId, brandId, details = null, req = null) {
    try {
      const logData = {
        userId,
        productId,
        brandId,
        action, // CREATE, UPDATE, DELETE, DELETE_ALL, UPDATE_PRICING, UPDATE_IMAGES
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null
      };

      await ManagementHistoryModel.createProductHistory(logData);
    } catch (error) {
      console.error('Failed to log product management action:', error);
    }
  }

  // Log Listing Management Actions
  static async logListingAction(userId, action, listingId, brandId, details = null, req = null) {
    try {
      const logData = {
        userId,
        listingId,
        brandId,
        action, // CREATE, UPDATE, DELETE, DELETE_ALL, BULK_CREATE
        details,
        ipAddress: req?.ip || null,
        userAgent: req?.get('User-Agent') || null
      };

      await ManagementHistoryModel.createListingHistory(logData);
    } catch (error) {
      console.error('Failed to log listing management action:', error);
    }
  }

  // Helper method to create details object
  static createDetailsObject(oldData = null, newData = null, additionalInfo = {}) {
    return {
      oldData,
      newData,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    };
  }
}

export default ManagementLogger;
