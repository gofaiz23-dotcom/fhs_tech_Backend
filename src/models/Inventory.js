import { prisma } from '../config/database.js';

class InventoryModel {
  // Get all inventory with brand access control
  static async findAll(userId, userRole) {
    let whereClause = {};
    
    if (userRole === 'ADMIN') {
      // Admin sees all inventory
      whereClause = {};
    } else if (userId) {
      // Regular user sees only inventory from accessible brands
      whereClause = {
        brand: {
          userBrandAccess: {
            some: {
              userId: userId,
              isActive: true
            }
          }
        }
      };
    } else {
      return [];
    }

    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        listing: {
          select: {
            id: true,
            sku: true,
            title: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return inventory;
  }

  // Update inventory item (only update existing inventory)
  static async update(id, updateData) {
    return await prisma.inventory.update({
      where: { id: parseInt(id) },
      data: updateData
    });
  }
}

export default InventoryModel;

