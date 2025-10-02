import express from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken, requireAdmin } from '../middlewares/auth.js';
import { validateUserRegistration, validateUserLogin } from '../middlewares/validation.js';

const router = express.Router();

// Authentication routes
router.post('/register', validateUserRegistration, AuthController.register);
router.post('/login', validateUserLogin, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/profile', authenticateToken, AuthController.getProfile);

export default router;





