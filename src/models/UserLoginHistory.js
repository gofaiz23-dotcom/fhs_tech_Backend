import { prisma } from '../config/database.js';

class UserLoginHistoryModel {
  // Create login record
  static async createLogin(loginData) {
    return await prisma.userLoginHistory.create({
      data: {
        userId: loginData.userId,
        loginTime: new Date(),
        ipAddress: loginData.ipAddress,
        networkType: loginData.networkType,
        userAgent: loginData.userAgent
      }
    });
  }

  // Update logout time and calculate session duration
  static async updateLogout(userId) {
    const activeSession = await prisma.userLoginHistory.findFirst({
      where: {
        userId: userId,
        logoutTime: null
      },
      orderBy: {
        loginTime: 'desc'
      }
    });

    if (activeSession) {
      const logoutTime = new Date();
      const sessionDuration = Math.floor((logoutTime - activeSession.loginTime) / (1000 * 60)); // in minutes

      return await prisma.userLoginHistory.update({
        where: { id: activeSession.id },
        data: {
          logoutTime: logoutTime,
          sessionDuration: sessionDuration
        }
      });
    }

    return null;
  }

  // Get user login history
  static async getUserHistory(userId, limit = 10) {
    return await prisma.userLoginHistory.findMany({
      where: { userId: userId },
      orderBy: { loginTime: 'desc' },
      take: limit
    });
  }

  // Get all users with login statistics
  static async getAllUsersWithStats() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        loginHistory: {
          orderBy: { loginTime: 'desc' }
        }
      }
    });

    return users.map(user => {
      const loginHistory = user.loginHistory;
      const totalSessions = loginHistory.length;
      const totalLoginHours = loginHistory.reduce((total, session) => {
        return total + (session.sessionDuration || 0);
      }, 0) / 60; // convert minutes to hours

      const currentSession = loginHistory.find(session => !session.logoutTime);
      const lastLogin = loginHistory[0]?.loginTime || null;

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        totalLoginHours: Math.round(totalLoginHours * 100) / 100,
        totalSessions: totalSessions,
        lastLogin: lastLogin,
        currentSession: currentSession ? {
          loginTime: currentSession.loginTime,
          isActive: true,
          ipAddress: currentSession.ipAddress,
          networkType: currentSession.networkType,
          currentDuration: Math.floor((new Date() - currentSession.loginTime) / (1000 * 60)) // in minutes
        } : null
      };
    });
  }

  // Check if user has active session
  static async hasActiveSession(userId) {
    const activeSession = await prisma.userLoginHistory.findFirst({
      where: {
        userId: userId,
        logoutTime: null
      }
    });

    return !!activeSession;
  }
}

export default UserLoginHistoryModel;
