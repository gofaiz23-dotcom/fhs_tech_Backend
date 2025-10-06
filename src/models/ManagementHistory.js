import prisma from '../config/database.js';

class ManagementHistoryModel {
  // User Management History
  static async createUserHistory(historyData) {
    return await prisma.userManagementHistory.create({
      data: historyData,
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        targetUser: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  // Brand Management History
  static async createBrandHistory(historyData) {
    return await prisma.brandManagementHistory.create({
      data: historyData,
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  // Marketplace Management History
  static async createMarketplaceHistory(historyData) {
    return await prisma.marketplaceManagementHistory.create({
      data: historyData,
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        marketplace: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  // Shipping Management History
  static async createShippingHistory(historyData) {
    return await prisma.shippingManagementHistory.create({
      data: historyData,
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        shipping: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  // Permission Management History
  static async createPermissionHistory(historyData) {
    return await prisma.permissionManagementHistory.create({
      data: historyData,
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        targetUser: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  // Product Management History (Future)
  static async createProductHistory(historyData) {
    return await prisma.productManagementHistory.create({
      data: historyData,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });
  }

  // Get All Management History (Admin Only)
  static async getAllManagementHistory() {
    const [userHistory, brandHistory, marketplaceHistory, shippingHistory, permissionHistory, productHistory] = await Promise.all([
      // User Management History
      prisma.userManagementHistory.findMany({
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          },
          targetUser: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Brand Management History
      prisma.brandManagementHistory.findMany({
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Marketplace Management History
      prisma.marketplaceManagementHistory.findMany({
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          },
          marketplace: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Shipping Management History
      prisma.shippingManagementHistory.findMany({
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          },
          shipping: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // Permission Management History
      prisma.permissionManagementHistory.findMany({
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          },
          targetUser: {
            select: {
              id: true,
              username: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      userManagement: userHistory.map(history => ({
        id: history.id,
        type: 'USER_MANAGEMENT',
        action: history.action,
        admin: history.admin,
        targetUser: history.targetUser,
        details: history.details,
        ipAddress: history.ipAddress,
        userAgent: history.userAgent,
        createdAt: history.createdAt
      })),
      brandManagement: brandHistory.map(history => ({
        id: history.id,
        type: 'BRAND_MANAGEMENT',
        action: history.action,
        admin: history.admin,
        brand: history.brand,
        details: history.details,
        ipAddress: history.ipAddress,
        userAgent: history.userAgent,
        createdAt: history.createdAt
      })),
      marketplaceManagement: marketplaceHistory.map(history => ({
        id: history.id,
        type: 'MARKETPLACE_MANAGEMENT',
        action: history.action,
        admin: history.admin,
        marketplace: history.marketplace,
        details: history.details,
        ipAddress: history.ipAddress,
        userAgent: history.userAgent,
        createdAt: history.createdAt
      })),
      shippingManagement: shippingHistory.map(history => ({
        id: history.id,
        type: 'SHIPPING_MANAGEMENT',
        action: history.action,
        admin: history.admin,
        shipping: history.shipping,
        details: history.details,
        ipAddress: history.ipAddress,
        userAgent: history.userAgent,
        createdAt: history.createdAt
      })),
      permissionManagement: permissionHistory.map(history => ({
        id: history.id,
        type: 'PERMISSION_MANAGEMENT',
        action: history.action,
        entityType: history.entityType,
        entityId: history.entityId,
        admin: history.admin,
        targetUser: history.targetUser,
        details: history.details,
        ipAddress: history.ipAddress,
        userAgent: history.userAgent,
        createdAt: history.createdAt
      }))
    };
  }

  // Get User Activity History
  static async getUserActivityHistory(whereClause) {
    return await prisma.productManagementHistory.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get All User Activities (Admin)
  static async getAllUserActivities(whereClause) {
    return await prisma.productManagementHistory.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Get Management History Summary
  static async getManagementHistorySummary() {
    const [userCount, brandCount, marketplaceCount, shippingCount, permissionCount] = await Promise.all([
      prisma.userManagementHistory.count(),
      prisma.brandManagementHistory.count(),
      prisma.marketplaceManagementHistory.count(),
      prisma.shippingManagementHistory.count(),
      prisma.permissionManagementHistory.count()
    ]);

    const [recentUserActions, recentBrandActions, recentMarketplaceActions, recentShippingActions, recentPermissionActions] = await Promise.all([
      prisma.userManagementHistory.findMany({
        take: 5,
        include: {
          admin: { select: { username: true, email: true } },
          targetUser: { select: { username: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.brandManagementHistory.findMany({
        take: 5,
        include: {
          admin: { select: { username: true, email: true } },
          brand: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.marketplaceManagementHistory.findMany({
        take: 5,
        include: {
          admin: { select: { username: true, email: true } },
          marketplace: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.shippingManagementHistory.findMany({
        take: 5,
        include: {
          admin: { select: { username: true, email: true } },
          shipping: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.permissionManagementHistory.findMany({
        take: 5,
        include: {
          admin: { select: { username: true, email: true } },
          targetUser: { select: { username: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      summary: {
        totalUserActions: userCount,
        totalBrandActions: brandCount,
        totalMarketplaceActions: marketplaceCount,
        totalShippingActions: shippingCount,
        totalPermissionActions: permissionCount,
        totalActions: userCount + brandCount + marketplaceCount + shippingCount + permissionCount
      },
      recentActions: {
        userManagement: recentUserActions,
        brandManagement: recentBrandActions,
        marketplaceManagement: recentMarketplaceActions,
        shippingManagement: recentShippingActions,
        permissionManagement: recentPermissionActions
      }
    };
  }
}

export default ManagementHistoryModel;
