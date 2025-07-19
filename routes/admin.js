const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const AdminAuth = require('../middleware/adminAuth');
const { ErrorHandler } = require('../middleware/errorHandler');
const { validateInput } = require('../middleware/validation');

const router = express.Router();

/**
 * Admin Authentication Routes
 */

// Admin login
router.post('/login', validateInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return ErrorHandler.badRequest(res, 'Email and password are required');
    }

    // Validate admin credentials
    const result = await AdminAuth.validateAdminLogin(email, password);
    if (!result.success) {
      return ErrorHandler.unauthorized(res, result.message);
    }

    // Generate token
    const token = AdminAuth.generateToken(result.admin);

    // Get admin profile data
    const adminProfile = result.admin.getProfileData();

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: adminProfile,
        expiresIn: '8h'
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Admin login failed', error);
  }
});

// Admin logout (client-side token removal, but we can log it)
router.post('/logout', AdminAuth.requireAdmin(), AdminAuth.auditLog(), (req, res) => {
  res.json({
    success: true,
    message: 'Admin logout successful'
  });
});

// Get current admin profile
router.get('/profile', AdminAuth.requireAdmin(), (req, res) => {
  try {
    const adminProfile = req.admin.getProfileData();
    res.json({
      success: true,
      data: { admin: adminProfile }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get admin profile', error);
  }
});

/**
 * Admin Dashboard Routes
 */

// Get dashboard overview
router.get('/dashboard', AdminAuth.requireAdmin(), AdminAuth.auditLog(), async (req, res) => {
  try {
    // Get platform statistics
    const [
      totalUsers,
      totalBusinesses,
      totalRiders,
      totalOffers,
      activeOffers,
      completedOffers,
      totalPayments,
      totalEarnings
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'business' }),
      User.countDocuments({ role: 'rider' }),
      Offer.countDocuments(),
      Offer.countDocuments({ status: { $in: ['pending', 'accepted', 'picked_up', 'in_transit'] } }),
      Offer.countDocuments({ status: 'delivered' }),
      Payment.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      newUsersToday,
      newOffersToday,
      completedDeliveriesToday
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: yesterday } }),
      Offer.countDocuments({ createdAt: { $gte: yesterday } }),
      Offer.countDocuments({ 
        status: 'delivered', 
        updatedAt: { $gte: yesterday } 
      })
    ]);

    const dashboardData = {
      overview: {
        totalUsers,
        totalBusinesses,
        totalRiders,
        totalOffers,
        activeOffers,
        completedOffers,
        totalPayments,
        totalEarnings: totalEarnings[0]?.total || 0
      },
      todayStats: {
        newUsers: newUsersToday,
        newOffers: newOffersToday,
        completedDeliveries: completedDeliveriesToday
      },
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get dashboard data', error);
  }
});

/**
 * User Management Routes
 */

// Get all users with pagination and filtering
router.get('/users', AdminAuth.requireAdmin(), AdminAuth.requirePermission('manage_users'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, verified } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (role && ['business', 'rider'].includes(role)) {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (verified !== undefined) {
      filter.isVerified = verified === 'true';
    }

    // Get users and total count
    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: skip + users.length < totalUsers,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get users', error);
  }
});

