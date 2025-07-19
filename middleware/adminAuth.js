const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ErrorHandler } = require('./errorHandler');

/**
 * Admin Authentication Middleware
 * Provides authentication and authorization for admin users
 */
class AdminAuth {
  /**
   * Middleware to verify admin authentication
   * @returns {Function} Express middleware
   */
  static requireAdmin() {
    return async (req, res, next) => {
      try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return ErrorHandler.unauthorized(res, 'Admin access token required');
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await User.findById(decoded.userId);
        if (!user) {
          return ErrorHandler.unauthorized(res, 'Invalid admin token');
        }

        // Check if user is admin
        if (user.role !== 'admin') {
          return ErrorHandler.forbidden(res, 'Admin access required');
        }

        // Check if admin is verified
        if (!user.isVerified) {
          return ErrorHandler.forbidden(res, 'Admin account not verified');
        }

        // Add user to request
        req.user = user;
        req.admin = user; // Alias for clarity
        next();
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return ErrorHandler.unauthorized(res, 'Invalid admin token');
        }
        if (error.name === 'TokenExpiredError') {
          return ErrorHandler.unauthorized(res, 'Admin token expired');
        }
        return ErrorHandler.serverError(res, 'Admin authentication failed', error);
      }
    };
  }

  /**
   * Middleware to check specific admin permissions
   * @param {string|Array} permissions - Required permission(s)
   * @returns {Function} Express middleware
   */
  static requirePermission(permissions) {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    return (req, res, next) => {
      if (!req.admin) {
        return ErrorHandler.unauthorized(res, 'Admin authentication required');
      }

      const adminPermissions = req.admin.getProfileData().permissions || [];
      
      // Check if admin has all required permissions
      const hasPermission = requiredPermissions.every(permission => 
        adminPermissions.includes(permission)
      );

      if (!hasPermission) {
        return ErrorHandler.forbidden(res, `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
      }

      next();
    };
  }

  /**
   * Middleware for super admin access (highest level)
   * @returns {Function} Express middleware
   */
  static requireSuperAdmin() {
    return (req, res, next) => {
      if (!req.admin) {
        return ErrorHandler.unauthorized(res, 'Admin authentication required');
      }

      // Check if admin has super admin privileges (can be determined by email domain or specific flag)
      const isSuperAdmin = req.admin.email.endsWith('@admin.lastmile.com') || 
                          req.admin.profile?.isSuperAdmin === true;

      if (!isSuperAdmin) {
        return ErrorHandler.forbidden(res, 'Super admin access required');
      }

      next();
    };
  }

  /**
   * Generate admin JWT token
   * @param {Object} admin - Admin user object
   * @returns {string} JWT token
   */
  static generateToken(admin) {
    return jwt.sign(
      { 
        userId: admin._id, 
        role: admin.role,
        permissions: admin.getProfileData().permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' } // Shorter expiry for admin tokens
    );
  }

  /**
   * Validate admin login credentials
   * @param {string} email - Admin email
   * @param {string} password - Admin password
   * @returns {Object} Validation result
   */
  static async validateAdminLogin(email, password) {
    try {
      // Find admin user
      const admin = await User.findOne({ email, role: 'admin' });
      if (!admin) {
        return { success: false, message: 'Invalid admin credentials' };
      }

      // Check password (assuming bcrypt is used)
      const bcrypt = require('bcrypt');
      const isValidPassword = await bcrypt.compare(password, admin.password);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid admin credentials' };
      }

      // Check if admin is verified
      if (!admin.isVerified) {
        return { success: false, message: 'Admin account not verified' };
      }

      return { success: true, admin };
    } catch (error) {
      return { success: false, message: 'Admin login validation failed', error };
    }
  }

  /**
   * Create default admin user (for initial setup)
   * @param {Object} adminData - Admin user data
   * @returns {Object} Created admin user
   */
  static async createDefaultAdmin(adminData) {
    try {
      const bcrypt = require('bcrypt');
      
      // Check if admin already exists
      const existingAdmin = await User.findOne({ email: adminData.email, role: 'admin' });
      if (existingAdmin) {
        throw new Error('Admin user already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // Create admin user
      const admin = new User({
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword,
        role: 'admin',
        isVerified: true, // Auto-verify admin accounts
        profile: {
          isSuperAdmin: adminData.isSuperAdmin || false
        }
      });

      await admin.save();
      return admin;
    } catch (error) {
      throw new Error(`Failed to create admin user: ${error.message}`);
    }
  }

  /**
   * Middleware to log admin actions for audit trail
   * @returns {Function} Express middleware
   */
  static auditLog() {
    return (req, res, next) => {
      if (req.admin) {
        // Log admin action (in production, this would go to a proper audit log)
        console.log(`[ADMIN AUDIT] ${new Date().toISOString()} - Admin ${req.admin.email} (${req.admin._id}) performed ${req.method} ${req.originalUrl}`);
        
        // Add audit info to request for potential database logging
        req.auditInfo = {
          adminId: req.admin._id,
          adminEmail: req.admin.email,
          action: `${req.method} ${req.originalUrl}`,
          timestamp: new Date(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        };
      }
      next();
    };
  }
}

module.exports = AdminAuth;