import UserModel from '../models/User.js';
import UserLoginHistoryModel from '../models/UserLoginHistory.js';
import { hashPassword } from '../utils/bcrypt.js';

class AdminController {
  // API 1: Get users basic details only (email, role)
  static async getUsersBasic(req, res) {
    try {
      const users = await UserModel.getAllUsersBasic();

      res.json({
        message: 'Users basic details retrieved successfully',
        count: users.length,
        users: users
      });
    } catch (error) {
      console.error('Get users basic error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users basic details',
        details: error.message
      });
    }
  }

  // API 2: Get users with login history
  static async getUsersWithHistory(req, res) {
    try {
      const users = await UserModel.getAllUsersWithHistory();

      res.json({
        message: 'Users with login history retrieved successfully',
        count: users.length,
        users: users
      });
    } catch (error) {
      console.error('Get users with history error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users with history',
        details: error.message
      });
    }
  }

  // API 3: Get users with complete access details (brands + marketplaces + shipping)
  static async getUsersWithAllAccess(req, res) {
    try {
      const users = await UserModel.getAllUsersWithCompleteAccess();

      res.json({
        message: 'Users with complete access details retrieved successfully',
        count: users.length,
        users: users
      });
    } catch (error) {
      console.error('Get users with complete access error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users with complete access',
        details: error.message
      });
    }
  }

  // Get all users with complete access details and login history
  static async getAllUsers(req, res) {
    try {
      const users = await UserModel.getAllUsersWithCompleteAccess();

      res.json({
        message: 'All users with complete access details retrieved successfully',
        users: users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
        details: error.message
      });
    }
  }

  // Get specific user details
  static async getUserById(req, res) {
    try {
      const userId = parseInt(req.params.id);

      const user = await UserModel.findByIdWithAccess(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Format user data
      const userData = {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        brandAccess: user.userBrandAccess.map(access => ({
          id: access.brand.id,
          name: access.brand.name,
          description: access.brand.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        })),
        marketplaceAccess: user.userMarketplaceAccess.map(access => ({
          id: access.marketplace.id,
          name: access.marketplace.name,
          description: access.marketplace.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        })),
        shippingAccess: user.userShippingAccess.map(access => ({
          id: access.shippingCompany.id,
          name: access.shippingCompany.name,
          description: access.shippingCompany.description,
          isActive: access.isActive,
          grantedAt: access.createdAt
        })),
        loginHistory: user.loginHistory.slice(0, 10) // Last 10 logins
      };

      res.json({
        message: 'User details retrieved successfully',
        user: userData
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user details',
        details: error.message
      });
    }
  }

  // Update user email
  static async updateUserEmail(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { email } = req.body;

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if email is already taken by another user
      const emailExists = await UserModel.findByEmail(email);
      if (emailExists && emailExists.id !== userId) {
        return res.status(400).json({
          error: 'Email is already taken by another user'
        });
      }

      // Update email
      const updatedUser = await UserModel.updateEmail(userId, email);

      res.json({
        message: 'User email updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user email error:', error);
      res.status(500).json({
        error: 'Failed to update user email',
        details: error.message
      });
    }
  }

  // Update user username
  static async updateUserUsername(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { username } = req.body;

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if username is already taken by another user
      const usernameExists = await UserModel.findByUsername(username);
      if (usernameExists && usernameExists.id !== userId) {
        return res.status(400).json({
          error: 'Username is already taken by another user'
        });
      }

      // Update username
      const updatedUser = await UserModel.updateUsername(userId, username);

      res.json({
        message: 'User username updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user username error:', error);
      res.status(500).json({
        error: 'Failed to update user username',
        details: error.message
      });
    }
  }

  // Update user password
  static async updateUserPassword(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { password } = req.body;

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update password
      const updatedUser = await UserModel.updatePassword(userId, passwordHash);

      res.json({
        message: 'User password updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user password error:', error);
      res.status(500).json({
        error: 'Failed to update user password',
        details: error.message
      });
    }
  }

  // Update user role
  static async updateUserRole(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      // Check if user exists
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Prevent admin from changing their own role
      if (userId === req.user.userId) {
        return res.status(400).json({
          error: 'Cannot change your own role'
        });
      }

      // Update role
      const updatedUser = await UserModel.updateRole(userId, role);

      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        error: 'Failed to update user role',
        details: error.message
      });
    }
  }
}

export default AdminController;
