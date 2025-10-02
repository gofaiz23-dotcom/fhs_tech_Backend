import express from 'express';
import MarketplaceController from '../controllers/marketplaceController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingle, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All marketplace routes require authentication
router.use(authenticateToken);

// Marketplace routes
router.get('/', MarketplaceController.getAllMarketplaces);
router.get('/:id', validateId, MarketplaceController.getMarketplaceById);

// Admin only routes - Support file upload and multiple marketplaces
router.post('/', requireAdmin, uploadSingle, handleUploadError, MarketplaceController.createMarketplace);
router.put('/:id', requireAdmin, validateId, MarketplaceController.updateMarketplace);
router.delete('/:id', requireAdmin, validateId, MarketplaceController.deleteMarketplace);

export default router;
