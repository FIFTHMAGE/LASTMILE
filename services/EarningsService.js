const Earnings = require('../models/Earnings');
const Payment = require('../models/Payment');
const Offer = require('../models/Offer');
const User = require('../models/User');

/**
 * Service class for handling rider earnings operations
 */
class EarningsService {
  
  /**
   * Generate earnings record when an offer is completed
   * @param {String} offerId - Offer ID
   * @returns {Promise<Object>}
   */
  static async generateEarningsFromOffer(offerId) {
    try {
      // Get the completed offer with all details
      const offer = await Offer.findById(offerId)
        .populate('acceptedBy', 'name email profile')
        .populate('business', 'name email profile');
      
      if (!offer) {
        throw new Error('Offer not found');
      }
      
      if (offer.status !== 'completed') {
        throw new Error('Only completed offers can generate earnings');
      }
      
      if (!offer.acceptedBy) {
        throw new Error('Offer must be accepted by a rider');
      }
      
      // Check if earnings already exist
      const existingEarnings = await Earnings.findOne({ offer: offerId });
      if (existingEarnings) {
        return {
          success: true,
          message: 'Earnings already generated for this offer',
          earnings: existingEarnings.getFormattedData()
        };
      }
      
      // Find or create payment record
      let payment = await Payment.findOne({ offer: offerId });
      
      if (!payment) {
        // Create payment record if it doesn't exist
        const platformFee = Payment.calculatePlatformFee(offer.payment.amount);
        
        payment = new Payment({
          offer: offerId,
          business: offer.business._id,
          rider: offer.acceptedBy._id,
          totalAmount: offer.payment.amount,
          platformFee: platformFee,
          riderEarnings: offer.payment.amount - platformFee,
          currency: offer.payment.currency || 'USD',
          paymentMethod: this.mapPaymentMethod(offer.payment.paymentMethod),
          status: offer.payment.paymentMethod === 'cash' ? 'completed' : 'pending'
        });
        
        await payment.save();
        
        if (payment.status === 'completed') {
          await payment.markAsCompleted();
        }
      }
      
      // Create earnings record
      const earnings = await Earnings.createFromOffer(offer, payment);
      
      // Update rider's completed deliveries count
      await User.findByIdAndUpdate(
        offer.acceptedBy._id,
        { $inc: { 'profile.completedDeliveries': 1 } }
      );
      
      return {
        success: true,
        message: 'Earnings generated successfully',
        earnings: earnings.getFormattedData(),
        payment: payment.getDetails()
      };
      
    } catch (error) {
      console.error('Error generating earnings:', error);
      throw error;
    }
  }
  
  /**
   * Get comprehensive earnings dashboard for a rider
   * @param {String} riderId - Rider ID
   * @param {Object} options - Dashboard options
   * @returns {Promise<Object>}
   */
  static async getRiderEarningsDashboard(riderId, options = {}) {
    try {
      const { period = 'month' } = options;
      
      // Get earnings summary for the period
      const earningsSummary = await Earnings.getEarningsForPeriod(riderId, period);
      
      // Get all-time stats
      const allTimeStats = await Earnings.getRiderEarningsSummary(riderId);
      
      // Get recent earnings with offer details
      const recentEarnings = await Earnings.find({ rider: riderId })
        .sort({ earnedAt: -1 })
        .limit(10)
        .populate('offer', 'title pickup delivery estimatedDistance estimatedDuration')
        .populate('payment', 'status processedAt paymentMethod')
        .lean();
      
      // Get pending payments
      const pendingEarnings = await Earnings.find({
        rider: riderId,
        paymentStatus: { $in: ['pending', 'processing'] }
      })
        .populate('offer', 'title pickup delivery')
        .sort({ earnedAt: -1 })
        .lean();
      
      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(earningsSummary.summary);
      
      return {
        success: true,
        period,
        summary: earningsSummary.summary,
        allTimeStats: allTimeStats.summary,
        paymentMethods: earningsSummary.paymentMethods,
        dailyEarnings: earningsSummary.dailyEarnings,
        recentEarnings: recentEarnings.map(earning => ({
          id: earning._id,
          finalAmount: earning.netAmount + (earning.bonusAmount || 0),
          paymentStatus: earning.paymentStatus,
          earnedAt: earning.earnedAt,
          offer: earning.offer,
          distance: earning.distance,
          duration: earning.duration
        })),
        pendingEarnings: pendingEarnings.map(earning => ({
          id: earning._id,
          finalAmount: earning.netAmount + (earning.bonusAmount || 0),
          earnedAt: earning.earnedAt,
          offer: earning.offer
        })),
        performanceMetrics
      };
      
    } catch (error) {
      console.error('Error getting rider earnings dashboard:', error);
      throw error;
    }
  }
  
