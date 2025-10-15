import express from 'express';
import ListingController from '../controllers/listingController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingleHybrid, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All listing routes require authentication
router.use(authenticateToken);

// Listing routes - 5 APIs
router.get('/', ListingController.getAllListings);                    // 1. Get all listings (with pagination, filters)
router.post('/', uploadSingleHybrid, handleUploadError, ListingController.createListing); // 2. Create listings (single/multiple/CSV/Excel) - Product must exist!
router.put('/:id', validateId, ListingController.updateListing);      // 3. Update listing
router.delete('/:id', validateId, ListingController.deleteListing);   // 4. Delete listing
router.delete('/', requireAdmin, ListingController.deleteAllListings); // 5. Delete all listings (Admin only)

export default router;

