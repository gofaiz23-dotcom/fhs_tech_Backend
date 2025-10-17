import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Helper function to parse time string to seconds
const parseTimeToSeconds = (timeString) => {
  if (!timeString) return 15 * 60; // Default 15 minutes
  
  const value = parseInt(timeString);
  const unit = timeString.slice(-1).toLowerCase();
  
  switch (unit) {
    case 's': return value; // seconds
    case 'm': return value * 60; // minutes
    case 'h': return value * 60 * 60; // hours
    case 'd': return value * 24 * 60 * 60; // days
    default: return parseInt(timeString); // If no unit, assume seconds
  }
};

// Generate access token (reads from .env)
export const generateAccessToken = (payload) => {
  const expiresIn = parseTimeToSeconds(process.env.JWT_ACCESS_EXPIRES_IN || '15m');
  
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID
    },
    process.env.JWT_SECRET
  );
};

// Generate refresh token (reads from .env)
export const generateRefreshToken = (payload) => {
  const expiresIn = parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d');
  
  return jwt.sign(
    {
      userId: payload.userId,
      tokenVersion: 1,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID
    },
    process.env.JWT_SECRET
  );
};

// Verify token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Hash token for storage
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
