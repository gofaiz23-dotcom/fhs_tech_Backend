import express from 'express';
import InventoryController from '../controllers/inventoryController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';
import { uploadSingleHybrid, handleUploadError } from '../middlewares/upload.js';

const router = express.Router();

// All inventory routes require authentication
router.use(authenticateToken);

// Inventory routes
router.get('/', InventoryController.getInventory);                    // 1. Get all inventory (based on user access)
router.put('/:id', validateId, InventoryController.updateInventory);  // 2. Update inventory (quantity, ETA)
router.post('/bulk/inventory/updates', uploadSingleHybrid, handleUploadError, InventoryController.bulkUpdateInventory); // 3. Bulk update inventory - Excel/CSV - Unlimited with background processing
router.get('/status', InventoryController.getBulkStatus);   // 4. Get bulk inventory update status (all background jobs)

export default router;

