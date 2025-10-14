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

  // Get all marketplaces with pagination
  static async findAllWithPagination(offset, limit) {
    const [marketplaces, totalCount] = await Promise.all([
      prisma.marketplace.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.marketplace.count()
    ]);

    return {
      marketplaces,
      totalCount
    };
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

  // Get marketplaces by user access with pagination
  static async findByUserAccessWithPagination(userId, offset, limit) {
    const [userAccess, totalCount] = await Promise.all([
      prisma.userMarketplaceAccess.findMany({
        where: { 
          userId: userId,
          isActive: true 
        },
        include: { marketplace: true },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.userMarketplaceAccess.count({
        where: { 
          userId: userId,
          isActive: true 
        }
      })
    ]);
    
    return {
      marketplaces: userAccess.map(access => access.marketplace),
      totalCount
    };
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
