import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate access token (15 minutes)
export const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
      iat: Math.floor(Date.now() / 1000),
      jti: crypto.randomUUID() // Unique token ID
    },
    process.env.JWT_SECRET
  );
};

// Generate refresh token (7 days)
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      tokenVersion: 1,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
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