// Get specific user details
router.get('/users/:userId', AdminAuth.requireAdmin(), AdminAuth.requirePermission('manage_users'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return ErrorHandler.notFound(res, 'User not found');
    }

    // Get user's offers and payments
    const [userOffers, userPayments] = await Promise.all([
      Offer.find({ 
        $or: [
          { businessId: userId },
          { riderId: userId }
        ]
      }).sort({ createdAt: -1 }).limit(10),
      Payment.find({ 
        $or: [
          { businessId: userId },
          { riderId: userId }
        ]
      }).sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      data: {
        user,
        recentOffers: userOffers,
        recentPayments: userPayments
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get user details', error);
  }
});

// Update user verification status
router.patch('/users/:userId/verify', AdminAuth.requireAdmin(), AdminAuth.requirePermission('manage_users'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return ErrorHandler.badRequest(res, 'isVerified must be a boolean');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return ErrorHandler.notFound(res, 'User not found');
    }

    res.json({
      success: true,
      message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
      data: { user }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to update user verification', error);
  }
});

// Suspend/unsuspend user (soft delete)
router.patch('/users/:userId/suspend', AdminAuth.requireAdmin(), AdminAuth.requirePermission('manage_users'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspended, reason } = req.body;

    if (typeof suspended !== 'boolean') {
      return ErrorHandler.badRequest(res, 'suspended must be a boolean');
    }

    const updateData = {
      'profile.suspended': suspended,
      updatedAt: new Date()
    };

    if (suspended && reason) {
      updateData['profile.suspensionReason'] = reason;
      updateData['profile.suspendedAt'] = new Date();
    } else if (!suspended) {
      updateData['profile.suspensionReason'] = undefined;
      updateData['profile.suspendedAt'] = undefined;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return ErrorHandler.notFound(res, 'User not found');
    }

    res.json({
      success: true,
      message: `User ${suspended ? 'suspended' : 'unsuspended'} successfully`,
      data: { user }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to update user suspension status', error);
  }
});

/**
 * Platform Analytics Routes
 */

// Get platform analytics
router.get('/analytics', AdminAuth.requireAdmin(), AdminAuth.requirePermission('view_analytics'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    // Calculate date range based on period
    let startDate;
    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const [
      userGrowth,
      offerStats,
      paymentStats,
      topBusinesses,
      topRiders
    ] = await Promise.all([
      // User growth over time
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              role: '$role'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),
      
      // Offer statistics
      Offer.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgAmount: { $avg: '$payment.amount' }
          }
        }
      ]),
      
      // Payment statistics
      Payment.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      
      // Top businesses by offers
      Offer.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$businessId', offerCount: { $sum: 1 } } },
        { $sort: { offerCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'business'
          }
        },
        { $unwind: '$business' },
        {
          $project: {
            businessName: '$business.profile.businessName',
            email: '$business.email',
            offerCount: 1
          }
        }
      ]),
      
      // Top riders by completed deliveries
      Offer.aggregate([
        { 
          $match: { 
            status: 'delivered',
            updatedAt: { $gte: startDate }
          } 
        },
        { $group: { _id: '$riderId', deliveryCount: { $sum: 1 } } },
        { $sort: { deliveryCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'rider'
          }
        },
        { $unwind: '$rider' },
        {
          $project: {
            riderName: '$rider.name',
            email: '$rider.email',
            deliveryCount: 1
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        period,
        userGrowth,
        offerStats,
        paymentStats,
        topBusinesses,
        topRiders,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get analytics data', error);
  }
});

/**
 * System Management Routes
 */

// Get system health status
router.get('/system/health', AdminAuth.requireAdmin(), AdminAuth.auditLog(), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          readyState: mongoose.connection.readyState
        },
        server: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        }
      }
    };

    res.json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get system health', error);
  }
});

