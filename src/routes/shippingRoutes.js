import express from 'express';
import ShippingController from '../controllers/shippingController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingle, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All shipping routes require authentication
router.use(authenticateToken);

// Shipping company routes
router.get('/', ShippingController.getAllShippingCompanies);
router.get('/:id', validateId, ShippingController.getShippingCompanyById);

// Admin only routes - Support file upload and multiple shipping companies
router.post('/', requireAdmin, uploadSingle, handleUploadError, ShippingController.createShippingCompany);
router.put('/:id', requireAdmin, validateId, ShippingController.updateShippingCompany);
router.delete('/:id', requireAdmin, validateId, ShippingController.deleteShippingCompany);

export default router;
