/**
 * Authentication Routes - Version 1.0
 * Backward compatible authentication endpoints
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const { ErrorHandler } = require('../../../middleware/errorHandler');
const { handleValidationErrors } = require('../../../middleware/validation');

const router = express.Router();

/**
 * V1 User Registration
 * Maintains backward compatibility with legacy field names
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, profile, businessProfile, riderProfile } = req.body;

    // Handle legacy profile field names for backward compatibility
    let userProfile = profile;
    if (!userProfile) {
      if (role === 'business' && businessProfile) {
        userProfile = businessProfile;
      } else if (role === 'rider' && riderProfile) {
        userProfile = riderProfile;
      }
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

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      profile: userProfile,
      isVerified: false
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // V1 Response format
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          // V1 backward compatibility: include both profile formats
          profile: userProfile,
          ...(role === 'business' && { businessProfile: userProfile }),
          ...(role === 'rider' && { riderProfile: userProfile })
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
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
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * V1 User Login
 * Maintains backward compatibility
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
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

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
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

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // V1 Response format with backward compatibility
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          profile: user.profile,
          // V1 backward compatibility
          ...(user.role === 'business' && { businessProfile: user.profile }),
          ...(user.role === 'rider' && { riderProfile: user.profile }),
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token,
        // V1 backward compatibility: include legacy fields
        accessToken: token,
        tokenType: 'Bearer',
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * V1 Token Refresh (Legacy endpoint)
 */
router.post('/refresh', async (req, res) => {
  try {
    const { token, refreshToken } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Token is required',
          code: 'TOKEN_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify existing token (even if expired)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid token',
            code: 'INVALID_TOKEN',
            statusCode: 401,
            timestamp: new Date().toISOString()
          }
        });
      }
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

    // Generate new token
    const newToken = jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        accessToken: newToken,
        tokenType: 'Bearer',
        expiresIn: '24h'
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;