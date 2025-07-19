const Payment = require('../models/Payment');
const Offer = require('../models/Offer');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * EarningsService - Handles rider earnings calculations and tracking
 */
class EarningsService {
  constructor(options = {}) {
    this.options = {
      defaultCurrency: 'USD',
      ...options
    };
  }

  /**
   * Get comprehensive earnings summary for a rider
   * @param {String} riderId - Rider user ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Earnings summary
   */
  async getRiderEarningsSummary(riderId, options = {}) {
    try {
      const { currency = this.options.defaultCurrency } = options;

      // Get basic payment stats
      const paymentStats = await Payment.getPaymentStats(riderId, 'rider');

      // Get time-based earnings
      const timeBasedEarnings = await this._getTimeBasedEarnings(riderId, currency);

      // Get delivery performance metrics
      const performanceMetrics = await this._getPerformanceMetrics(riderId);

      // Get recent earnings activity
      const recentActivity = await this._getRecentEarningsActivity(riderId, 10);

      // Calculate earnings trends
      const trends = await this._calculateEarningsTrends(riderId);

      return {
        summary: {
          totalEarnings: paymentStats.completedAmount || 0,
          totalDeliveries: paymentStats.completedPayments || 0,
          averageEarningsPerDelivery: paymentStats.averageAmount || 0,
          pendingEarnings: await this._getPendingEarnings(riderId),
          currency
        },
        timeBasedEarnings,
        performanceMetrics,
        recentActivity,
        trends
      };
    } catch (error) {
      console.error('Failed to get rider earnings summary:', error);
      throw error;
    }
  }

  /**
   * Get detailed earnings history for a rider
   * @param {String} riderId - Rider user ID
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Earnings history with pagination
   */
  async getRiderEarningsHistory(riderId, filters = {}) {
    try {
      const {
        startDate,
        endDate,
        status = 'completed',
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build query
      const query = { rider: riderId };
      if (status) query.status = status;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Get payments with offer details
      const payments = await Payment.find(query)
        .populate({
          path: 'offer',
          select: 'title packageDetails pickup delivery createdAt',
          populate: {
            path: 'business',
            select: 'businessName email'
          }
        })
        .sort(sort)
        .limit(limit)
        .skip(skip);

      // Get total count
      const total = await Payment.countDocuments(query);

      // Format earnings history
      const earningsHistory = payments.map(payment => ({
        id: payment._id,
        date: payment.createdAt,
        earnings: payment.riderEarnings,
        totalAmount: payment.totalAmount,
        platformFee: payment.platformFee,
        currency: payment.currency,
        status: payment.status,
        offer: {
          id: payment.offer._id,
          title: payment.offer.title,
          pickup: payment.offer.pickup,
          delivery: payment.offer.delivery,
          business: payment.offer.business
        },
        transactionId: payment.transactionId,
        processedAt: payment.processedAt
      }));

      return {
        earningsHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          totalEarnings: earningsHistory.reduce((sum, item) => sum + item.earnings, 0),
          totalDeliveries: earningsHistory.length,
          averageEarnings: earningsHistory.length > 0 ? 
            earningsHistory.reduce((sum, item) => sum + item.earnings, 0) / earningsHistory.length : 0
        }
      };
    } catch (error) {
      console.error('Failed to get rider earnings history:', error);
      throw error;
    }
  }

  /**
   * Get earnings breakdown by time period
   * @param {String} riderId - Rider user ID
   * @param {String} period - Time period ('daily', 'weekly', 'monthly')
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Earnings breakdown
   */
  async getEarningsBreakdown(riderId, period = 'monthly', options = {}) {
    try {
      const { startDate, endDate, limit = 12 } = options;

      let groupBy;
      let dateFormat;
      
      switch (period) {
        case 'daily':
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          };
          dateFormat = '%Y-%m-%d';
          break;
        case 'weekly':
          groupBy = {
            year: { $year: '$createdAt' },
            week: { $week: '$createdAt' }
          };
          dateFormat = '%Y-W%U';
          break;
        case 'monthly':
        default:
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          };
          dateFormat = '%Y-%m';
          break;
      }

