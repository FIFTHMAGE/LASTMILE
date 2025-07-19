const mongoose = require('mongoose');

/**
 * Earnings Schema - Tracks rider earnings from completed deliveries
 */
const earningsSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
    index: true
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
    index: true
  },
  
  // Earnings breakdown
  grossAmount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Bonus and adjustments
  bonusAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  bonusReason: String,
  adjustments: [{
    amount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Delivery metrics
  distance: {
    type: Number,
    min: 0 // in meters
  },
  duration: {
    type: Number,
    min: 0 // in minutes
  },
  
  // Payment status
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending',
    index: true
  },
  paidAt: Date,
  
  // Metadata
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'digital', 'platform_credit'],
    required: true
  },
  
  // Timestamps
  earnedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
earningsSchema.index({ rider: 1, earnedAt: -1 });
earningsSchema.index({ rider: 1, paymentStatus: 1 });
earningsSchema.index({ offer: 1 }, { unique: true }); // One earnings record per offer

// Virtual for final amount after adjustments
earningsSchema.virtual('finalAmount').get(function() {
  const adjustmentTotal = this.adjustments.reduce((total, adj) => total + adj.amount, 0);
  return this.netAmount + this.bonusAmount + adjustmentTotal;
});

// Virtual for earnings per hour
earningsSchema.virtual('earningsPerHour').get(function() {
  if (!this.duration || this.duration === 0) return 0;
  return (this.finalAmount / this.duration) * 60; // Convert to per hour
});

// Virtual for earnings per kilometer
earningsSchema.virtual('earningsPerKm').get(function() {
  if (!this.distance || this.distance === 0) return 0;
  return this.finalAmount / (this.distance / 1000); // Convert meters to km
});

// Pre-save middleware to calculate net amount
earningsSchema.pre('save', function(next) {
  // Ensure net amount is calculated correctly
  this.netAmount = this.grossAmount - this.platformFee;
  next();
});

// Instance Methods

/**
 * Add bonus to earnings
 * @param {Number} amount - Bonus amount
 * @param {String} reason - Reason for bonus
 * @returns {Promise<Earnings>}
 */
earningsSchema.methods.addBonus = async function(amount, reason) {
  if (amount <= 0) {
    throw new Error('Bonus amount must be positive');
  }
  
  this.bonusAmount = (this.bonusAmount || 0) + amount;
  this.bonusReason = reason;
  return await this.save();
};

/**
 * Add adjustment to earnings
 * @param {Object} adjustment - Adjustment details
 * @returns {Promise<Earnings>}
 */
earningsSchema.methods.addAdjustment = async function(adjustment) {
  if (!adjustment || typeof adjustment.amount !== 'number') {
    throw new Error('Valid adjustment with amount is required');
  }
  
  if (!adjustment.reason) {
    throw new Error('Adjustment reason is required');
  }
  
  this.adjustments.push({
    amount: adjustment.amount,
    reason: adjustment.reason,
    appliedBy: adjustment.appliedBy,
    appliedAt: new Date()
  });
  
  return await this.save();
};

/**
 * Update payment status
 * @param {String} status - New payment status
 * @returns {Promise<Earnings>}
 */
