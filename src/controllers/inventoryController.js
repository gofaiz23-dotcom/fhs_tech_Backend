import InventoryModel from '../models/Inventory.js';
import { prisma } from '../config/database.js';

class InventoryController {
  // API 1: Get all inventory (based on user access)
  static async getInventory(req, res) {
    try {
      console.log('🔍 User Access Check:', {
        userId: req.user.userId,
        role: req.user.role,
        email: req.user.email
      });

      const inventory = await InventoryModel.findAll(req.user.userId, req.user.role);

      console.log('📦 Inventory Found:', {
        totalItems: inventory.length,
        userRole: req.user.role,
        userId: req.user.userId
      });

      res.json({
        message: 'Inventory retrieved successfully',
        userAccess: {
          userId: req.user.userId,
          role: req.user.role,
          email: req.user.email
        },
        timestamp: new Date().toISOString(),
        totalItems: inventory.length,
        inventory: inventory
      });
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({
        error: 'Failed to retrieve inventory',
        details: error.message
      });
    }
  }

  // API 2: Update inventory (quantity and ETA)
  static async updateInventory(req, res) {
    try {
      const inventoryId = parseInt(req.params.id);
      const { quantity, eta } = req.body;

      // Check if inventory item exists
      const existingItem = await prisma.inventory.findUnique({
        where: { id: inventoryId },
        include: {
          brand: true,
          listing: true
        }
      });

      if (!existingItem) {
        return res.status(404).json({
          error: 'Inventory item not found'
        });
      }

      // Check user access to brand (for non-admin users)
      if (req.user.role !== 'ADMIN') {
        const hasAccess = await prisma.userBrandAccess.findFirst({
          where: {
            userId: req.user.userId,
            brandId: existingItem.brandId,
            isActive: true
          }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Access denied',
            message: `You don't have access to inventory from brand: ${existingItem.brand.name}`
          });
        }
      }

      const updateData = {};
      if (quantity !== undefined) updateData.quantity = quantity;
      if (eta !== undefined) updateData.eta = eta;

      const updatedItem = await InventoryModel.update(inventoryId, updateData);

      res.json({
        message: 'Inventory updated successfully',
        timestamp: new Date().toISOString(),
        inventory: updatedItem
      });
    } catch (error) {
      console.error('Update inventory error:', error);
      res.status(500).json({
        error: 'Failed to update inventory',
        details: error.message
      });
    }
  }
}

export default InventoryController;

