import prisma from '../config/database.js';

class MarketplaceModel {
  // Create new marketplace
  static async create(marketplaceData) {
    return await prisma.marketplace.create({
      data: marketplaceData
    });
  }

  // Get all marketplaces
  static async findAll() {
    return await prisma.marketplace.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get marketplaces by user access
  static async findByUserAccess(userId) {
    const userAccess = await prisma.userMarketplaceAccess.findMany({
      where: { 
        userId: userId,
        isActive: true 
      },
      include: { marketplace: true }
    });
    
    return userAccess.map(access => access.marketplace);
  }

  // Find marketplace by ID
  static async findById(id) {
    return await prisma.marketplace.findUnique({
      where: { id }
    });
  }

  // Update marketplace
  static async update(id, marketplaceData) {
    return await prisma.marketplace.update({
      where: { id },
      data: marketplaceData
    });
  }

  // Delete marketplace
  static async delete(id) {
    return await prisma.marketplace.delete({
      where: { id }
    });
  }

  // Check if marketplace exists
  static async exists(id) {
    const marketplace = await prisma.marketplace.findUnique({
      where: { id },
      select: { id: true }
    });
    return !!marketplace;
  }
}

export default MarketplaceModel;
