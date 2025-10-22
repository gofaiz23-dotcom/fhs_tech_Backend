import { prisma } from '../config/database.js';

class RefreshTokenModel {
  // Create new refresh token
  static async create(tokenData) {
    return await prisma.refreshToken.create({
      data: tokenData
    });
  }

  // Find refresh token by token hash
  static async findByTokenHash(tokenHash) {
    return await prisma.refreshToken.findFirst({
      where: { 
        tokenHash: tokenHash,
        isRevoked: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: { user: true }
    });
  }

  // Revoke refresh token
  static async revoke(tokenHash) {
    return await prisma.refreshToken.updateMany({
      where: { tokenHash: tokenHash },
      data: { isRevoked: true }
    });
  }

  // Revoke all user tokens
  static async revokeAllUserTokens(userId) {
    return await prisma.refreshToken.updateMany({
      where: { userId: userId },
      data: { isRevoked: true }
    });
  }

  // Delete refresh token
  static async delete(tokenHash) {
    return await prisma.refreshToken.deleteMany({
      where: { tokenHash: tokenHash }
    });
  }

  // Delete all user tokens
  static async deleteAllUserTokens(userId) {
    return await prisma.refreshToken.deleteMany({
      where: { userId: userId }
    });
  }

  // Clean expired tokens
  static async cleanExpiredTokens() {
    return await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true }
        ]
      }
    });
  }

  // Clean old active tokens (older than 7 days)
  static async cleanOldActiveTokens() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return await prisma.refreshToken.deleteMany({
      where: {
        createdAt: { lt: sevenDaysAgo },
        isRevoked: false,
        expiresAt: { gt: new Date() }
      }
    });
  }

  // Clean all old tokens (expired + old active)
  static async cleanAllOldTokens() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true },
          { createdAt: { lt: sevenDaysAgo } }
        ]
      }
    });
  }
}

export default RefreshTokenModel;
