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
router.get('/status', ProductController.getBulkStatus); // 4. Get bulk processing status (all background jobs for all products)
router.post('/', uploadFileAndImages, handleUploadError, ProductController.bulkCreateProducts); // 5. Add products (single/multiple/CSV/Excel) + image files/URLs - Unlimited with background processing
router.put('/images', uploadSingleHybrid, handleUploadError, ProductController.bulkUploadProductImages); // 6. Upload product images - Excel/JSON with image URLs - Unlimited with background processing
router.put('/:id', uploadFileAndImages, handleUploadError, validateId, ProductController.updateProduct);     // 7. Update product (with file upload support)
router.delete('/cancel/:jobId', ProductController.cancelJob); // 8. Cancel background job (user can cancel own, admin can cancel any)
router.delete('/:id', validateId, ProductController.deleteProduct);  // 9. Delete product
router.delete('/', requireAdmin, ProductController.deleteAllProducts); // 10. Delete all products (Admin only)

export default router;
