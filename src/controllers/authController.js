import UserModel from '../models/User.js';
import RefreshTokenModel from '../models/RefreshToken.js';
import UserLoginHistoryModel from '../models/UserLoginHistory.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateAccessToken, generateRefreshToken, verifyToken, hashToken } from '../utils/jwt.js';

class AuthController {
  // Register new user (First admin no token, then admin-only)
  static async register(req, res) {
    try {
      const { username, email, password, role = 'USER' } = req.body;

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          error: 'User with this email already exists'
        });
      }

      // Check if this is the first user (no users exist)
      const allUsers = await UserModel.getAllUsersBasic();
      const isFirstUser = allUsers.length === 0;

      // If not first user, require admin authorization
      if (!isFirstUser) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Admin authorization required to register users'
          });
        }

        try {
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          const adminUser = await UserModel.findById(decoded.userId);
          
          if (!adminUser || adminUser.role !== 'ADMIN') {
            return res.status(403).json({
              error: 'Only admin can register users'
            });
          }
        } catch (tokenError) {
          return res.status(401).json({
            error: 'Invalid or expired admin token'
          });
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user - first user automatically becomes admin
      const finalRole = isFirstUser ? 'ADMIN' : role;
      const user = await UserModel.create({
        username,
        email,
        passwordHash,
        role: finalRole
      });

      res.status(201).json({
        message: isFirstUser 
          ? 'First admin registered successfully' 
          : 'User registered successfully',
        user: user,
        isFirstAdmin: isFirstUser
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        details: error.message
      });
    }
  }

  // User login
  static async login(req, res) {
    try {
      const { email, password, networkType } = req.body;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Compare password
      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = generateRefreshToken({
        userId: user.id
      });

      // Hash and store refresh token
      const refreshTokenHash = hashToken(refreshToken);
      await RefreshTokenModel.create({
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Log login history
      await UserLoginHistoryModel.createLogin({
        userId: user.id,
        ipAddress: req.ip,
        networkType: networkType || 'unknown',
        userAgent: req.get('User-Agent')
      });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        message: 'Login successful',
        accessToken: accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        details: error.message
      });
    }
  }

  // Refresh access token
  static async refresh(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      // Debug logging
      console.log('🍪 Cookies received:', req.cookies);
      console.log('🔑 Refresh token:', refreshToken ? 'Present' : 'Missing');

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token not provided'
        });
      }

      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      const refreshTokenHash = hashToken(refreshToken);

      // Find refresh token in database
      const storedToken = await RefreshTokenModel.findByTokenHash(refreshTokenHash);
      if (!storedToken) {
        return res.status(401).json({
          error: 'Invalid refresh token'
        });
      }

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role
      });

      res.json({
        message: 'Token refreshed successfully',
        accessToken: accessToken
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({
        error: 'Token refresh failed',
        details: error.message
      });
    }
  }

  // User logout
  static async logout(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const userId = req.user.userId;

      // Update logout time in login history
      await UserLoginHistoryModel.updateLogout(userId);

      // Delete refresh token from database
      if (refreshToken) {
        const refreshTokenHash = hashToken(refreshToken);
        await RefreshTokenModel.delete(refreshTokenHash);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed',
        details: error.message
      });
    }
  }

  // Get user profile (basic details only)
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      res.json({
        message: 'Profile retrieved successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        error: 'Failed to retrieve profile',
        details: error.message
      });
    }
  }
}

export default AuthController;
