import RefreshTokenModel from '../models/RefreshToken.js';
import cron from 'node-cron';

class TokenCleanup {
  // Clean expired tokens
  static async cleanExpiredTokens() {
    try {
      const result = await RefreshTokenModel.cleanExpiredTokens();
      console.log(`🧹 Cleaned up ${result.count} expired/revoked tokens`);
      return result;
    } catch (error) {
      console.error('❌ Token cleanup error:', error);
      throw error;
    }
  }

  // Clean old active tokens (older than 7 days)
  static async cleanOldActiveTokens() {
    try {
      const result = await RefreshTokenModel.cleanOldActiveTokens();
      console.log(`🧹 Cleaned up ${result.count} old active tokens (older than 7 days)`);
      return result;
    } catch (error) {
      console.error('❌ Old token cleanup error:', error);
      throw error;
    }
  }

  // Clean all old tokens (expired + old active)
  static async cleanAllOldTokens() {
    try {
      const result = await RefreshTokenModel.cleanAllOldTokens();
      console.log(`🧹 Cleaned up ${result.count} old tokens (expired + old active)`);
      return result;
    } catch (error) {
      console.error('❌ All token cleanup error:', error);
      throw error;
    }
  }

  // Industry-level cron job scheduler
  static startCronJobs() {
    console.log('🔄 Starting token cleanup cron jobs...');
    
    // Run initial cleanup
    this.cleanAllOldTokens();
    
    // CRON JOB 1: Clean expired tokens every 6 hours
    this.scheduleCleanup('0 */6 * * *', 'Every 6 hours', () => this.cleanExpiredTokens());
    
    // CRON JOB 2: Clean old active tokens every day at 2 AM
    this.scheduleCleanup('0 2 * * *', 'Daily at 2 AM', () => this.cleanOldActiveTokens());
    
    // CRON JOB 3: Deep cleanup (all old tokens) on Sunday at 3 AM
    this.scheduleCleanup('0 3 * * 0', 'Weekly on Sunday at 3 AM', () => this.cleanAllOldTokens());
    
    console.log('✅ All token cleanup cron jobs scheduled');
  }

  // Schedule a cron job with error handling and logging
  static scheduleCleanup(cronExpression, description, cleanupFunction) {
    
    const task = cron.schedule(cronExpression, async () => {
      const startTime = new Date();
      console.log(`🕐 Starting ${description} token cleanup at ${startTime.toISOString()}`);
      
      try {
        const result = await cleanupFunction();
        const endTime = new Date();
        const duration = endTime - startTime;
        
        console.log(`✅ ${description} cleanup completed in ${duration}ms. Removed ${result.count} tokens.`);
      } catch (error) {
        console.error(`❌ ${description} cleanup failed:`, error);
        
        // Send alert to monitoring system (if configured)
        this.sendCleanupAlert(description, error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    console.log(`📅 Scheduled: ${description} (${cronExpression})`);
    return task;
  }

  // Send cleanup failure alert (extend this for your monitoring system)
  static sendCleanupAlert(description, error) {
    // TODO: Integrate with your monitoring system (Sentry, DataDog, etc.)
    console.error(`🚨 ALERT: Token cleanup failed for ${description}:`, error.message);
    
    // Example: Send to Slack, email, or monitoring service
    // await this.sendToSlack(`Token cleanup failed: ${error.message}`);
    // await this.sendEmail(`Token cleanup failed: ${error.message}`);
  }

  // Manual cleanup (for testing or immediate cleanup)
  static async manualCleanup() {
    console.log('🧹 Starting manual token cleanup...');
    const result = await this.cleanExpiredTokens();
    console.log(`✅ Manual cleanup completed. Removed ${result.count} tokens.`);
    return result;
  }

  // Get cleanup statistics
  static async getCleanupStats() {
    try {
      const { prisma } = await import('../config/database.js');
      
      const totalTokens = await prisma.refreshToken.count();
      const expiredTokens = await prisma.refreshToken.count({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true }
          ]
        }
      });
      const activeTokens = totalTokens - expiredTokens;
      
      return {
        total: totalTokens,
        expired: expiredTokens,
        active: activeTokens,
        cleanupNeeded: expiredTokens > 0
      };
    } catch (error) {
      console.error('❌ Failed to get cleanup stats:', error);
      throw error;
    }
  }

  // Emergency cleanup (removes ALL tokens for a user)
  static async emergencyCleanupUser(userId) {
    try {
      console.log(`🚨 Emergency cleanup for user ${userId}`);
      const result = await RefreshTokenModel.deleteAllUserTokens(userId);
      console.log(`✅ Emergency cleanup completed. Removed ${result.count} tokens for user ${userId}`);
      return result;
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      throw error;
    }
  }
}

export default TokenCleanup;
