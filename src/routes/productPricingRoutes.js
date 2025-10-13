import express from 'express';
import ProductPricingController from '../controllers/productPricingController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';

const router = express.Router();

// All pricing routes require authentication
router.use(authenticateToken);

// Product Pricing Routes
router.get('/all', ProductPricingController.getAllProductsPricing);           // Get all products with pricing summary
router.get('/:id', validateId, ProductPricingController.getProductPricing);   // Get specific product pricing details
router.put('/:id', validateId, ProductPricingController.updateProductPricing); // Update product pricing

// Two Separate APIs for Bulk Updates
router.put('/update-ecommerce-all', requireAdmin, ProductPricingController.updateEcommerceAll);     // Bulk update ecommerce pricing
router.put('/update-brand-misc-all', requireAdmin, ProductPricingController.updateBrandMiscAll);    // Bulk update brand miscellaneous

export default router;
