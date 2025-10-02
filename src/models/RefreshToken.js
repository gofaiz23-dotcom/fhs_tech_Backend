import prisma from '../config/database.js';

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
}

export default RefreshTokenModel;