// Get detailed system metrics
router.get('/system/metrics', AdminAuth.requireAdmin(), AdminAuth.requirePermission('view_analytics'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const os = require('os');
    
    // Database metrics
    const dbStats = await mongoose.connection.db.stats();
    
    // System metrics
    const systemMetrics = {
      timestamp: new Date(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        loadAverage: os.loadavg()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        collections: dbStats.collections,
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexes: dbStats.indexes,
        indexSize: dbStats.indexSize
      }
    };

    res.json({
      success: true,
      data: systemMetrics
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get system metrics', error);
  }
});

// Get user activity monitoring
router.get('/monitoring/user-activity', AdminAuth.requireAdmin(), AdminAuth.requirePermission('view_analytics'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { period = '24h', limit = 100 } = req.query;
    
    // Calculate date range
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Get recent user registrations
    const recentRegistrations = await User.find({
      createdAt: { $gte: startDate }
    })
    .select('name email role createdAt isVerified')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    // Get recent offer activity
    const recentOffers = await Offer.find({
      createdAt: { $gte: startDate }
    })
    .populate('businessId', 'name email profile.businessName')
    .populate('riderId', 'name email')
    .select('status createdAt updatedAt payment.amount')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    // Get recent payment activity
    const recentPayments = await Payment.find({
      createdAt: { $gte: startDate }
    })
    .populate('businessId', 'name email profile.businessName')
    .populate('riderId', 'name email')
    .select('amount status method createdAt')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    // Activity summary
    const activitySummary = {
      period,
      totalRegistrations: recentRegistrations.length,
      totalOffers: recentOffers.length,
      totalPayments: recentPayments.length,
      registrationsByRole: {
        business: recentRegistrations.filter(u => u.role === 'business').length,
        rider: recentRegistrations.filter(u => u.role === 'rider').length
      },
      offersByStatus: recentOffers.reduce((acc, offer) => {
        acc[offer.status] = (acc[offer.status] || 0) + 1;
        return acc;
      }, {}),
      paymentsByStatus: recentPayments.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        summary: activitySummary,
        recentRegistrations,
        recentOffers,
        recentPayments,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get user activity', error);
  }
});

// Get platform performance metrics
router.get('/monitoring/performance', AdminAuth.requireAdmin(), AdminAuth.requirePermission('view_analytics'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    // Calculate date range
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Performance metrics aggregation
    const [
      avgDeliveryTime,
      offerAcceptanceRate,
      paymentSuccessRate,
      userVerificationRate
    ] = await Promise.all([
      // Average delivery time (from accepted to delivered)
      Offer.aggregate([
        {
          $match: {
            status: 'delivered',
            updatedAt: { $gte: startDate }
          }
        },
        {
          $addFields: {
            deliveryTime: {
              $subtract: ['$updatedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: '$deliveryTime' },
            minDeliveryTime: { $min: '$deliveryTime' },
            maxDeliveryTime: { $max: '$deliveryTime' },
            totalDeliveries: { $sum: 1 }
          }
        }
      ]),

      // Offer acceptance rate
      Offer.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalOffers: { $sum: 1 },
            acceptedOffers: {
              $sum: {
                $cond: [
                  { $ne: ['$status', 'pending'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            acceptanceRate: {
              $multiply: [
                { $divide: ['$acceptedOffers', '$totalOffers'] },
                100
              ]
            }
          }
        }
      ]),

      // Payment success rate
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            successfulPayments: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'completed'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            successRate: {
              $multiply: [
                { $divide: ['$successfulPayments', '$totalPayments'] },
                100
              ]
            }
          }
        }
      ]),

      // User verification rate
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            verifiedUsers: {
              $sum: {
                $cond: [
                  { $eq: ['$isVerified', true] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $addFields: {
            verificationRate: {
              $multiply: [
                { $divide: ['$verifiedUsers', '$totalUsers'] },
                100
              ]
            }
          }
        }
      ])
    ]);

    const performanceMetrics = {
      period,
      deliveryMetrics: avgDeliveryTime[0] || {
        avgDeliveryTime: 0,
        minDeliveryTime: 0,
        maxDeliveryTime: 0,
        totalDeliveries: 0
      },
      offerMetrics: offerAcceptanceRate[0] || {
        totalOffers: 0,
        acceptedOffers: 0,
        acceptanceRate: 0
      },
      paymentMetrics: paymentSuccessRate[0] || {
        totalPayments: 0,
        successfulPayments: 0,
        successRate: 0
      },
      userMetrics: userVerificationRate[0] || {
        totalUsers: 0,
        verifiedUsers: 0,
        verificationRate: 0
      },
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: performanceMetrics
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get performance metrics', error);
  }
});

// Get error monitoring and logs
router.get('/monitoring/errors', AdminAuth.requireAdmin(), AdminAuth.requirePermission('view_analytics'), AdminAuth.auditLog(), async (req, res) => {
  try {
    const { period = '24h', limit = 50 } = req.query;
    
    // Calculate date range
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // In a production environment, you would have an error logging system
    // For now, we'll simulate error monitoring with failed operations
    const [
      failedOffers,
      failedPayments,
      suspendedUsers
    ] = await Promise.all([
      // Failed or cancelled offers
      Offer.find({
        status: { $in: ['cancelled', 'failed'] },
        updatedAt: { $gte: startDate }
      })
      .populate('businessId', 'name email')
      .populate('riderId', 'name email')
      .select('status createdAt updatedAt payment.amount')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit)),

      // Failed payments
      Payment.find({
        status: { $in: ['failed', 'cancelled'] },
        createdAt: { $gte: startDate }
      })
      .populate('businessId', 'name email')
      .populate('riderId', 'name email')
      .select('amount status method createdAt error')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit)),

      // Recently suspended users
      User.find({
        'profile.suspended': true,
        'profile.suspendedAt': { $gte: startDate }
      })
      .select('name email role profile.suspensionReason profile.suspendedAt')
      .sort({ 'profile.suspendedAt': -1 })
      .limit(parseInt(limit))
    ]);

    const errorSummary = {
      period,
      totalFailedOffers: failedOffers.length,
      totalFailedPayments: failedPayments.length,
      totalSuspendedUsers: suspendedUsers.length,
      errorsByType: {
        offers: failedOffers.reduce((acc, offer) => {
          acc[offer.status] = (acc[offer.status] || 0) + 1;
          return acc;
        }, {}),
        payments: failedPayments.reduce((acc, payment) => {
          acc[payment.status] = (acc[payment.status] || 0) + 1;
          return acc;
        }, {})
      }
    };

    res.json({
      success: true,
      data: {
        summary: errorSummary,
        failedOffers,
        failedPayments,
        suspendedUsers,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get error monitoring data', error);
  }
});

