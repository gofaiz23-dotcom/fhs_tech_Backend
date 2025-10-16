import express from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import brandRoutes from './brandRoutes.js';
import marketplaceRoutes from './marketplaceRoutes.js';
import shippingRoutes from './shippingRoutes.js';
import productRoutes from './productRoutes.js';
import productPricingRoutes from './productPricingRoutes.js';
import listingRoutes from './listingRoutes.js';
import settingRoutes from './settingRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import permissionRoutes from './permissionRoutes.js';
import managementHistoryRoutes from './managementHistoryRoutes.js';
import userActivityRoutes from './userActivityRoutes.js';
import dbConnection from '../config/database.js';

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/brands', brandRoutes);
router.use('/marketplaces', marketplaceRoutes);
router.use('/shipping', shippingRoutes);
router.use('/products', productRoutes);
router.use('/products/pricing', productPricingRoutes);
router.use('/listings', listingRoutes);
router.use('/settings', settingRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/users', permissionRoutes);
router.use('/management', managementHistoryRoutes);
router.use('/activities', userActivityRoutes);

// Health check route
router.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbConnection.healthCheck();
    const poolMetrics = await dbConnection.getPoolMetrics();
    
    res.json({
      status: 'OK',
      message: 'FHS Tech Backend API is running',
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth.status,
        connected: dbHealth.connected
      },
      connectionPool: {
        connected: poolMetrics.connected,
        attempts: poolMetrics.attempts,
        timestamp: poolMetrics.timestamp
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Connection pool metrics route (for monitoring)
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await dbConnection.getPoolMetrics();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Failed to get metrics',
      error: error.message
    });
  }
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
      products: '/api/products',
      listings: '/api/listings',
      settings: '/api/settings',
      inventory: '/api/inventory',
      permissions: '/api/users',
      management: '/api/management',
      activities: '/api/activities',
      health: '/api/health'
    }
  });
});

export default router;
