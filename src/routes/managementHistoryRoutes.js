import express from 'express';
import ManagementHistoryController from '../controllers/ManagementHistoryController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get all management history
router.get('/history', ManagementHistoryController.getAllManagementHistory);

// Get management history summary
router.get('/history/summary', ManagementHistoryController.getManagementHistorySummary);

export default router;
