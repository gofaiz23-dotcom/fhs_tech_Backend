import express from 'express';
import BrandController from '../controllers/brandController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingle, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All brand routes require authentication
router.use(authenticateToken);

// Brand routes
router.get('/', BrandController.getAllBrands);
router.get('/:id', validateId, BrandController.getBrandById);

// Admin only routes - Support file upload and multiple brands
router.post('/', requireAdmin, uploadSingle, handleUploadError, BrandController.createBrand);
router.put('/:id', requireAdmin, validateId, BrandController.updateBrand);
router.delete('/:id', requireAdmin, validateId, BrandController.deleteBrand);

export default router;
