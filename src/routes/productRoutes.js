import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingle, uploadImages, conditionalImageUpload, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All product routes require authentication
router.use(authenticateToken);

// Product routes - 8 APIs
router.get('/', ProductController.getAllProducts);                    // 1. Get all products
router.get('/sku/:sku', ProductController.getProductBySku);          // 2. Get product by individual SKU
router.get('/images/template', ProductController.getImageTemplate);         // 3. Get simple image template (groupSku, subSku, mainImage)
router.post('/', uploadSingle, handleUploadError, ProductController.createProduct); // 4. Add products (single/multiple/CSV/Excel)
router.put('/:id', validateId, ProductController.updateProduct);      // 5. Update product
router.delete('/:id', validateId, ProductController.deleteProduct);   // 6. Delete product
router.delete('/', requireAdmin, ProductController.deleteAllProducts); // 7. Delete all products (Admin only)
router.post('/images', conditionalImageUpload, handleUploadError, ProductController.uploadProductImages); // 8. Upload product images (JSON + Form Data)

export default router;
