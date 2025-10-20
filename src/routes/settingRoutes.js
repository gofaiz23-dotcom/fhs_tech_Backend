import express from 'express';
import SettingController from '../controllers/settingController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// All setting routes require authentication
router.use(authenticateToken);

// Setting routes - 4 APIs
router.get('/', SettingController.getSettings);           // 1. Get all settings
router.put('/', requireAdmin, SettingController.updateSettings);  // 2. Update settings (Admin only)

// Brand name mapping routes
router.get('/brands', SettingController.getBrands);       // 3. Get all brands from listings
router.post('/brands', requireAdmin, SettingController.updateBrands);  // 4. Update brand mappings and apply to all listings (Admin only)

export default router;

