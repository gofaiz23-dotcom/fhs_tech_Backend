import express from 'express';
import ProductPricingController from '../controllers/productPricingController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';

const router = express.Router();

// All pricing routes require authentication
router.use(authenticateToken);

// Product Pricing Routes - Only 3 APIs
router.get('/all', ProductPricingController.getAllProductsPricing);           // 1. Get all products with pricing summary
router.get('/:id', validateId, ProductPricingController.getProductPricing);   // 2. Get specific product pricing details
router.put('/updatePricing', ProductPricingController.updateProductPricing); // 3. Update product pricing (single + bulk, only if product exists)

export default router;
