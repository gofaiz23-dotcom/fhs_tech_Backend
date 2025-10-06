import express from 'express';
import AdminController from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { 
  validateId, 
  validateEmailUpdate, 
  validatePasswordUpdate, 
  validateRoleUpdate,
  validateUsernameUpdate 
} from '../middlewares/validation.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// Admin user management routes - 3 separate APIs
router.get('/users/basic', AdminController.getUsersBasic);
router.get('/users/history', AdminController.getUsersWithHistory);
router.get('/users/access', AdminController.getUsersWithAllAccess);

// Get specific user details
router.get('/users/:id', validateId, AdminController.getUserById);
router.put('/users/:id/email', validateId, validateEmailUpdate, AdminController.updateUserEmail);
router.put('/users/:id/username', validateId, validateUsernameUpdate, AdminController.updateUserUsername);
router.put('/users/:id/password', validateId, validatePasswordUpdate, AdminController.updateUserPassword);
router.put('/users/:id/role', validateId, validateRoleUpdate, AdminController.updateUserRole);

export default router;
