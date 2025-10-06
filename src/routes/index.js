import express from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import brandRoutes from './brandRoutes.js';
import marketplaceRoutes from './marketplaceRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import permissionRoutes from './permissionRoutes.js';
import managementHistoryRoutes from './managementHistoryRoutes.js';
import userActivityRoutes from './userActivityRoutes.js';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/brands', brandRoutes);
router.use('/marketplaces', marketplaceRoutes);
router.use('/shipping', shippingRoutes);
router.use('/users', permissionRoutes);
router.use('/management', managementHistoryRoutes);
router.use('/activities', userActivityRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FHS Tech Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// API documentation route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to FHS Tech Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      brands: '/api/brands',
      marketplaces: '/api/marketplaces',
      shipping: '/api/shipping',
      permissions: '/api/users',
      management: '/api/management',
      activities: '/api/activities',
      health: '/api/health'
    }
  });
});

export default router;
