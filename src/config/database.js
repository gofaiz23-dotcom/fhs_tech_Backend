import { PrismaClient } from '@prisma/client';

class DatabaseConnection {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      // Enhanced connection management for better pooling
      __internal: {
        engine: {
          connectionTimeout: parseInt(process.env.PRISMA_CONNECT_TIMEOUT) || 60000, // 60 seconds
          poolTimeout: parseInt(process.env.PRISMA_POOL_TIMEOUT) || 60000,         // 60 seconds
        }
      }
    });

    // Track connection status
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
  }

  async connect() {
    try {
      this.connectionAttempts++;
      await this.prisma.$connect();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
      
      // Log connection pool info
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Connection Pool Status:', {
          connected: this.isConnected,
          attempts: this.connectionAttempts,
          environment: process.env.NODE_ENV
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      
      // Retry logic for connection failures
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying connection (${this.connectionAttempts}/${this.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.connectionAttempts));
        return this.connect();
      }
      
      throw new Error(`Database connection failed after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error.message);
    }
  }

  getClient() {
    if (!this.isConnected) {
      console.warn('⚠️ Database not connected. Attempting to connect...');
      this.connect();
    }
    return this.prisma;
  }

  // Health check method
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', connected: this.isConnected };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, connected: this.isConnected };
    }
  }

  // Connection pool metrics
  async getPoolMetrics() {
    try {
      // Get basic database stats
      const result = await this.prisma.$queryRaw`
        SELECT 
          count(*) as active_connections,
          state
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state;
      `;
      
      return {
        timestamp: new Date().toISOString(),
        connected: this.isConnected,
        attempts: this.connectionAttempts,
        poolStats: result
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        connected: this.isConnected,
        attempts: this.connectionAttempts,
        error: error.message
      };
    }
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

// Initialize connection on module load
dbConnection.connect().catch(error => {
  console.error('Failed to initialize database connection:', error);
  process.exit(1);
});

// Export both the connection manager and the client
export default dbConnection;
export const prisma = dbConnection.getClient();
