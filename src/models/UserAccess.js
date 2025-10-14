import { prisma } from '../config/database.js';

class UserAccessModel {
  // Brand Access Methods
  static async createBrandAccess(userId, brandId) {
    return await prisma.userBrandAccess.upsert({
      where: {
        userId_brandId: {
          userId: userId,
          brandId: brandId
        }
      },
      update: {
        isActive: true
      },
      create: {
        userId: userId,
        brandId: brandId,
        isActive: true
      }
    });
  }

  static async toggleBrandAccess(userId, brandId) {
    const existing = await prisma.userBrandAccess.findUnique({
      where: {
        userId_brandId: {
          userId: userId,
          brandId: brandId
        }
      }
    });

    if (existing) {
      return await prisma.userBrandAccess.update({
        where: {
          userId_brandId: {
            userId: userId,
            brandId: brandId
          }
        },
        data: {
          isActive: !existing.isActive
        }
      });
    }

    return await this.createBrandAccess(userId, brandId);
  }

  static async getUserBrandAccess(userId) {
    return await prisma.userBrandAccess.findMany({
      where: { userId: userId },
      include: { brand: true }
    });
  }

  // Marketplace Access Methods
  static async createMarketplaceAccess(userId, marketplaceId) {
    return await prisma.userMarketplaceAccess.upsert({
      where: {
        userId_marketplaceId: {
          userId: userId,
          marketplaceId: marketplaceId
        }
      },
      update: {
        isActive: true
      },
      create: {
        userId: userId,
        marketplaceId: marketplaceId,
        isActive: true
      }
    });
  }

  static async toggleMarketplaceAccess(userId, marketplaceId) {
    const existing = await prisma.userMarketplaceAccess.findUnique({
      where: {
        userId_marketplaceId: {
          userId: userId,
          marketplaceId: marketplaceId
        }
      }
    });

    if (existing) {
      return await prisma.userMarketplaceAccess.update({
        where: {
          userId_marketplaceId: {
            userId: userId,
            marketplaceId: marketplaceId
          }
        },
        data: {
          isActive: !existing.isActive
        }
      });
    }

    return await this.createMarketplaceAccess(userId, marketplaceId);
  }

  static async getUserMarketplaceAccess(userId) {
    return await prisma.userMarketplaceAccess.findMany({
      where: { userId: userId },
      include: { marketplace: true }
    });
  }

  // Shipping Access Methods
  static async createShippingAccess(userId, shippingCompanyId) {
    return await prisma.userShippingAccess.upsert({
      where: {
        userId_shippingCompanyId: {
          userId: userId,
          shippingCompanyId: shippingCompanyId
        }
      },
      update: {
        isActive: true
      },
      create: {
        userId: userId,
        shippingCompanyId: shippingCompanyId,
        isActive: true
      }
    });
  }

  static async toggleShippingAccess(userId, shippingCompanyId) {
    const existing = await prisma.userShippingAccess.findUnique({
      where: {
        userId_shippingCompanyId: {
          userId: userId,
          shippingCompanyId: shippingCompanyId
        }
      }
    });

    if (existing) {
      return await prisma.userShippingAccess.update({
        where: {
          userId_shippingCompanyId: {
            userId: userId,
            shippingCompanyId: shippingCompanyId
          }
        },
        data: {
          isActive: !existing.isActive
        }
      });
    }

    return await this.createShippingAccess(userId, shippingCompanyId);
  }

  static async getUserShippingAccess(userId) {
    return await prisma.userShippingAccess.findMany({
      where: { userId: userId },
      include: { shippingCompany: true }
    });
  }
}

export default UserAccessModel;