// Get real-time platform status
router.get('/monitoring/status', AdminAuth.requireAdmin(), AdminAuth.auditLog(), async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Real-time counts
    const [
      activeUsers,
      activeOffers,
      onlineRiders,
      pendingPayments,
      recentErrors
    ] = await Promise.all([
      // Users active in the last hour (based on recent offers or payments)
      User.countDocuments({
        $or: [
          { updatedAt: { $gte: oneHourAgo } },
          { createdAt: { $gte: oneHourAgo } }
        ]
      }),

      // Active offers (not completed or cancelled)
      Offer.countDocuments({
        status: { $in: ['pending', 'accepted', 'picked_up', 'in_transit'] }
      }),

      // Available riders
      User.countDocuments({
        role: 'rider',
        'profile.isAvailable': true,
        isVerified: true
      }),

      // Pending payments
      Payment.countDocuments({
        status: 'pending'
      }),

      // Recent errors (last hour)
      Promise.all([
        Offer.countDocuments({
          status: { $in: ['cancelled', 'failed'] },
          updatedAt: { $gte: oneHourAgo }
        }),
        Payment.countDocuments({
          status: { $in: ['failed', 'cancelled'] },
          createdAt: { $gte: oneHourAgo }
        })
      ]).then(([failedOffers, failedPayments]) => failedOffers + failedPayments)
    ]);

    // System status determination
    let systemStatus = 'healthy';
    const issues = [];

    if (recentErrors > 10) {
      systemStatus = 'degraded';
      issues.push('High error rate detected');
    }

    if (onlineRiders < 5) {
      systemStatus = systemStatus === 'healthy' ? 'warning' : systemStatus;
      issues.push('Low rider availability');
    }

    if (pendingPayments > 50) {
      systemStatus = systemStatus === 'healthy' ? 'warning' : systemStatus;
      issues.push('High pending payment volume');
    }

    const platformStatus = {
      status: systemStatus,
      issues,
      metrics: {
        activeUsers,
        activeOffers,
        onlineRiders,
        pendingPayments,
        recentErrors
      },
      timestamp: now,
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: platformStatus
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get platform status', error);
  }
});

module.exports = router;