import express from 'express';
import UserActivityController from '../controllers/userActivityController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateId } from '../middlewares/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// User activity routes (for regular users)
router.post('/brands/:brandId/access', UserActivityController.logBrandAccess);
router.post('/brands/:brandId/products', UserActivityController.logProductAdd);
router.put('/brands/:brandId/products', UserActivityController.logProductUpdate);
router.get('/activities', UserActivityController.getUserActivityHistory);

// Admin routes (for viewing all user activities)
router.get('/admin/activities', requireAdmin, UserActivityController.getAllUserActivities);

export default router;
