import express from 'express';
import SettingController from '../controllers/settingController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// All setting routes require authentication
router.use(authenticateToken);

// Setting routes - 2 APIs
router.get('/', SettingController.getSettings);           // 1. Get all settings
router.put('/', requireAdmin, SettingController.updateSettings);  // 2. Update settings (Admin only)

export default router;

