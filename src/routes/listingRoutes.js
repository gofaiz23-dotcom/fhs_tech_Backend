import express from 'express';
import ListingController from '../controllers/listingController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingleHybrid, uploadFileAndImages, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All listing routes require authentication
router.use(authenticateToken);

// Listing routes
router.get('/', ListingController.getAllListings);                    // 1. Get all listings (with pagination, filters)
router.get('/images/template', ListingController.getImageTemplate);   // 2. Get image template (sku, subSku, mainImageUrl, galleryImages)
router.post('/', uploadFileAndImages, handleUploadError, ListingController.createListing); // 3. Create listings (single/multiple/CSV/Excel) + image files/URLs - Unlimited with background processing
router.put('/:id', validateId, ListingController.updateListing);      // 4. Update listing
router.delete('/:id', validateId, ListingController.deleteListing);   // 5. Delete listing
router.delete('/', requireAdmin, ListingController.deleteAllListings); // 6. Delete all listings (Admin only)
router.put('/images', uploadSingleHybrid, handleUploadError, ListingController.bulkUploadListingImages); // 7. Upload listing images - Excel/JSON with image URLs - Unlimited with background processing
router.get('/status', ListingController.getBulkStatus); // 8. Get bulk processing status (all background jobs for all listings)
router.delete('/cancel/:jobId', ListingController.cancelJob); // 9. Cancel background job (user can cancel own, admin can cancel any)

export default router;