  /**
   * Get earnings history with pagination and filters
   * @param {String} riderId - Rider ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>}
   */
  static async getEarningsHistory(riderId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        paymentStatus,
        startDate,
        endDate,
        sortBy = 'earnedAt',
        sortOrder = 'desc'
      } = options;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const query = { rider: riderId };
      
      // Apply filters
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      if (startDate || endDate) {
        query.earnedAt = {};
        if (startDate) query.earnedAt.$gte = new Date(startDate);
        if (endDate) query.earnedAt.$lte = new Date(endDate);
      }
      
      // Determine sort direction
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // Get earnings with pagination
      const earnings = await Earnings.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('offer', 'title pickup delivery estimatedDistance estimatedDuration')
        .populate('payment', 'status processedAt paymentMethod transactionId')
        .lean();
      
      // Get total count
      const total = await Earnings.countDocuments(query);
      
      // Format earnings data
      const formattedEarnings = earnings.map(earning => ({
        id: earning._id,
        grossAmount: earning.grossAmount,
        platformFee: earning.platformFee,
        netAmount: earning.netAmount,
        bonusAmount: earning.bonusAmount || 0,
        finalAmount: earning.netAmount + (earning.bonusAmount || 0),
        paymentStatus: earning.paymentStatus,
        paymentMethod: earning.paymentMethod,
        earnedAt: earning.earnedAt,
        paidAt: earning.paidAt,
        distance: earning.distance,
        duration: earning.duration,
        offer: earning.offer,
        payment: earning.payment,
        adjustments: earning.adjustments || []
      }));
      