earningsSchema.methods.updatePaymentStatus = async function(status) {
  const validStatuses = ['pending', 'processing', 'paid', 'failed'];
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid payment status: ${status}`);
  }
  
  this.paymentStatus = status;
  
  if (status === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  return await this.save();
};

/**
 * Get formatted earnings data for API response
 * @returns {Object}
 */
earningsSchema.methods.getFormattedData = function() {
  return {
    id: this._id,
    rider: this.rider,
    offer: this.offer,
    grossAmount: this.grossAmount,
    platformFee: this.platformFee,
    netAmount: this.netAmount,
    bonusAmount: this.bonusAmount,
    bonusReason: this.bonusReason,
    finalAmount: this.finalAmount,
    distance: this.distance,
    duration: this.duration,
    earningsPerHour: this.earningsPerHour,
    earningsPerKm: this.earningsPerKm,
    paymentStatus: this.paymentStatus,
    paymentMethod: this.paymentMethod,
    earnedAt: this.earnedAt,
    paidAt: this.paidAt,
    adjustments: this.adjustments.map(adj => ({
      amount: adj.amount,
      reason: adj.reason,
      appliedAt: adj.appliedAt
    }))
  };
};

// Static Methods

/**
 * Create earnings record from completed offer
 * @param {Object} offer - Completed offer
 * @param {Object} payment - Payment record
 * @returns {Promise<Earnings>}
 */
earningsSchema.statics.createFromOffer = async function(offer, payment) {
  if (!offer || offer.status !== 'completed') {
    throw new Error('Only completed offers can generate earnings');
  }
  
  if (!offer.acceptedBy) {
    throw new Error('Offer must be accepted by a rider');
  }
  
  if (!payment) {
    throw new Error('Payment record is required');
  }
  
  // Check if earnings already exist for this offer
  const existingEarnings = await this.findOne({ offer: offer._id });
  if (existingEarnings) {
    return existingEarnings;
  }
  
  // Calculate earnings
  const grossAmount = payment.totalAmount;
  const platformFee = payment.platformFee;
  const netAmount = payment.riderEarnings;
  
  // Create earnings record
  const earnings = new this({
    rider: offer.acceptedBy,
    offer: offer._id,
    payment: payment._id,
    grossAmount,
    platformFee,
    netAmount,
    distance: offer.actualDistance || offer.estimatedDistance,
    duration: offer.actualDuration || offer.estimatedDuration,
    paymentMethod: payment.paymentMethod === 'credit_card' || payment.paymentMethod === 'debit_card' ? 'card' : 
                   payment.paymentMethod === 'paypal' || payment.paymentMethod === 'stripe' ? 'digital' : 'card',
    paymentStatus: payment.status === 'completed' ? 'paid' : 'pending',
    currency: payment.currency,
    earnedAt: offer.completedAt || new Date()
  });
  
  if (payment.status === 'completed') {
    earnings.paidAt = payment.processedAt || new Date();
  }
  
  await earnings.save();
  return earnings;
};

/**
 * Get rider earnings summary
 * @param {String} riderId - Rider ID
 * @param {Object} options - Filter options
 * @returns {Promise<Object>}
 */
earningsSchema.statics.getRiderEarningsSummary = async function(riderId, options = {}) {
  const { startDate, endDate, paymentStatus } = options;
  
  const match = { rider: new mongoose.Types.ObjectId(riderId) };
  
  if (startDate && endDate) {
    match.earnedAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  } else if (startDate) {
    match.earnedAt = { $gte: new Date(startDate) };
  } else if (endDate) {
    match.earnedAt = { $lte: new Date(endDate) };
  }
  
  if (paymentStatus) {
    match.paymentStatus = paymentStatus;
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $addFields: {
        finalAmount: {
          $add: [
            '$netAmount',
            { $ifNull: ['$bonusAmount', 0] },
            {
              $sum: {
                $map: {
                  input: { $ifNull: ['$adjustments', []] },
                  as: 'adj',
                  in: '$$adj.amount'
                }
              }
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$grossAmount' },
        totalFees: { $sum: '$platformFee' },
        totalNet: { $sum: '$netAmount' },
        totalBonus: { $sum: { $ifNull: ['$bonusAmount', 0] } },
        totalFinal: { $sum: '$finalAmount' },
        totalDeliveries: { $sum: 1 },
        totalDistance: { $sum: { $ifNull: ['$distance', 0] } },
        totalDuration: { $sum: { $ifNull: ['$duration', 0] } },
        paidEarnings: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$finalAmount', 0]
          }
        },
        pendingEarnings: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$finalAmount', 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalEarnings: 1,
        totalFees: 1,
        totalNet: 1,
        totalBonus: 1,
        totalFinal: 1,
        totalDeliveries: 1,
        totalDistance: 1,
        totalDuration: 1,
        paidEarnings: 1,
        pendingEarnings: 1,
        averagePerDelivery: {
          $cond: [
            { $gt: ['$totalDeliveries', 0] },
            { $divide: ['$totalFinal', '$totalDeliveries'] },
            0
          ]
        },
        averagePerHour: {
          $cond: [
            { $gt: ['$totalDuration', 0] },
            { $multiply: [{ $divide: ['$totalFinal', '$totalDuration'] }, 60] },
            0
          ]
        },
        averagePerKm: {
          $cond: [
            { $gt: ['$totalDistance', 0] },
            { $divide: ['$totalFinal', { $divide: ['$totalDistance', 1000] }] },
            0
          ]
        }
      }
    }
  ]);
  
  // Get payment method breakdown
  const paymentMethodBreakdown = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        total: { $sum: '$netAmount' }
      }
    },
    {
      $project: {
        _id: 0,
        method: '$_id',
        count: 1,
        total: 1
      }
    }
  ]);
  
  // Get daily earnings
  const dailyEarnings = await this.aggregate([
    { $match: match },
    {
      $addFields: {
        finalAmount: {
          $add: [
            '$netAmount',
            { $ifNull: ['$bonusAmount', 0] },
            {
              $sum: {
                $map: {
                  input: { $ifNull: ['$adjustments', []] },
                  as: 'adj',
                  in: '$$adj.amount'
                }
              }
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$earnedAt' } },
        earnings: { $sum: '$finalAmount' },
        deliveries: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        earnings: 1,
        deliveries: 1
      }
    }
  ]);
  
  // Get recent earnings
  const recentEarnings = await this.find(match)
    .sort({ earnedAt: -1 })
    .limit(10)
    .populate('offer', 'title pickup delivery')
    .lean();
  
  return {
    summary: result.length > 0 ? result[0] : {
      totalEarnings: 0,
      totalFees: 0,
      totalNet: 0,
      totalBonus: 0,
      totalFinal: 0,
      totalDeliveries: 0,
      totalDistance: 0,
      totalDuration: 0,
      paidEarnings: 0,
      pendingEarnings: 0,
      averagePerDelivery: 0,
      averagePerHour: 0,
      averagePerKm: 0
    },
    paymentMethods: paymentMethodBreakdown,
    dailyEarnings,
    recentEarnings
  };
};

/**
 * Get earnings for a specific time period
 * @param {String} riderId - Rider ID
 * @param {String} period - Time period ('day', 'week', 'month', 'year')
 * @returns {Promise<Object>}
 */
earningsSchema.statics.getEarningsForPeriod = async function(riderId, period = 'week') {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  
  return this.getRiderEarningsSummary(riderId, { startDate, endDate: now });
};

/**
 * Get top earning riders
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
earningsSchema.statics.getTopEarners = async function(options = {}) {
  const { period = 'month', limit = 10 } = options;
  
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
  
  return this.aggregate([
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
            { $ifNull: ['$bonusAmount', 0] },
            {
              $sum: {
                $map: {
                  input: { $ifNull: ['$adjustments', []] },
                  as: 'adj',
                  in: '$$adj.amount'
                }
              }
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: '$rider',
        totalEarnings: { $sum: '$finalAmount' },
        totalDeliveries: { $sum: 1 },
        averagePerDelivery: { $avg: '$finalAmount' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'riderInfo'
      }
    },
    {
      $unwind: '$riderInfo'
    },
    {
      $project: {
        riderId: '$_id',
        riderName: '$riderInfo.name',
        riderRating: '$riderInfo.profile.rating',
        totalEarnings: 1,
        totalDeliveries: 1,
        averagePerDelivery: 1
      }
    },
    { $sort: { totalEarnings: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('Earnings', earningsSchema);