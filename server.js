import app from './app.js';
import dotenv from 'dotenv';
import dbConnection from './src/config/database.js';
import TokenCleanup from './src/utils/tokenCleanup.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    await dbConnection.disconnect();
    console.log('✅ Database disconnected successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    // Database connection is already handled by the dbConnection singleton
    // Just verify it's connected
    const healthCheck = await dbConnection.healthCheck();
    if (healthCheck.status !== 'healthy') {
      throw new Error('Database health check failed');
    }
    
    // Start HTTP server
    const server = app.listen(PORT,"0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://192.168.0.23:${PORT}/api`);
      console.log(`📊 Health Check: http://192.168.0.23:${PORT}/api/health`);
      console.log(`💾 Database: ${healthCheck.status}`);
    });

    // Start industry-level cron jobs for token cleanup
    TokenCleanup.startCronJobs();

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();
