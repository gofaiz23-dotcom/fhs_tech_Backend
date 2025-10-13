import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingle, uploadImages, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All product routes require authentication
router.use(authenticateToken);

// Product routes - 6 APIs
router.get('/', ProductController.getAllProducts);                    // 1. Get all products
router.post('/', uploadSingle, handleUploadError, ProductController.createProduct); // 2. Add products (single/multiple/CSV/Excel)
router.put('/:id', validateId, ProductController.updateProduct);      // 3. Update product
router.delete('/:id', validateId, ProductController.deleteProduct);   // 4. Delete product
router.delete('/', requireAdmin, ProductController.deleteAllProducts); // 5. Delete all products (Admin only)
router.post('/images', uploadImages, handleUploadError, ProductController.uploadProductImages); // 6. Upload product images

export default router;
