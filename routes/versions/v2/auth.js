/**
 * Authentication Routes - Version 2.0
 * Enhanced authentication with breaking changes
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const { ErrorHandler } = require('../../../middleware/errorHandler');

const router = express.Router();

/**
 * V2 User Registration
 * Enhanced with additional security and validation
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, profile } = req.body;

    // V2: Enhanced validation
    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Name must be at least 2 characters long',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          field: 'name',
          timestamp: new Date().toISOString()
        }
      });
    }

    // V2: Enhanced password requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character',
          code: 'WEAK_PASSWORD',
          statusCode: 400,
          field: 'password',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'USER_EXISTS',
          statusCode: 409,
          timestamp: new Date().toISOString()
        }
      });
    }

    // V2: Enhanced password hashing
    const saltRounds = 14; // Increased from v1
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      profile,
      isVerified: false,
      // V2: Additional security fields
      securityLevel: 'standard',
      lastPasswordChange: new Date(),
      loginAttempts: 0,
      accountLocked: false
    });

    await user.save();

    // V2: Enhanced JWT with additional claims
    const token = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        email: user.email,
        role: user.role,
        securityLevel: user.securityLevel,
        version: 'v2'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { 
        expiresIn: '24h',
        issuer: 'last-mile-delivery-api',
        audience: 'last-mile-delivery-client'
      }
    );

    // V2 Response format (breaking changes from v1)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isVerified: user.isVerified,
          securityLevel: user.securityLevel,
          createdAt: user.createdAt,
          // V2: Enhanced metadata
          metadata: {
            version: 'v2',
            registrationMethod: 'email',
            securityFeatures: ['enhanced-password', 'account-lockout']
          }
        },
        authentication: {
          accessToken: token,
          tokenType: 'Bearer',
          expiresIn: 86400, // V2: Numeric seconds instead of string
          scope: ['read', 'write'],
          // V2: No refresh token in registration (security improvement)
        }
      }
    });
  } catch (error) {
    console.error('V2 Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value,
        code: 'FIELD_VALIDATION_ERROR'
      }));
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
});

/**
 * V2 User Login
 * Enhanced with security features
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceInfo } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password +loginAttempts +accountLocked +lastLoginAttempt');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // V2: Account lockout protection
    if (user.accountLocked) {
      const lockoutTime = 30 * 60 * 1000; // 30 minutes
      const timeSinceLastAttempt = Date.now() - (user.lastLoginAttempt?.getTime() || 0);
      
      if (timeSinceLastAttempt < lockoutTime) {
        return res.status(423).json({
          success: false,
          error: {
            message: 'Account temporarily locked due to multiple failed login attempts',
            code: 'ACCOUNT_LOCKED',
            statusCode: 423,
            unlockTime: new Date(user.lastLoginAttempt.getTime() + lockoutTime).toISOString(),
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // Reset lockout
        user.accountLocked = false;
        user.loginAttempts = 0;
      }
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // V2: Track failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      user.lastLoginAttempt = new Date();
      
      if (user.loginAttempts >= 5) {
        user.accountLocked = true;
      }
      
      await user.save();

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
          statusCode: 401,
          attemptsRemaining: Math.max(0, 5 - user.loginAttempts),
          timestamp: new Date().toISOString()
        }
      });
    }

    // Reset failed attempts on successful login
    user.loginAttempts = 0;
    user.accountLocked = false;
    user.lastLogin = new Date();
    await user.save();

    // V2: Enhanced JWT
    const accessToken = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        email: user.email,
        role: user.role,
        securityLevel: user.securityLevel || 'standard',
        version: 'v2',
        deviceInfo: deviceInfo?.fingerprint || 'unknown'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { 
        expiresIn: '1h', // V2: Shorter access token lifetime
        issuer: 'last-mile-delivery-api',
        audience: 'last-mile-delivery-client'
      }
    );

    // V2: Separate refresh token
    const refreshToken = jwt.sign(
      {
        userId: user._id,
        type: 'refresh',
        version: 'v2'
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
      { 
        expiresIn: '7d',
        issuer: 'last-mile-delivery-api',
        audience: 'last-mile-delivery-client'
      }
    );

    // V2 Response format (breaking changes from v1)
    res.json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile,
          isVerified: user.isVerified,
          securityLevel: user.securityLevel || 'standard',
          lastLogin: user.lastLogin,
          // V2: Enhanced user metadata
          metadata: {
            version: 'v2',
            loginMethod: 'password',
            securityFeatures: ['account-lockout', 'enhanced-tokens'],
            sessionId: require('crypto').randomUUID()
          }
        },
        authentication: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: 3600, // V2: Numeric seconds
          refreshExpiresIn: 604800, // 7 days
          scope: ['read', 'write'],
          // V2: Additional security info
          issuedAt: Math.floor(Date.now() / 1000),
          issuer: 'last-mile-delivery-api'
        }
      }
    });
  } catch (error) {
    console.error('V2 Login error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
});

/**
 * V2 Token Refresh
 * Enhanced refresh token handling
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'REFRESH_TOKEN_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret'
      );
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token type',
          code: 'INVALID_TOKEN_TYPE',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        email: user.email,
        role: user.role,
        securityLevel: user.securityLevel || 'standard',
        version: 'v2'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { 
        expiresIn: '1h',
        issuer: 'last-mile-delivery-api',
        audience: 'last-mile-delivery-client'
      }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: user._id,
        type: 'refresh',
        version: 'v2'
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret',
      { 
        expiresIn: '7d',
        issuer: 'last-mile-delivery-api',
        audience: 'last-mile-delivery-client'
      }
    );

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        authentication: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: 3600,
          refreshExpiresIn: 604800,
          scope: ['read', 'write'],
          issuedAt: Math.floor(Date.now() / 1000),
          issuer: 'last-mile-delivery-api'
        }
      }
    });
  } catch (error) {
    console.error('V2 Token refresh error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
});

module.exports = router;