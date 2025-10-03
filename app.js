import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './src/routes/index.js';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins for development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : function(origin, callback) {
        // Allow all origins (*) in development
        callback(null, true);
      },
  credentials: true, // Allow cookies and credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use(limiter);


// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/json']
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'FHS Tech Backend Server',
    version: '1.0.0',
    status: 'Running',
    api: '/api'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // JSON parsing errors (multipart form data)
  if (error.type === 'entity.parse.failed') {
    // Check if it's a multipart request
    if (req.is('multipart/form-data')) {
      return res.status(400).json({
        error: 'File upload error',
        message: 'Please use proper file upload format with multipart/form-data',
        code: 'FILE_UPLOAD_ERROR'
      });
    }
    return res.status(400).json({
      error: 'Invalid request format',
      message: 'Request body must be valid JSON',
      code: 'INVALID_REQUEST_FORMAT'
    });
  }
  
  // Prisma errors
  if (error.code === 'P2002') {
    return res.status(400).json({
      error: 'Duplicate entry',
      message: 'A record with this data already exists',
      code: 'DUPLICATE_ENTRY'
    });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
      message: 'The requested record does not exist',
      code: 'RECORD_NOT_FOUND'
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.message,
      code: 'VALIDATION_ERROR'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The provided token has expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    code: 'INTERNAL_ERROR'
  });
});

export default app;