      return {
        success: true,
        earnings: formattedEarnings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      };
      
    } catch (error) {
      console.error('Error getting earnings history:', error);
      throw error;
    }
  }
  
  /**
   * Process bonus payment for a rider
   * @param {String} earningsId - Earnings record ID
   * @param {Number} bonusAmount - Bonus amount
   * @param {String} reason - Reason for bonus
   * @param {String} adminId - Admin user ID
   * @returns {Promise<Object>}
   */
  static async addBonus(earningsId, bonusAmount, reason, adminId) {
    try {
      const earnings = await Earnings.findById(earningsId);
      
      if (!earnings) {
        throw new Error('Earnings record not found');
      }
      
      if (bonusAmount <= 0) {
        throw new Error('Bonus amount must be positive');
      }
      
      await earnings.addBonus(bonusAmount, reason);
      
      // Log the bonus addition
      console.log(`Bonus added: ${bonusAmount} to earnings ${earningsId} by admin ${adminId}. Reason: ${reason}`);
      
      return {
        success: true,
        message: 'Bonus added successfully',
        earnings: earnings.getFormattedData()
      };
      
    } catch (error) {
      console.error('Error adding bonus:', error);
      throw error;
    }
  }
  
  /**
   * Add adjustment to earnings (positive or negative)
   * @param {String} earningsId - Earnings record ID
   * @param {Object} adjustment - Adjustment details
   * @returns {Promise<Object>}
   */
  static async addAdjustment(earningsId, adjustment) {
    try {
      const earnings = await Earnings.findById(earningsId);
      
      if (!earnings) {
        throw new Error('Earnings record not found');
      }
      
      await earnings.addAdjustment(adjustment);
      
      return {
        success: true,
        message: 'Adjustment added successfully',
        earnings: earnings.getFormattedData()
      };
      
    } catch (error) {
      console.error('Error adding adjustment:', error);
      throw error;
    }
  }
  
  /**
   * Get earnings comparison with platform averages
   * @param {String} riderId - Rider ID
   * @param {String} period - Comparison period
   * @returns {Promise<Object>}
   */
  static async getEarningsComparison(riderId, period = 'month') {
    try {
      // Get rider's earnings
      const riderEarnings = await Earnings.getEarningsForPeriod(riderId, period);
      
      // Get platform averages (simplified calculation)
      const platformStats = await this.getPlatformAverages(period);
      
      // Calculate comparison percentages
      const comparison = {
        earningsPerDelivery: {
          rider: riderEarnings.summary.averagePerDelivery || 0,
          platform: platformStats.averagePerDelivery,
          difference: this.calculatePercentageDifference(
            riderEarnings.summary.averagePerDelivery || 0,
            platformStats.averagePerDelivery
          )
        },
        earningsPerHour: {
          rider: riderEarnings.summary.averagePerHour || 0,
          platform: platformStats.averagePerHour,
          difference: this.calculatePercentageDifference(
            riderEarnings.summary.averagePerHour || 0,
            platformStats.averagePerHour
          )
        },
        earningsPerKm: {
          rider: riderEarnings.summary.averagePerKm || 0,
          platform: platformStats.averagePerKm,
          difference: this.calculatePercentageDifference(
            riderEarnings.summary.averagePerKm || 0,
            platformStats.averagePerKm
          )
        }
      };
      
      return {
        success: true,
        period,
        comparison,
        riderSummary: riderEarnings.summary,
        platformAverages: platformStats
      };
      
    } catch (error) {
      console.error('Error getting earnings comparison:', error);
      throw error;
    }
  }
  
  /**
   * Update payment status for earnings
   * @param {String} earningsId - Earnings record ID
   * @param {String} status - New payment status
   * @returns {Promise<Object>}
   */
  static async updatePaymentStatus(earningsId, status) {
    try {
      const earnings = await Earnings.findById(earningsId);
      
      if (!earnings) {
        throw new Error('Earnings record not found');
      }
      
      await earnings.updatePaymentStatus(status);
      
      // Also update the related payment record
      const payment = await Payment.findById(earnings.payment);
      if (payment) {
        switch (status) {
          case 'processing':
            await payment.markAsProcessing();
            break;
          case 'paid':
            await payment.markAsCompleted();
            break;
          case 'failed':
            await payment.markAsFailed('Payment processing failed');
            break;
        }
      }
      
      return {
        success: true,
        message: 'Payment status updated successfully',
        earnings: earnings.getFormattedData()
      };
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }
  
  // Helper Methods
  
  /**
   * Map offer payment method to earnings payment method
   * @param {String} offerPaymentMethod - Payment method from offer
   * @returns {String}
   */
  static mapPaymentMethod(offerPaymentMethod) {
    const mapping = {
      'cash': 'cash',
      'card': 'card',
      'digital': 'digital',
      'credit_card': 'card',
      'debit_card': 'card',
      'paypal': 'digital',
      'stripe': 'digital'
    };
    
    return mapping[offerPaymentMethod] || 'card';
  }
  
  /**
   * Calculate performance metrics
   * @param {Object} summary - Earnings summary
   * @returns {Object}
   */
  static calculatePerformanceMetrics(summary) {
    const {
      totalFinal = 0,
      totalDeliveries = 0,
      totalDuration = 0,
      totalDistance = 0
    } = summary;
    
    return {
      efficiency: {
        earningsPerHour: totalDuration > 0 ? (totalFinal / totalDuration) * 60 : 0,
        earningsPerKm: totalDistance > 0 ? totalFinal / (totalDistance / 1000) : 0,
        earningsPerDelivery: totalDeliveries > 0 ? totalFinal / totalDeliveries : 0
      },
      productivity: {
        deliveriesPerHour: totalDuration > 0 ? (totalDeliveries / totalDuration) * 60 : 0,
        averageDistance: totalDeliveries > 0 ? totalDistance / totalDeliveries : 0,
        averageDuration: totalDeliveries > 0 ? totalDuration / totalDeliveries : 0
      }
    };
  }
  
  /**
   * Get platform averages (simplified implementation)
   * @param {String} period - Time period
   * @returns {Promise<Object>}
   */
  static async getPlatformAverages(period) {
    try {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      const platformStats = await Earnings.aggregate([
        {
          $match: {
            earnedAt: { $gte: startDate, $lte: now },
            paymentStatus: 'paid'
          }
        },
        {
          $addFields: {
            finalAmount: {
              $add: [
                '$netAmount',
                { $ifNull: ['$bonusAmount', 0] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            averagePerDelivery: { $avg: '$finalAmount' },
            averagePerHour: {
              $avg: {
                $cond: [
                  { $gt: ['$duration', 0] },
                  { $multiply: [{ $divide: ['$finalAmount', '$duration'] }, 60] },
                  0
                ]
              }
            },
            averagePerKm: {
              $avg: {
                $cond: [
                  { $gt: ['$distance', 0] },
                  { $divide: ['$finalAmount', { $divide: ['$distance', 1000] }] },
                  0
                ]
              }
            },
            totalRiders: { $addToSet: '$rider' }
          }
        },
        {
          $project: {
            _id: 0,
            averagePerDelivery: { $round: ['$averagePerDelivery', 2] },
            averagePerHour: { $round: ['$averagePerHour', 2] },
            averagePerKm: { $round: ['$averagePerKm', 2] },
            totalRiders: { $size: '$totalRiders' }
          }
        }
      ]);
      
      return platformStats.length > 0 ? platformStats[0] : {
        averagePerDelivery: 15.75,
        averagePerHour: 18.50,
        averagePerKm: 1.25,
        totalRiders: 0
      };
      
    } catch (error) {
      console.error('Error getting platform averages:', error);
      // Return default values if calculation fails
      return {
        averagePerDelivery: 15.75,
        averagePerHour: 18.50,
        averagePerKm: 1.25,
        totalRiders: 0
      };
    }
  }
  
  /**
   * Calculate percentage difference
   * @param {Number} value1 - First value
   * @param {Number} value2 - Second value (reference)
   * @returns {Number}
   */
  static calculatePercentageDifference(value1, value2) {
    if (value2 === 0) return 0;
    return parseFloat((((value1 - value2) / value2) * 100).toFixed(1));
  }
}

module.exports = EarningsService;