      const matchQuery = {
        rider: new mongoose.Types.ObjectId(riderId),
        status: 'completed'
      };

      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }

      const breakdown = await Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: groupBy,
            totalEarnings: { $sum: '$riderEarnings' },
            totalAmount: { $sum: '$totalAmount' },
            platformFees: { $sum: '$platformFee' },
            deliveryCount: { $sum: 1 },
            averageEarnings: { $avg: '$riderEarnings' },
            date: { $first: { $dateToString: { format: dateFormat, date: '$createdAt' } } }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
        { $limit: limit }
      ]);

      return breakdown.map(item => ({
        period: item.date,
        totalEarnings: item.totalEarnings,
        totalAmount: item.totalAmount,
        platformFees: item.platformFees,
        deliveryCount: item.deliveryCount,
        averageEarnings: item.averageEarnings,
        periodData: item._id
      }));
    } catch (error) {
      console.error('Failed to get earnings breakdown:', error);
      throw error;
    }
  }

  /**
   * Calculate rider performance metrics
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Object>} Performance metrics
   */
  async getRiderPerformanceMetrics(riderId) {
    try {
      const performanceMetrics = await this._getPerformanceMetrics(riderId);
      const earningsEfficiency = await this._calculateEarningsEfficiency(riderId);
      const deliveryPatterns = await this._analyzeDeliveryPatterns(riderId);

      return {
        ...performanceMetrics,
        earningsEfficiency,
        deliveryPatterns
      };
    } catch (error) {
      console.error('Failed to get rider performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get pending earnings for a rider
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Number>} Pending earnings amount
   * @private
   */
  async _getPendingEarnings(riderId) {
    try {
      const pendingPayments = await Payment.find({
        rider: riderId,
        status: { $in: ['pending', 'processing'] }
      });

      return pendingPayments.reduce((total, payment) => total + payment.riderEarnings, 0);
    } catch (error) {
      console.error('Failed to get pending earnings:', error);
      return 0;
    }
  }

  /**
   * Get time-based earnings (today, week, month, year)
   * @param {String} riderId - Rider user ID
   * @param {String} currency - Currency code
   * @returns {Promise<Object>} Time-based earnings
   * @private
   */
  async _getTimeBasedEarnings(riderId, currency) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisYear = new Date(now.getFullYear(), 0, 1);

      const timeRanges = [
        { key: 'today', start: today },
        { key: 'thisWeek', start: thisWeek },
        { key: 'thisMonth', start: thisMonth },
        { key: 'thisYear', start: thisYear }
      ];

      const earnings = {};

      for (const range of timeRanges) {
        const result = await Payment.aggregate([
          {
            $match: {
              rider: new mongoose.Types.ObjectId(riderId),
              status: 'completed',
              createdAt: { $gte: range.start }
            }
          },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$riderEarnings' },
              deliveryCount: { $sum: 1 },
              averageEarnings: { $avg: '$riderEarnings' }
            }
          }
        ]);

        earnings[range.key] = {
          totalEarnings: result[0]?.totalEarnings || 0,
          deliveryCount: result[0]?.deliveryCount || 0,
          averageEarnings: result[0]?.averageEarnings || 0,
          currency
        };
      }

      return earnings;
    } catch (error) {
      console.error('Failed to get time-based earnings:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a rider
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Object>} Performance metrics
   * @private
   */
  async _getPerformanceMetrics(riderId) {
    try {
      // Get completion rate
      const totalOffers = await Offer.countDocuments({ acceptedBy: riderId });
      const completedOffers = await Offer.countDocuments({ 
        acceptedBy: riderId, 
        status: { $in: ['completed', 'delivered'] }
      });
      const completionRate = totalOffers > 0 ? (completedOffers / totalOffers) * 100 : 0;

      // Get average delivery time (mock calculation - would need delivery tracking)
      const averageDeliveryTime = await this._calculateAverageDeliveryTime(riderId);

      // Get rider rating (mock - would come from rating system)
      const averageRating = await this._getRiderAverageRating(riderId);

      return {
        completionRate: Math.round(completionRate * 100) / 100,
        totalDeliveries: completedOffers,
        averageDeliveryTime,
        averageRating,
        totalOffersAccepted: totalOffers
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get recent earnings activity
   * @param {String} riderId - Rider user ID
   * @param {Number} limit - Number of recent activities
   * @returns {Promise<Array>} Recent earnings activity
   * @private
   */
  async _getRecentEarningsActivity(riderId, limit = 10) {
    try {
      const recentPayments = await Payment.find({
        rider: riderId,
        status: 'completed'
      })
      .populate('offer', 'title pickup delivery')
      .sort({ createdAt: -1 })
      .limit(limit);

      return recentPayments.map(payment => ({
        id: payment._id,
        date: payment.createdAt,
        earnings: payment.riderEarnings,
        currency: payment.currency,
        offerTitle: payment.offer?.title || 'Delivery',
        pickup: payment.offer?.pickup,
        delivery: payment.offer?.delivery
      }));
    } catch (error) {
      console.error('Failed to get recent earnings activity:', error);
      return [];
    }
  }

  /**
   * Calculate earnings trends
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Object>} Earnings trends
   * @private
   */
  async _calculateEarningsTrends(riderId) {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const lastMonth = new Date(currentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const currentMonthEarnings = await Payment.aggregate([
        {
          $match: {
            rider: new mongoose.Types.ObjectId(riderId),
            status: 'completed',
            createdAt: { $gte: currentMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$riderEarnings' },
            deliveryCount: { $sum: 1 }
          }
        }
      ]);

      const lastMonthEarnings = await Payment.aggregate([
        {
          $match: {
            rider: new mongoose.Types.ObjectId(riderId),
            status: 'completed',
            createdAt: { $gte: lastMonth, $lt: currentMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$riderEarnings' },
            deliveryCount: { $sum: 1 }
          }
        }
      ]);

      const currentEarnings = currentMonthEarnings[0]?.totalEarnings || 0;
      const lastEarnings = lastMonthEarnings[0]?.totalEarnings || 0;
      const currentDeliveries = currentMonthEarnings[0]?.deliveryCount || 0;
      const lastDeliveries = lastMonthEarnings[0]?.deliveryCount || 0;

      const earningsChange = lastEarnings > 0 ? 
        ((currentEarnings - lastEarnings) / lastEarnings) * 100 : 0;
      const deliveryChange = lastDeliveries > 0 ? 
        ((currentDeliveries - lastDeliveries) / lastDeliveries) * 100 : 0;

      return {
        earningsChange: Math.round(earningsChange * 100) / 100,
        deliveryChange: Math.round(deliveryChange * 100) / 100,
        currentMonthEarnings: currentEarnings,
        lastMonthEarnings: lastEarnings,
        currentMonthDeliveries: currentDeliveries,
        lastMonthDeliveries: lastDeliveries
      };
    } catch (error) {
      console.error('Failed to calculate earnings trends:', error);
      return {
        earningsChange: 0,
        deliveryChange: 0,
        currentMonthEarnings: 0,
        lastMonthEarnings: 0,
        currentMonthDeliveries: 0,
        lastMonthDeliveries: 0
      };
    }
  }

  /**
   * Calculate earnings efficiency metrics
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Object>} Earnings efficiency
   * @private
   */
  async _calculateEarningsEfficiency(riderId) {
    try {
      // Calculate earnings per hour (mock - would need time tracking)
      const totalEarnings = await Payment.aggregate([
        {
          $match: {
            rider: new mongoose.Types.ObjectId(riderId),
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$riderEarnings' },
            deliveryCount: { $sum: 1 }
          }
        }
      ]);

      const earnings = totalEarnings[0]?.totalEarnings || 0;
      const deliveries = totalEarnings[0]?.deliveryCount || 0;

      // Mock calculations - in real implementation, would use actual time data
      const estimatedHoursPerDelivery = 1.5; // Average 1.5 hours per delivery
      const totalHours = deliveries * estimatedHoursPerDelivery;
      const earningsPerHour = totalHours > 0 ? earnings / totalHours : 0;
      const earningsPerDelivery = deliveries > 0 ? earnings / deliveries : 0;

      return {
        earningsPerHour: Math.round(earningsPerHour * 100) / 100,
        earningsPerDelivery: Math.round(earningsPerDelivery * 100) / 100,
        estimatedTotalHours: totalHours,
        totalDeliveries: deliveries
      };
    } catch (error) {
      console.error('Failed to calculate earnings efficiency:', error);
      return {
        earningsPerHour: 0,
        earningsPerDelivery: 0,
        estimatedTotalHours: 0,
        totalDeliveries: 0
      };
    }
  }

  /**
   * Analyze delivery patterns
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Object>} Delivery patterns
   * @private
   */
  async _analyzeDeliveryPatterns(riderId) {
    try {
      // Analyze delivery patterns by day of week and hour
      const patterns = await Payment.aggregate([
        {
          $match: {
            rider: new mongoose.Types.ObjectId(riderId),
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              dayOfWeek: { $dayOfWeek: '$createdAt' },
              hour: { $hour: '$createdAt' }
            },
            deliveryCount: { $sum: 1 },
            totalEarnings: { $sum: '$riderEarnings' },
            averageEarnings: { $avg: '$riderEarnings' }
          }
        },
        { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } }
      ]);

      // Group by day of week
      const dayPatterns = {};
      const hourPatterns = {};

      patterns.forEach(pattern => {
        const day = pattern._id.dayOfWeek;
        const hour = pattern._id.hour;

        if (!dayPatterns[day]) {
          dayPatterns[day] = {
            deliveryCount: 0,
            totalEarnings: 0,
            averageEarnings: 0
          };
        }

        if (!hourPatterns[hour]) {
          hourPatterns[hour] = {
            deliveryCount: 0,
            totalEarnings: 0,
            averageEarnings: 0
          };
        }

        dayPatterns[day].deliveryCount += pattern.deliveryCount;
        dayPatterns[day].totalEarnings += pattern.totalEarnings;
        
        hourPatterns[hour].deliveryCount += pattern.deliveryCount;
        hourPatterns[hour].totalEarnings += pattern.totalEarnings;
      });

      // Calculate averages
      Object.keys(dayPatterns).forEach(day => {
        const count = dayPatterns[day].deliveryCount;
        dayPatterns[day].averageEarnings = count > 0 ? 
          dayPatterns[day].totalEarnings / count : 0;
      });

      Object.keys(hourPatterns).forEach(hour => {
        const count = hourPatterns[hour].deliveryCount;
        hourPatterns[hour].averageEarnings = count > 0 ? 
          hourPatterns[hour].totalEarnings / count : 0;
      });

      return {
        dayPatterns,
        hourPatterns,
        totalPatterns: patterns.length
      };
    } catch (error) {
      console.error('Failed to analyze delivery patterns:', error);
      return {
        dayPatterns: {},
        hourPatterns: {},
        totalPatterns: 0
      };
    }
  }

  /**
   * Calculate average delivery time (mock implementation)
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Number>} Average delivery time in minutes
   * @private
   */
  async _calculateAverageDeliveryTime(riderId) {
    // Mock implementation - in real system would calculate from delivery tracking data
    const deliveryCount = await Offer.countDocuments({ 
      acceptedBy: riderId, 
      status: { $in: ['completed', 'delivered'] }
    });
    
    // Mock average delivery time based on delivery count (more experienced = faster)
    const baseTime = 45; // 45 minutes base
    const experienceBonus = Math.min(deliveryCount * 0.5, 15); // Up to 15 minutes faster
    return Math.max(baseTime - experienceBonus, 20); // Minimum 20 minutes
  }

  /**
   * Get rider average rating (mock implementation)
   * @param {String} riderId - Rider user ID
   * @returns {Promise<Number>} Average rating
   * @private
   */
  async _getRiderAverageRating(riderId) {
    // Mock implementation - in real system would come from rating system
    const deliveryCount = await Offer.countDocuments({ 
      acceptedBy: riderId, 
      status: { $in: ['completed', 'delivered'] }
    });
    
    // Mock rating based on delivery count (more deliveries = higher rating)
    const baseRating = 4.0;
    const experienceBonus = Math.min(deliveryCount * 0.01, 0.8); // Up to 0.8 points
    return Math.min(baseRating + experienceBonus, 5.0);
  }
}

module.exports = EarningsService;