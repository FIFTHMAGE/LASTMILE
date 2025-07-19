/**
 * Business Dashboard Routes
 * Provides comprehensive dashboard endpoints for business users
 */

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ErrorHandler } = require('../middleware/errorHandler');
const { validateInput } = require('../middleware/validation');
const { cacheStrategies } = require('../services/CacheStrategies');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireRole('business'));

/**
 * Business Dashboard Overview
 */
router.get('/overview', async (req, res) => {
  try {
    const businessId = req.user._id;
    const cacheKey = `business:dashboard:${businessId}`;
    
    // Try to get from cache first
    let dashboardData = await cacheStrategies.getAnalytics('business_dashboard', businessId);
    
    if (!dashboardData) {
      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get comprehensive business statistics
      const [
        totalOffers,
        activeOffers,
        completedOffers,
        totalSpent,
        thisMonthSpent,
        lastMonthSpent,
        avgDeliveryTime,
        recentOffers,
        offersByStatus,
        monthlyTrends,
        topRiders,
        recentPayments
      ] = await Promise.all([
        // Total offers count
        Offer.countDocuments({ business: businessId }),
        
        // Active offers (not completed or cancelled)
        Offer.countDocuments({ 
          business: businessId, 
          status: { $in: ['open', 'accepted', 'picked_up', 'in_transit'] } 
        }),
        
        // Completed offers
        Offer.countDocuments({ 
          business: businessId, 
          status: 'delivered' 
        }),
        
        // Total amount spent
        Payment.aggregate([
          { $match: { businessId: businessId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        
        // This month spending
        Payment.aggregate([
          { 
            $match: { 
              businessId: businessId, 
              status: 'completed',
              createdAt: { $gte: thisMonth }
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        
        // Last month spending
        Payment.aggregate([
          { 
            $match: { 
              businessId: businessId, 
              status: 'completed',
              createdAt: { $gte: lastMonth, $lte: lastMonthEnd }
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        
        // Average delivery time
        Offer.aggregate([
          {
            $match: {
              business: businessId,
              status: 'delivered',
              createdAt: { $gte: thisMonth }
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
              avgTime: { $avg: '$deliveryTime' },
              count: { $sum: 1 }
            }
          }
        ]),
        
        // Recent offers (last 10)
        Offer.find({ business: businessId })
          .populate('acceptedBy', 'name profile.phone profile.rating')
          .sort({ createdAt: -1 })
          .limit(10)
          .select('status payment.amount pickup.address delivery.address createdAt acceptedAt deliveredAt'),
        
        // Offers by status
        Offer.aggregate([
          { $match: { business: businessId } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        
        // Monthly trends (last 6 months)
        Offer.aggregate([
          {
            $match: {
              business: businessId,
              createdAt: { $gte: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              offers: { $sum: 1 },
              totalAmount: { $sum: '$payment.amount' },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        
        // Top riders by deliveries for this business
        Offer.aggregate([
          {
            $match: {
              business: businessId,
              status: 'delivered',
              createdAt: { $gte: thisMonth }
            }
          },
          { $group: { _id: '$acceptedBy', deliveries: { $sum: 1 } } },
          { $sort: { deliveries: -1 } },
          { $limit: 5 },
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
              name: '$rider.name',
              rating: '$rider.profile.rating',
              deliveries: 1
            }
          }
        ]),
        
        // Recent payments
        Payment.find({ businessId: businessId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('amount status method createdAt transactionId')
      ]);

      // Process the results
      dashboardData = {
        overview: {
          totalOffers,
          activeOffers,
          completedOffers,
          completionRate: totalOffers > 0 ? ((completedOffers / totalOffers) * 100).toFixed(1) : 0,
          totalSpent: totalSpent[0]?.total || 0,
          thisMonthSpent: thisMonthSpent[0]?.total || 0,
          lastMonthSpent: lastMonthSpent[0]?.total || 0,
          spendingChange: lastMonthSpent[0]?.total > 0 ? 
            (((thisMonthSpent[0]?.total || 0) - (lastMonthSpent[0]?.total || 0)) / (lastMonthSpent[0]?.total || 1) * 100).toFixed(1) : 0,
          avgDeliveryTime: avgDeliveryTime[0] ? Math.round(avgDeliveryTime[0].avgTime / (1000 * 60)) : 0, // Convert to minutes
          deliveriesThisMonth: avgDeliveryTime[0]?.count || 0
        },
        recentOffers: recentOffers.map(offer => ({
          id: offer._id,
          status: offer.status,
          amount: offer.payment.amount,
          pickup: offer.pickup.address,
          delivery: offer.delivery.address,
          createdAt: offer.createdAt,
          acceptedAt: offer.acceptedAt,
          deliveredAt: offer.deliveredAt,
          rider: offer.acceptedBy ? {
            name: offer.acceptedBy.name,
            phone: offer.acceptedBy.profile?.phone,
            rating: offer.acceptedBy.profile?.rating
          } : null
        })),
        offersByStatus: offersByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyTrends: monthlyTrends.map(trend => ({
          month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
          offers: trend.offers,
          totalAmount: trend.totalAmount,
          completed: trend.completed,
          completionRate: trend.offers > 0 ? ((trend.completed / trend.offers) * 100).toFixed(1) : 0
        })),
        topRiders,
        recentPayments,
        lastUpdated: new Date()
      };

      // Cache the dashboard data
      await cacheStrategies.setAnalytics('business_dashboard', dashboardData, businessId);
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get business dashboard overview', error);
  }
});

/**
 * Business Offers Management
 */
router.get('/offers', async (req, res) => {
  try {
    const businessId = req.user._id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      minAmount,
      maxAmount
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { business: businessId };
    
    if (status) {
      filter.status = status;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    
    if (minAmount || maxAmount) {
      filter['payment.amount'] = {};
      if (minAmount) filter['payment.amount'].$gte = parseFloat(minAmount);
      if (maxAmount) filter['payment.amount'].$lte = parseFloat(maxAmount);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get offers and total count
    const [offers, totalOffers] = await Promise.all([
      Offer.find(filter)
        .populate('acceptedBy', 'name profile.phone profile.rating profile.vehicleType')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('status payment pickup delivery createdAt acceptedAt deliveredAt estimatedDistance estimatedDuration'),
      Offer.countDocuments(filter)
    ]);

    // Get status summary
    const statusSummary = await Offer.aggregate([
      { $match: { business: businessId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        offers: offers.map(offer => ({
          id: offer._id,
          status: offer.status,
          payment: offer.payment,
          pickup: {
            address: offer.pickup.address,
            coordinates: offer.pickup.coordinates
          },
          delivery: {
            address: offer.delivery.address,
            coordinates: offer.delivery.coordinates
          },
          estimatedDistance: offer.estimatedDistance,
          estimatedDuration: offer.estimatedDuration,
          createdAt: offer.createdAt,
          acceptedAt: offer.acceptedAt,
          deliveredAt: offer.deliveredAt,
          rider: offer.acceptedBy ? {
            id: offer.acceptedBy._id,
            name: offer.acceptedBy.name,
            phone: offer.acceptedBy.profile?.phone,
            rating: offer.acceptedBy.profile?.rating,
            vehicleType: offer.acceptedBy.profile?.vehicleType
          } : null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOffers / limit),
          totalOffers,
          hasNext: skip + offers.length < totalOffers,
          hasPrev: page > 1
        },
        statusSummary: statusSummary.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get business offers', error);
  }
});

/**
 * Get specific offer details
 */
router.get('/offers/:offerId', async (req, res) => {
  try {
    const businessId = req.user._id;
    const { offerId } = req.params;

    const offer = await Offer.findOne({ _id: offerId, business: businessId })
      .populate('acceptedBy', 'name profile.phone profile.rating profile.vehicleType profile.currentLocation')
      .populate('business', 'name profile.businessName profile.businessPhone');

    if (!offer) {
      return ErrorHandler.notFound(res, 'Offer not found');
    }

    // Get delivery tracking if available
    const DeliveryTracking = require('../models/DeliveryTracking');
    const tracking = await DeliveryTracking.findOne({ offerId: offerId })
      .sort({ createdAt: -1 });

    // Get related payment
    const payment = await Payment.findOne({ offerId: offerId });

    res.json({
      success: true,
      data: {
        offer: {
          id: offer._id,
          status: offer.status,
          packageDetails: offer.packageDetails,
          pickup: offer.pickup,
          delivery: offer.delivery,
          payment: offer.payment,
          estimatedDistance: offer.estimatedDistance,
          estimatedDuration: offer.estimatedDuration,
          actualDistance: offer.actualDistance,
          actualDuration: offer.actualDuration,
          createdAt: offer.createdAt,
          acceptedAt: offer.acceptedAt,
          pickedUpAt: offer.pickedUpAt,
          inTransitAt: offer.inTransitAt,
          deliveredAt: offer.deliveredAt,
          statusHistory: offer.statusHistory,
          rider: offer.acceptedBy ? {
            id: offer.acceptedBy._id,
            name: offer.acceptedBy.name,
            phone: offer.acceptedBy.profile?.phone,
            rating: offer.acceptedBy.profile?.rating,
            vehicleType: offer.acceptedBy.profile?.vehicleType,
            currentLocation: offer.acceptedBy.profile?.currentLocation
          } : null
        },
        tracking: tracking ? {
          currentLocation: tracking.currentLocation,
          estimatedArrival: tracking.estimatedArrival,
          lastUpdate: tracking.updatedAt,
          events: tracking.events
        } : null,
        payment: payment ? {
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt
        } : null
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get offer details', error);
  }
});

/**
 * Cancel an offer
 */
router.patch('/offers/:offerId/cancel', validateInput, async (req, res) => {
  try {
    const businessId = req.user._id;
    const { offerId } = req.params;
    const { reason } = req.body;

    const offer = await Offer.findOne({ _id: offerId, business: businessId });
    
    if (!offer) {
      return ErrorHandler.notFound(res, 'Offer not found');
    }

    // Check if offer can be cancelled
    if (['delivered', 'completed', 'cancelled'].includes(offer.status)) {
      return ErrorHandler.badRequest(res, 'Cannot cancel offer in current status');
    }

    // Update offer status
    const updateResult = offer.updateStatus('cancelled', businessId, { 
      notes: reason || 'Cancelled by business owner' 
    });

    await offer.save();

    // Invalidate related caches
    await cacheStrategies.invalidateOffer(offerId, businessId, offer.acceptedBy);
    await cacheStrategies.invalidateAnalytics('business_dashboard');

    // Send notification to rider if offer was accepted
    if (offer.acceptedBy) {
      const NotificationService = require('../services/NotificationService');
      await NotificationService.createNotification({
        userId: offer.acceptedBy,
        type: 'offer_cancelled',
        title: 'Offer Cancelled',
        message: `The delivery offer has been cancelled by the business owner.`,
        data: { offerId: offer._id, reason },
        channels: ['in_app', 'push']
      });
    }

    res.json({
      success: true,
      message: 'Offer cancelled successfully',
      data: {
        offer: {
          id: offer._id,
          status: offer.status,
          cancelledAt: offer.cancelledAt,
          statusHistory: offer.statusHistory
        }
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to cancel offer', error);
  }
});

/**
 * Business Payment and Earnings Overview
 */
router.get('/payments', async (req, res) => {
  try {
    const businessId = req.user._id;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      dateFrom, 
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = { businessId: businessId };
    
    if (status) {
      filter.status = status;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get payments and total count
    const [payments, totalPayments] = await Promise.all([
      Payment.find(filter)
        .populate('riderId', 'name profile.phone')
        .populate('offerId', 'pickup.address delivery.address')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(filter)
    ]);

    // Get payment summary
    const paymentSummary = await Payment.aggregate([
      { $match: { businessId: businessId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        payments: payments.map(payment => ({
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          method: payment.method,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt,
          processedAt: payment.processedAt,
          rider: payment.riderId ? {
            id: payment.riderId._id,
            name: payment.riderId.name,
            phone: payment.riderId.profile?.phone
          } : null,
          offer: payment.offerId ? {
            id: payment.offerId._id,
            pickup: payment.offerId.pickup?.address,
            delivery: payment.offerId.delivery?.address
          } : null
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / limit),
          totalPayments,
          hasNext: skip + payments.length < totalPayments,
          hasPrev: page > 1
        },
        summary: {
          byStatus: paymentSummary.reduce((acc, item) => {
            acc[item._id] = {
              count: item.count,
              totalAmount: item.totalAmount
            };
            return acc;
          }, {}),
          totalSpent: paymentSummary.reduce((sum, item) => 
            item._id === 'completed' ? sum + item.totalAmount : sum, 0
          )
        }
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get business payments', error);
  }
});

/**
 * Business Analytics and Reports
 */
router.get('/analytics', async (req, res) => {
  try {
    const businessId = req.user._id;
    const { period = '30d', type = 'overview' } = req.query;

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
      case '1y':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    let analyticsData;

    if (type === 'overview') {
      // General analytics overview
      const [
        offerTrends,
        spendingTrends,
        performanceMetrics,
        riderPerformance
      ] = await Promise.all([
        // Offer trends over time
        Offer.aggregate([
          {
            $match: {
              business: businessId,
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
              },
              offers: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
              },
              totalAmount: { $sum: '$payment.amount' }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]),

        // Spending trends
        Payment.aggregate([
          {
            $match: {
              businessId: businessId,
              status: 'completed',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
              },
              amount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]),

        // Performance metrics
        Offer.aggregate([
          {
            $match: {
              business: businessId,
              status: 'delivered',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              avgDeliveryTime: {
                $avg: { $subtract: ['$deliveredAt', '$acceptedAt'] }
              },
              totalDeliveries: { $sum: 1 },
              avgAmount: { $avg: '$payment.amount' },
              totalAmount: { $sum: '$payment.amount' }
            }
          }
        ]),

        // Rider performance for this business
        Offer.aggregate([
          {
            $match: {
              business: businessId,
              status: 'delivered',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: '$acceptedBy',
              deliveries: { $sum: 1 },
              totalEarned: { $sum: '$payment.amount' },
              avgDeliveryTime: {
                $avg: { $subtract: ['$deliveredAt', '$acceptedAt'] }
              }
            }
          },
          { $sort: { deliveries: -1 } },
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
              name: '$rider.name',
              rating: '$rider.profile.rating',
              deliveries: 1,
              totalEarned: 1,
              avgDeliveryTime: { $divide: ['$avgDeliveryTime', 1000 * 60] } // Convert to minutes
            }
          }
        ])
      ]);

      analyticsData = {
        period,
        offerTrends: offerTrends.map(trend => ({
          date: trend._id.date,
          offers: trend.offers,
          completed: trend.completed,
          completionRate: trend.offers > 0 ? ((trend.completed / trend.offers) * 100).toFixed(1) : 0,
          totalAmount: trend.totalAmount
        })),
        spendingTrends: spendingTrends.map(trend => ({
          date: trend._id.date,
          amount: trend.amount,
          count: trend.count,
          avgAmount: trend.count > 0 ? (trend.amount / trend.count).toFixed(2) : 0
        })),
        performance: performanceMetrics[0] ? {
          avgDeliveryTime: Math.round(performanceMetrics[0].avgDeliveryTime / (1000 * 60)), // Minutes
          totalDeliveries: performanceMetrics[0].totalDeliveries,
          avgAmount: performanceMetrics[0].avgAmount.toFixed(2),
          totalAmount: performanceMetrics[0].totalAmount
        } : null,
        topRiders: riderPerformance
      };
    }

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get business analytics', error);
  }
});

/**
 * Business Profile and Settings
 */
router.get('/profile', async (req, res) => {
  try {
    const businessId = req.user._id;
    
    const business = await User.findById(businessId).select('-password');
    if (!business) {
      return ErrorHandler.notFound(res, 'Business not found');
    }

    res.json({
      success: true,
      data: {
        profile: business.getProfileData()
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to get business profile', error);
  }
});

/**
 * Update business profile
 */
router.patch('/profile', validateInput, async (req, res) => {
  try {
    const businessId = req.user._id;
    const updates = req.body;

    // Validate allowed updates
    const allowedUpdates = [
      'name', 'profile.businessName', 'profile.businessAddress', 
      'profile.businessPhone'
    ];
    
    const updateData = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return ErrorHandler.badRequest(res, 'No valid updates provided');
    }

    updateData.updatedAt = new Date();

    const business = await User.findByIdAndUpdate(
      businessId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!business) {
      return ErrorHandler.notFound(res, 'Business not found');
    }

    // Invalidate user caches
    await cacheStrategies.invalidateUserProfile(businessId);
    await cacheStrategies.invalidateUserAuth(business.email, businessId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        profile: business.getProfileData()
      }
    });
  } catch (error) {
    ErrorHandler.serverError(res, 'Failed to update business profile', error);
  }
});

module.exports = router;