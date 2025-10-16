import express from 'express';
import InventoryController from '../controllers/inventoryController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';

const router = express.Router();

// All inventory routes require authentication
router.use(authenticateToken);

// Inventory routes - 2 APIs
router.get('/', InventoryController.getInventory);                    // 1. Get all inventory (based on user access)
router.put('/:id', validateId, InventoryController.updateInventory);  // 2. Update inventory (quantity, ETA)

export default router;

