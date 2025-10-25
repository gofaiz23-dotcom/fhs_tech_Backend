import express from 'express';
import ShippingCalculatorController from '../controllers/shippingCalculatorController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

// All shipping calculator routes require authentication
router.use(authenticateToken);

// GET /api/shipping-calculator - Get all shipping values (LTL and PARCEL)
router.get('/', ShippingCalculatorController.getAllShippingValues);

// PUT /api/shipping-calculator/ltl - Update LTL values
router.put('/ltl', ShippingCalculatorController.updateLTLValues);

// PUT /api/shipping-calculator/parcel - Update PARCEL values
router.put('/parcel', ShippingCalculatorController.updateParcelValues);

// GET /api/shipping-calculator/status - Get all status information
router.get('/status', ShippingCalculatorController.getStatus);

export default router;
