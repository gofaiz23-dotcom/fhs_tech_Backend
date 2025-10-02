import express from 'express';
import PermissionController from '../controllers/permissionController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { 
  validateId, 
  validateBrandId, 
  validateMarketplaceId, 
  validateShippingId,
  validatePermissionGrant 
} from '../middlewares/validation.js';

const router = express.Router();

// All permission routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// Brand access routes
router.get('/:id/brands', validateId, PermissionController.getUserBrandAccess);
router.post('/:id/brands', validateId, validatePermissionGrant, PermissionController.grantBrandAccess);
router.post('/:id/brands/:brandId/toggle', validateId, validateBrandId, PermissionController.toggleBrandAccess);

// Marketplace access routes
router.get('/:id/marketplaces', validateId, PermissionController.getUserMarketplaceAccess);
router.post('/:id/marketplaces', validateId, validatePermissionGrant, PermissionController.grantMarketplaceAccess);
router.post('/:id/marketplaces/:marketplaceId/toggle', validateId, validateMarketplaceId, PermissionController.toggleMarketplaceAccess);

// Shipping access routes
router.get('/:id/shipping', validateId, PermissionController.getUserShippingAccess);
router.post('/:id/shipping', validateId, validatePermissionGrant, PermissionController.grantShippingAccess);
router.post('/:id/shipping/:shippingId/toggle', validateId, validateShippingId, PermissionController.toggleShippingAccess);

export default router;
