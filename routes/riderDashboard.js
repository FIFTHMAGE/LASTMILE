/**
 * Rider Dashboard Routes
 * Provides comprehensive dashboard endpoints for rider users
 */

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const DeliveryTracking = require('../models/DeliveryTracking');
const { ErrorHandler } = require('../middleware/errorHandler');
const { handleValidationErrors } = require('../middleware/validation');
const { cacheStrategies } = require('../services/CacheStrategies');
const LocationService = require('../services/LocationService');

const router = express.Router();

// Auth middleware function
function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Role middleware function
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: `Access denied. ${role} role required.` });
    }
    next();
  };
}

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireRole('rider'));

/**
 * Rider Dashboard Overview
 */
router.get('/overview', async (req, res) => {
  try {
    const riderId = req.user._id;
    
    // Try to get from cache first
    let dashboardData = await cacheStrategies.getAnalytics('rider_dashboard', riderId);
    
    if (!dashboardData) {
      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get comprehensive rider statistics
      const [
        totalDeliveries,
        activeDeliveries,
        completedDeliveries,
        totalEarnings,
        thisMonthEarnings,
        lastMonthEarnings,
        avgRating,
        recentDeliveries,
        deliveriesByStatus,
        monthlyTrends,
        nearbyOffers,
        recentPayments
      ] = await Promise.all([
        // Total deliveries count
        Offer.countDocuments({ acceptedBy: riderId }),
        
        // Active deliveries (accepted but not completed)
        Offer.countDocuments({ 
          acceptedBy: riderId, 
          status: { $in: ['accepted', 'picked_up', 'in_transit'] } 
        }),
        
        // Completed deliveries
        Offer.countDocuments({ 
          acceptedBy: riderId, 
          status: 'delivered' 
        }),
        
        // Total earnings
        Payment.aggregate([
          { $match: { rider: riderId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$riderEarnings' } } }
        ]),
        
        // This month earnings
        Payment.aggregate([
          { 
            $match: { 
              rider: riderId, 
              status: 'completed',
              processedAt: { $gte: thisMonth }
            } 
          },
          { $group: { _id: null, total: { $sum: '$riderEarnings' } } }
        ]),
        
        // Last month earnings
        Payment.aggregate([
          { 
            $match: { 
              rider: riderId, 
              status: 'completed',
              processedAt: { $gte: lastMonth, $lte: lastMonthEnd }
            } 
          },
          { $group: { _id: null, total: { $sum: '$riderEarnings' } } }
        ]),
        
        // Average rating calculation
        User.findById(riderId).select('profile.rating'),
        
        // Recent deliveries (last 10)
        Offer.find({ acceptedBy: riderId })
          .populate('business', 'name profile.businessName profile.businessPhone')
          .sort({ acceptedAt: -1 })
          .limit(10)
          .select('status payment.amount pickup.address delivery.address acceptedAt deliveredAt estimatedDistance'),
        
        // Deliveries by status
        Offer.aggregate([
          { $match: { acceptedBy: riderId } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        
        // Monthly trends (last 6 months)
        Offer.aggregate([
          {
            $match: {
              acceptedBy: riderId,
              acceptedAt: { $gte: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$acceptedAt' },
                month: { $month: '$acceptedAt' }
              },
              deliveries: { $sum: 1 },
              totalEarnings: { $sum: '$payment.amount' },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        
        // Get nearby offers (if rider location is available)
        getRiderLocation(riderId).then(async (location) => {
          if (location) {
            return await Offer.find({
              status: 'open',
              'pickup.coordinates': {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: location.coordinates
                  },
                  $maxDistance: 10000 // 10km radius
                }
              }
            }).limit(5).select('title payment.amount pickup.address delivery.address estimatedDistance');
          }
          return [];
        }),
        
        // Recent payments
        Payment.find({ rider: riderId })
          .sort({ processedAt: -1 })
          .limit(5)
          .select('amount riderEarnings status processedAt transactionId')
      ]);

      // Process the results
      dashboardData = {
        overview: {
          totalDeliveries,
          activeDeliveries,
          completedDeliveries,
          completionRate: totalDeliveries > 0 ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) : 0,
          totalEarnings: totalEarnings[0]?.total || 0,
          thisMonthEarnings: thisMonthEarnings[0]?.total || 0,
          lastMonthEarnings: lastMonthEarnings[0]?.total || 0,
          earningsChange: lastMonthEarnings[0]?.total > 0 ? 
            (((thisMonthEarnings[0]?.total || 0) - (lastMonthEarnings[0]?.total || 0)) / (lastMonthEarnings[0]?.total || 1) * 100).toFixed(1) : 0,
          avgRating: avgRating?.profile?.rating || 0,
          avgEarningsPerDelivery: completedDeliveries > 0 ? ((totalEarnings[0]?.total || 0) / completedDeliveries).toFixed(2) : 0
        },
        recentDeliveries: recentDeliveries.map(delivery => ({
          id: delivery._id,
          status: delivery.status,
          amount: delivery.payment.amount,
          pickup: delivery.pickup.address,
          delivery: delivery.delivery.address,
          acceptedAt: delivery.acceptedAt,
          deliveredAt: delivery.deliveredAt,
          estimatedDistance: delivery.estimatedDistance,
          business: delivery.business ? {
            name: delivery.business.name,
            businessName: delivery.business.profile?.businessName,
            phone: delivery.business.profile?.businessPhone
          } : null
        })),
        deliveriesByStatus: deliveriesByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyTrends: monthlyTrends.map(trend => ({
          month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
          deliveries: trend.deliveries,
          totalEarnings: trend.totalEarnings,
          completed: trend.completed,
          completionRate: trend.deliveries > 0 ? ((trend.completed / trend.deliveries) * 100).toFixed(1) : 0
        })),
        nearbyOffers: nearbyOffers.map(offer => ({
          id: offer._id,
          title: offer.title,
          amount: offer.payment.amount,
          pickup: offer.pickup.address,
          delivery: offer.delivery.address,
          estimatedDistance: offer.estimatedDistance
        })),
        recentPayments,
        lastUpdated: new Date()
      };

      // Cache the dashboard data
      await cacheStrategies.setAnalytics('rider_dashboard', dashboardData, riderId);
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get rider dashboard overview', error);
  }
});

/**
 * Helper function to get rider location
 */
async function getRiderLocation(riderId) {
  try {
    const rider = await User.findById(riderId).select('profile.currentLocation');
    return rider?.profile?.currentLocation;
  } catch (error) {
    console.error('Error getting rider location:', error);
    return null;
  }
}

/**
 * Get nearby offers for rider
 */
router.get('/nearby-offers', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { 
      lat, 
      lng, 
      maxDistance = 10000,
      minPayment,
      maxPayment,
      sortBy = 'distance',
      sortOrder = 'asc',
      limit = 20,
      page = 1
    } = req.query;

    let coordinates;
    
    // Use provided coordinates or get from rider profile
    if (lat && lng) {
      coordinates = [parseFloat(lng), parseFloat(lat)];
    } else {
      const rider = await User.findById(riderId).select('profile.currentLocation');
      if (rider?.profile?.currentLocation?.coordinates) {
        coordinates = rider.profile.currentLocation.coordinates;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Location required. Please provide lat/lng or update your profile location.'
        });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build aggregation pipeline
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: coordinates
          },
          distanceField: 'distanceFromRider',
          maxDistance: parseInt(maxDistance),
          spherical: true,
          query: { status: 'open' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'business',
          foreignField: '_id',
          as: 'businessInfo'
        }
      },
      {
        $addFields: {
          businessInfo: { $arrayElemAt: ['$businessInfo', 0] }
        }
      }
    ];

    // Add payment filters
    const matchConditions = {};
    if (minPayment) matchConditions['payment.amount'] = { $gte: parseFloat(minPayment) };
    if (maxPayment) matchConditions['payment.amount'] = { ...matchConditions['payment.amount'], $lte: parseFloat(maxPayment) };

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add sorting
    const sortStage = {};
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'distance':
        sortStage.distanceFromRider = sortDirection;
        break;
      case 'payment':
        sortStage['payment.amount'] = sortDirection;
        break;
      case 'created':
        sortStage.createdAt = sortDirection;
        break;
      default:
        sortStage.distanceFromRider = 1;
    }
    pipeline.push({ $sort: sortStage });

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute aggregation
    const offers = await Offer.aggregate(pipeline);

    // Get total count
    const countPipeline = pipeline.slice(0, -2);
    countPipeline.push({ $count: 'total' });
    const countResult = await Offer.aggregate(countPipeline);
    const totalOffers = countResult.length > 0 ? countResult[0].total : 0;

    // Format response
    const formattedOffers = offers.map(offer => ({
      id: offer._id,
      title: offer.title,
      description: offer.description,
      packageDetails: offer.packageDetails,
      pickup: offer.pickup,
      delivery: offer.delivery,
      payment: offer.payment,
      estimatedDistance: offer.estimatedDistance,
      estimatedDuration: offer.estimatedDuration,
      distanceFromRider: Math.round(offer.distanceFromRider),
      createdAt: offer.createdAt,
      business: {
        id: offer.businessInfo._id,
        name: offer.businessInfo.name,
        businessName: offer.businessInfo.profile?.businessName,
        businessPhone: offer.businessInfo.profile?.businessPhone
      }
    }));

    res.json({
      success: true,
      data: {
        offers: formattedOffers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOffers / parseInt(limit)),
          totalOffers,
          hasNext: skip + offers.length < totalOffers,
          hasPrev: parseInt(page) > 1
        },
        riderLocation: {
          coordinates,
          maxDistance: parseInt(maxDistance)
        }
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get nearby offers', error);
  }
});

/**
 * Get rider delivery history
 */
router.get('/deliveries', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      sortBy = 'acceptedAt', 
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = { acceptedBy: riderId };
    
    if (status) {
      const validStatuses = ['accepted', 'picked_up', 'in_transit', 'delivered', 'completed'];
      if (validStatuses.includes(status)) {
        filter.status = status;
      }
    }
    
    if (dateFrom || dateTo) {
      filter.acceptedAt = {};
      if (dateFrom) filter.acceptedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.acceptedAt.$lte = new Date(dateTo);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get deliveries and total count
    const [deliveries, totalDeliveries] = await Promise.all([
      Offer.find(filter)
        .populate('business', 'name profile.businessName profile.businessPhone')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('status payment pickup delivery acceptedAt deliveredAt estimatedDistance estimatedDuration'),
      Offer.countDocuments(filter)
    ]);

    // Get status summary
    const statusSummary = await Offer.aggregate([
      { $match: { acceptedBy: riderId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        deliveries: deliveries.map(delivery => ({
          id: delivery._id,
          status: delivery.status,
          payment: delivery.payment,
          pickup: {
            address: delivery.pickup.address,
            coordinates: delivery.pickup.coordinates
          },
          delivery: {
            address: delivery.delivery.address,
            coordinates: delivery.delivery.coordinates
          },
          estimatedDistance: delivery.estimatedDistance,
          estimatedDuration: delivery.estimatedDuration,
          acceptedAt: delivery.acceptedAt,
          deliveredAt: delivery.deliveredAt,
          business: delivery.business ? {
            id: delivery.business._id,
            name: delivery.business.name,
            businessName: delivery.business.profile?.businessName,
            phone: delivery.business.profile?.businessPhone
          } : null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalDeliveries / parseInt(limit)),
          totalDeliveries,
          hasNext: skip + deliveries.length < totalDeliveries,
          hasPrev: parseInt(page) > 1
        },
        statusSummary: statusSummary.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get rider deliveries', error);
  }
});

/**
 * Get rider earnings
 */
router.get('/earnings', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { 
      period = 'all',
      page = 1, 
      limit = 20,
      dateFrom,
      dateTo
    } = req.query;

    // Calculate date range based on period
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'today':
        dateFilter = {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        dateFilter = { $gte: weekStart };
        break;
      case 'month':
        dateFilter = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1)
        };
        break;
      case 'year':
        dateFilter = {
          $gte: new Date(now.getFullYear(), 0, 1)
        };
        break;
      case 'custom':
        if (dateFrom || dateTo) {
          dateFilter = {};
          if (dateFrom) dateFilter.$gte = new Date(dateFrom);
          if (dateTo) dateFilter.$lte = new Date(dateTo);
        }
        break;
    }

    // Build payment query
    const paymentQuery = { rider: riderId, status: 'completed' };
    if (Object.keys(dateFilter).length > 0) {
      paymentQuery.processedAt = dateFilter;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get payments and summary
    const [payments, totalPayments, earningsSummary] = await Promise.all([
      Payment.find(paymentQuery)
        .populate('offerId', 'pickup.address delivery.address business')
        .populate({
          path: 'offerId',
          populate: {
            path: 'business',
            select: 'name profile.businessName'
          }
        })
        .sort({ processedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(paymentQuery),
      Payment.aggregate([
        { $match: paymentQuery },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$riderEarnings' },
            totalPayments: { $sum: 1 },
            avgEarning: { $avg: '$riderEarnings' },
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$platformFee' }
          }
        }
      ])
    ]);

    // Get daily earnings for the period
    const dailyEarnings = await Payment.aggregate([
      { $match: paymentQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$processedAt' } }
          },
          earnings: { $sum: '$riderEarnings' },
          deliveries: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    const summary = earningsSummary[0] || {
      totalEarnings: 0,
      totalPayments: 0,
      avgEarning: 0,
      totalAmount: 0,
      totalFees: 0
    };

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalEarnings: summary.totalEarnings,
          totalDeliveries: summary.totalPayments,
          averageEarning: summary.avgEarning,
          totalAmount: summary.totalAmount,
          platformFees: summary.totalFees
        },
        dailyEarnings: dailyEarnings.map(day => ({
          date: day._id.date,
          earnings: day.earnings,
          deliveries: day.deliveries
        })),
        payments: payments.map(payment => ({
          id: payment._id,
          amount: payment.amount,
          riderEarnings: payment.riderEarnings,
          platformFee: payment.platformFee,
          status: payment.status,
          processedAt: payment.processedAt,
          transactionId: payment.transactionId,
          offer: payment.offerId ? {
            id: payment.offerId._id,
            pickup: payment.offerId.pickup?.address,
            delivery: payment.offerId.delivery?.address,
            business: payment.offerId.business ? {
              name: payment.offerId.business.name,
              businessName: payment.offerId.business.profile?.businessName
            } : null
          } : null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / parseInt(limit)),
          totalPayments,
          hasNext: skip + payments.length < totalPayments,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get rider earnings', error);
  }
});

/**
 * Update rider availability
 */
router.patch('/availability', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be a boolean value'
      });
    }

    const rider = await User.findByIdAndUpdate(
      riderId,
      { 
        'profile.isAvailable': isAvailable,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('profile.isAvailable');

    if (!rider) {
      return ErrorHandler.notFound(res, 'Rider not found');
    }

    // Invalidate user caches
    await cacheStrategies.invalidateUserProfile(riderId);
    await cacheStrategies.invalidateAvailableRiders();

    res.json({
      success: true,
      message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
      data: {
        isAvailable: rider.profile.isAvailable
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to update rider availability', error);
  }
});

/**
 * Update rider location
 */
router.patch('/location', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const coordinates = [parseFloat(lng), parseFloat(lat)];

    // Validate coordinates
    if (coordinates[0] < -180 || coordinates[0] > 180 || 
        coordinates[1] < -90 || coordinates[1] > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    const rider = await User.findByIdAndUpdate(
      riderId,
      { 
        'profile.currentLocation': {
          type: 'Point',
          coordinates: coordinates
        },
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('profile.currentLocation');

    if (!rider) {
      return ErrorHandler.notFound(res, 'Rider not found');
    }

    // Invalidate location-based caches
    await cacheStrategies.invalidateUserProfile(riderId);
    await cacheStrategies.invalidateAvailableRiders();
    await cacheStrategies.cache.clearPattern('offers:nearby:*');

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: {
          lat: coordinates[1],
          lng: coordinates[0],
          coordinates: coordinates
        }
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to update rider location', error);
  }
});

/**
 * Get rider notifications
 */
router.get('/notifications', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { 
      page = 1, 
      limit = 20, 
      isRead, 
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = { user: riderId };
    
    if (isRead !== undefined) {
      filter.read = isRead === 'true';
    }
    
    if (type) {
      filter.type = type;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get notifications and total count
    const [notifications, totalNotifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('offer', 'pickup.address delivery.address payment.amount')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: riderId, read: false })
    ]);

    res.json({
      success: true,
      data: {
        notifications: notifications.map(notification => ({
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          read: notification.read,
          createdAt: notification.createdAt,
          readAt: notification.readAt,
          offer: notification.offer ? {
            id: notification.offer._id,
            pickup: notification.offer.pickup?.address,
            delivery: notification.offer.delivery?.address,
            amount: notification.offer.payment?.amount
          } : null,
          data: notification.data
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalNotifications / parseInt(limit)),
          totalNotifications,
          hasNext: skip + notifications.length < totalNotifications,
          hasPrev: parseInt(page) > 1
        },
        unreadCount
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get rider notifications', error);
  }
});

/**
 * Mark notification as read
 */
router.patch('/notifications/:notificationId/read', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: riderId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return ErrorHandler.notFound(res, 'Notification not found');
    }

    // Invalidate notification caches
    await cacheStrategies.invalidateUserNotifications(riderId);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification: {
          id: notification._id,
          read: notification.read,
          readAt: notification.readAt
        }
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to mark notification as read', error);
  }
});

/**
 * Get rider profile
 */
router.get('/profile', async (req, res) => {
  try {
    const riderId = req.user._id;
    
    const rider = await User.findById(riderId).select('-password');
    if (!rider) {
      return ErrorHandler.notFound(res, 'Rider not found');
    }

    res.json({
      success: true,
      data: {
        profile: rider.getProfileData()
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get rider profile', error);
  }
});

/**
 * Update rider profile
 */
router.patch('/profile', async (req, res) => {
  try {
    const riderId = req.user._id;
    const updates = req.body;

    // Validate allowed updates
    const allowedUpdates = [
      'name', 'profile.phone', 'profile.vehicleType'
    ];
    
    const updateData = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid updates provided'
      });
    }

    updateData.updatedAt = new Date();

    const rider = await User.findByIdAndUpdate(
      riderId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!rider) {
      return ErrorHandler.notFound(res, 'Rider not found');
    }

    // Invalidate user caches
    await cacheStrategies.invalidateUserProfile(riderId);
    await cacheStrategies.invalidateUserAuth(rider.email, riderId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: rider.getProfileData()
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to update rider profile', error);
  }
});

/**
 * Get rider statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const riderId = req.user._id;
    const { period = '30d' } = req.query;

    // Calculate date range
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get comprehensive statistics
    const [
      totalStats,
      periodStats,
      statusBreakdown,
      avgMetrics,
      riderProfile
    ] = await Promise.all([
      // All-time statistics
      Offer.aggregate([
        { $match: { acceptedBy: riderId } },
        {
          $group: {
            _id: null,
            totalDeliveries: { $sum: 1 },
            completedDeliveries: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            totalDistance: { $sum: '$estimatedDistance' },
            totalEarnings: { $sum: '$payment.amount' }
          }
        }
      ]),

      // Period-specific statistics
      Offer.aggregate([
        { 
          $match: { 
            acceptedBy: riderId,
            acceptedAt: { $gte: startDate }
          } 
        },
        {
          $group: {
            _id: null,
            periodDeliveries: { $sum: 1 },
            periodCompleted: {
              $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
            },
            periodEarnings: { $sum: '$payment.amount' }
          }
        }
      ]),

      // Status breakdown
      Offer.aggregate([
        { $match: { acceptedBy: riderId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Average metrics for completed deliveries
      Offer.aggregate([
        {
          $match: {
            acceptedBy: riderId,
            status: 'delivered',
            acceptedAt: { $exists: true },
            deliveredAt: { $exists: true }
          }
        },
        {
          $addFields: {
            deliveryTime: {
              $subtract: ['$deliveredAt', '$acceptedAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: '$deliveryTime' },
            avgDistance: { $avg: '$estimatedDistance' },
            avgEarning: { $avg: '$payment.amount' }
          }
        }
      ]),

      // Rider profile for rating
      User.findById(riderId).select('profile.rating profile.completedDeliveries')
    ]);

    const stats = {
      period,
      total: totalStats[0] || {
        totalDeliveries: 0,
        completedDeliveries: 0,
        totalDistance: 0,
        totalEarnings: 0
      },
      periodData: periodStats[0] || {
        periodDeliveries: 0,
        periodCompleted: 0,
        periodEarnings: 0
      },
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      averages: avgMetrics[0] ? {
        deliveryTime: Math.round(avgMetrics[0].avgDeliveryTime / (1000 * 60)), // Minutes
        distance: Math.round(avgMetrics[0].avgDistance || 0), // Meters
        earning: parseFloat((avgMetrics[0].avgEarning || 0).toFixed(2))
      } : {
        deliveryTime: 0,
        distance: 0,
        earning: 0
      },
      profile: {
        rating: riderProfile?.profile?.rating || 0,
        completedDeliveries: riderProfile?.profile?.completedDeliveries || 0
      }
    };

    // Calculate completion rate
    stats.total.completionRate = stats.total.totalDeliveries > 0 ? 
      ((stats.total.completedDeliveries / stats.total.totalDeliveries) * 100).toFixed(1) : 0;

    stats.periodData.completionRate = stats.periodData.periodDeliveries > 0 ? 
      ((stats.periodData.periodCompleted / stats.periodData.periodDeliveries) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get rider statistics', error);
  }
});

module.exports = router;