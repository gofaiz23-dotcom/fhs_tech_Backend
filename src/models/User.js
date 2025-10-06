import prisma from '../config/database.js';

class UserModel {
  // Create new user
  static async create(userData) {
    return await prisma.user.create({
      data: userData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  // Find user by email
  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        userBrandAccess: {
          where: { isActive: true },
          include: { brand: true }
        },
        userMarketplaceAccess: {
          where: { isActive: true },
          include: { marketplace: true }
        },
        userShippingAccess: {
          where: { isActive: true },
          include: { shippingCompany: true }
        }
      }
    });
  }

  // Find user by username
  static async findByUsername(username) {
    return await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  // Find user by ID
  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  // Get all users with login history
  static async findAllWithHistory() {
    return await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        loginHistory: {
          orderBy: { loginTime: 'desc' },
          take: 5
        },
        userBrandAccess: {
          where: { isActive: true },
          include: { brand: true }
        },
        userMarketplaceAccess: {
          where: { isActive: true },
          include: { marketplace: true }
        },
        userShippingAccess: {
          where: { isActive: true },
          include: { shippingCompany: true }
        }
      }
    });
  }

  // Update user email
  static async updateEmail(id, email) {
    return await prisma.user.update({
      where: { id },
      data: { email },
      select: {
        id: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });
  }

  // Update user username
  static async updateUsername(id, username) {
    return await prisma.user.update({
      where: { id },
      data: { username },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });
  }

  // Update user password
  static async updatePassword(id, passwordHash) {
    return await prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });
  }

  // Update user role
  static async updateRole(id, role) {
    return await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });
  }

  // Delete user
  static async delete(id) {
    return await prisma.user.delete({
      where: { id }
    });
  }

  // Get user with detailed access
  static async findByIdWithAccess(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        userBrandAccess: {
          include: { brand: true }
        },
        userMarketplaceAccess: {
          include: { marketplace: true }
        },
        userShippingAccess: {
          include: { shippingCompany: true }
        },
        loginHistory: {
          orderBy: { loginTime: 'desc' },
          take: 10
        }
      }
    });
  }

  // API 1: Get users basic details only (email, role)
  static async getAllUsersBasic() {
    return await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // API 2: Get users with login history
  static async getAllUsersWithHistory() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        loginHistory: {
          orderBy: { loginTime: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => {
      // Calculate login statistics
      const totalSessions = user.loginHistory.length;
      const totalLoginMinutes = user.loginHistory.reduce((total, session) => {
        return total + (session.sessionDuration || 0);
      }, 0);
      const totalLoginHours = Math.round((totalLoginMinutes / 60) * 100) / 100;
      
      // Find current active session
      const currentSession = user.loginHistory.find(session => !session.logoutTime);
      const lastLogin = user.loginHistory[0]?.loginTime || null;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        
        loginStats: {
          totalSessions,
          totalLoginHours,
          lastLogin,
          currentSession: currentSession ? {
            loginTime: currentSession.loginTime,
            ipAddress: currentSession.ipAddress,
            networkType: currentSession.networkType,
            isActive: true
          } : null
        },

        loginHistory: user.loginHistory.map(session => ({
          id: session.id,
          loginTime: session.loginTime,
          logoutTime: session.logoutTime,
          sessionDuration: session.sessionDuration,
          ipAddress: session.ipAddress,
          networkType: session.networkType,
          userAgent: session.userAgent,
          isActive: !session.logoutTime,
          createdAt: session.createdAt
        }))
      };
    });
  }

  // API 3: Get users with brand access only
  static async getAllUsersWithBrandAccess() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        userBrandAccess: {
          include: { 
            brand: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      
      brandAccess: user.userBrandAccess.map(access => ({
        id: access.brand.id,
        name: access.brand.name,
        description: access.brand.description,
        isActive: access.isActive,
        grantedAt: access.createdAt
      })),

      brandSummary: {
        totalBrands: user.userBrandAccess.filter(access => access.isActive).length,
        totalGranted: user.userBrandAccess.length,
        hasActiveBrands: user.userBrandAccess.some(access => access.isActive)
      }
    }));
  }

  // Get ALL users with complete access details and login statistics
  static async getAllUsersWithCompleteAccess() {
    const users = await prisma.user.findMany({
      include: {
        userBrandAccess: {
          include: { 
            brand: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        userMarketplaceAccess: {
          include: { 
            marketplace: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        userShippingAccess: {
          include: { 
            shippingCompany: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        loginHistory: {
          orderBy: { loginTime: 'desc' }
        }
      }
    });

    // Format the response with complete access details and login stats
    return users.map(user => {
      // Calculate login statistics
      const totalSessions = user.loginHistory.length;
      const totalLoginMinutes = user.loginHistory.reduce((total, session) => {
        return total + (session.sessionDuration || 0);
      }, 0);
      const totalLoginHours = Math.round((totalLoginMinutes / 60) * 100) / 100;
      
      // Find current active session (no logout time)
      const currentSession = user.loginHistory.find(session => !session.logoutTime);
      
      // Get last login
      const lastLogin = user.loginHistory[0]?.loginTime || null;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        
        // Login Statistics
        loginStats: {
          totalSessions,
          totalLoginHours,
          lastLogin,
          currentSession: currentSession ? {
            loginTime: currentSession.loginTime,
            ipAddress: currentSession.ipAddress,
            networkType: currentSession.networkType,
            isActive: true
          } : null
        },

        // Complete Login History
        loginHistory: user.loginHistory.map(session => ({
          id: session.id,
          loginTime: session.loginTime,
          logoutTime: session.logoutTime,
          sessionDuration: session.sessionDuration,
          ipAddress: session.ipAddress,
          networkType: session.networkType,
          userAgent: session.userAgent,
          isActive: !session.logoutTime,
          createdAt: session.createdAt
        })),

        // Brand Access
        brandAccess: user.userBrandAccess.map(access => ({
          id: access.brand.id,
          name: access.brand.name,
          description: access.brand.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        })),

        // Marketplace Access
        marketplaceAccess: user.userMarketplaceAccess.map(access => ({
          id: access.marketplace.id,
          name: access.marketplace.name,
          description: access.marketplace.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        })),

        // Shipping Access
        shippingAccess: user.userShippingAccess.map(access => ({
          id: access.shippingCompany.id,
          name: access.shippingCompany.name,
          description: access.shippingCompany.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        })),

        // Access Summary
        accessSummary: {
          totalBrands: user.userBrandAccess.filter(access => access.isActive).length,
          totalMarketplaces: user.userMarketplaceAccess.filter(access => access.isActive).length,
          totalShippingCompanies: user.userShippingAccess.filter(access => access.isActive).length,
          hasAnyAccess: user.userBrandAccess.some(access => access.isActive) || 
                       user.userMarketplaceAccess.some(access => access.isActive) || 
                       user.userShippingAccess.some(access => access.isActive)
        }
      };
    });
  }
}

export default UserModel;
