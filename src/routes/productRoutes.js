import express from 'express';
import ProductController from '../controllers/productController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingleHybrid, uploadFileAndImages, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All product routes require authentication
router.use(authenticateToken);

// Product routes
router.get('/', ProductController.getAllProducts);                    // 1. Get all products
router.get('/sku/:sku', ProductController.getProductBySku);          // 2. Get product by individual SKU
router.get('/images/template', ProductController.getImageTemplate);  // 3. Get simple image template (groupSku, subSku, mainImage)
router.post('/', uploadFileAndImages, handleUploadError, ProductController.bulkCreateProducts); // 4. Add products (single/multiple/CSV/Excel) + image files/URLs - Unlimited with background processing
router.put('/:id', validateId, ProductController.updateProduct);     // 5. Update product
router.delete('/:id', validateId, ProductController.deleteProduct);  // 6. Delete product
router.delete('/', requireAdmin, ProductController.deleteAllProducts); // 7. Delete all products (Admin only)
router.put('/images', uploadSingleHybrid, handleUploadError, ProductController.bulkUploadProductImages); // 8. Upload product images - Excel/JSON with image URLs - Unlimited with background processing
router.get('/status', ProductController.getBulkStatus); // 9. Get bulk processing status (all background jobs for all products)
router.delete('/cancel/:jobId', ProductController.cancelJob); // 10. Cancel background job (user can cancel own, admin can cancel any)

export default router;
