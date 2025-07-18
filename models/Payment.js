const mongoose = require('mongoose');

/**
 * Payment Schema - Handles payment transactions for delivery offers
 */
const paymentSchema = new mongoose.Schema({
  // Core payment information
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
    index: true
  },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Payment amounts
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  riderEarnings: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  
  // Payment method and processing
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'wallet']
  },
  paymentMethodDetails: {
    last4: String,
    brand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  
  // Transaction status and tracking
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'],
    default: 'pending',
    index: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  externalTransactionId: {
    type: String,
    index: true
  },
  
  // Processing details
  processedAt: {
    type: Date,
    index: true
  },
  failureReason: String,
  refundReason: String,
  refundedAt: Date,
  refundAmount: {
    type: Number,
    min: 0
  },
  
  // Retry and error handling
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  lastRetryAt: Date,
  
  // Metadata and tracking
  metadata: {
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      default: 'web',
      enum: ['web', 'mobile', 'api']
    },
    processingTime: Number, // milliseconds
    gatewayResponse: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
paymentSchema.index({ business: 1, createdAt: -1 });
paymentSchema.index({ rider: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ offer: 1, status: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

// Virtual for net amount after fees
paymentSchema.virtual('netAmount').get(function() {
  return this.totalAmount - this.platformFee;
});

// Virtual for payment summary
paymentSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    amount: this.totalAmount,
    currency: this.currency,
    status: this.status,
    method: this.paymentMethod,
    processedAt: this.processedAt,
    riderEarnings: this.riderEarnings
  };
});

// Pre-save middleware to calculate rider earnings
paymentSchema.pre('save', function(next) {
  if (this.isModified('totalAmount') || this.isModified('platformFee')) {
    this.riderEarnings = this.totalAmount - this.platformFee;
  }
  
  // Generate transaction ID if not provided
  if (!this.transactionId && this.isNew) {
    this.transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  next();
});

// Instance Methods

/**
 * Mark payment as processing
 * @param {String} externalId - External transaction ID from payment gateway
 * @returns {Promise<Payment>}
 */
paymentSchema.methods.markAsProcessing = async function(externalId) {
  this.status = 'processing';
  this.externalTransactionId = externalId;
  this.processedAt = new Date();
  return await this.save();
};

/**
 * Mark payment as completed
 * @param {Object} gatewayResponse - Response from payment gateway
 * @returns {Promise<Payment>}
 */
paymentSchema.methods.markAsCompleted = async function(gatewayResponse = {}) {
  this.status = 'completed';
  this.processedAt = new Date();
  this.metadata.gatewayResponse = gatewayResponse;
  this.metadata.processingTime = this.createdAt ? 
    Date.now() - this.createdAt.getTime() : 
    1000; // Default 1 second for tests
  return await this.save();
};

/**
 * Mark payment as failed
 * @param {String} reason - Failure reason
 * @param {Object} gatewayResponse - Response from payment gateway
 * @returns {Promise<Payment>}
 */
paymentSchema.methods.markAsFailed = async function(reason, gatewayResponse = {}) {
  this.status = 'failed';
  this.failureReason = reason;
  this.metadata.gatewayResponse = gatewayResponse;
  return await this.save();
};

/**
 * Process refund
 * @param {Number} amount - Refund amount (defaults to full amount)
 * @param {String} reason - Refund reason
 * @returns {Promise<Payment>}
 */
paymentSchema.methods.processRefund = async function(amount, reason) {
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }
  
  const refundAmount = amount || this.totalAmount;
  if (refundAmount > this.totalAmount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }
  
  this.status = 'refunded';
  this.refundAmount = refundAmount;
  this.refundReason = reason;
  this.refundedAt = new Date();
  
  return await this.save();
};

/**
 * Increment retry count
 * @returns {Promise<Payment>}
 */
paymentSchema.methods.incrementRetry = async function() {
  if (this.retryCount >= 5) {
    throw new Error('Maximum retry attempts reached');
  }
  
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  return await this.save();
};

/**
 * Check if payment can be retried
 * @returns {Boolean}
 */
paymentSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.retryCount < 5;
};

/**
 * Get payment details for API response
 * @returns {Object}
 */
paymentSchema.methods.getDetails = function() {
  return {
    id: this._id,
    offerId: this.offer,
    totalAmount: this.totalAmount,
    platformFee: this.platformFee,
    riderEarnings: this.riderEarnings,
    currency: this.currency,
    paymentMethod: this.paymentMethod,
    status: this.status,
    transactionId: this.transactionId,
    processedAt: this.processedAt,
    createdAt: this.createdAt,
    metadata: {
      source: this.metadata.source,
      retryCount: this.retryCount
    }
  };
};

// Static Methods

/**
 * Get payment by transaction ID
 * @param {String} transactionId - Transaction ID
 * @returns {Promise<Payment>}
 */
paymentSchema.statics.findByTransactionId = function(transactionId) {
  return this.findOne({ transactionId });
};

/**
 * Get payments for a business
 * @param {String} businessId - Business user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
paymentSchema.statics.getBusinessPayments = function(businessId, options = {}) {
  const {
    status,
    startDate,
    endDate,
    limit = 50,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;
  
  const query = { business: businessId };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('offer', 'title packageDetails pickup delivery')
    .populate('rider', 'name email profile.phone')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

/**
 * Get payments for a rider
 * @param {String} riderId - Rider user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
paymentSchema.statics.getRiderPayments = function(riderId, options = {}) {
  const {
    status,
    startDate,
    endDate,
    limit = 50,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;
  
  const query = { rider: riderId };
  
  if (status) {
    query.status = status;
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('offer', 'title packageDetails pickup delivery')
    .populate('business', 'businessName email')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

/**
 * Get payment statistics for a user
 * @param {String} userId - User ID
 * @param {String} userType - 'business' or 'rider'
 * @returns {Promise<Object>}
 */
paymentSchema.statics.getPaymentStats = async function(userId, userType) {
  const matchField = userType === 'business' ? 'business' : 'rider';
  
  const stats = await this.aggregate([
    { $match: { [matchField]: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        avgAmount: { $avg: '$totalAmount' }
      }
    }
  ]);
  
  const result = {
    totalPayments: 0,
    totalAmount: 0,
    completedPayments: 0,
    completedAmount: 0,
    pendingPayments: 0,
    failedPayments: 0,
    averageAmount: 0
  };
  
  stats.forEach(stat => {
    result.totalPayments += stat.count;
    result.totalAmount += stat.totalAmount;
    
    if (stat._id === 'completed') {
      result.completedPayments = stat.count;
      result.completedAmount = stat.totalAmount;
      result.averageAmount = stat.avgAmount;
    } else if (stat._id === 'pending' || stat._id === 'processing') {
      result.pendingPayments += stat.count;
    } else if (stat._id === 'failed') {
      result.failedPayments = stat.count;
    }
  });
  
  return result;
};

/**
 * Get failed payments that can be retried
 * @returns {Promise<Array>}
 */
paymentSchema.statics.getRetryablePayments = function() {
  return this.find({
    status: 'failed',
    retryCount: { $lt: 5 },
    $or: [
      { lastRetryAt: { $exists: false } },
      { lastRetryAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } } // 30 minutes ago
    ]
  }).limit(100);
};

/**
 * Calculate platform fee based on amount
 * @param {Number} amount - Payment amount
 * @returns {Number} Platform fee
 */
paymentSchema.statics.calculatePlatformFee = function(amount) {
  // Simple fee structure: 5% of payment amount with minimum $0.50
  const feePercentage = 0.05;
  const minimumFee = 0.50;
  
  const calculatedFee = amount * feePercentage;
  return Math.max(calculatedFee, minimumFee);
};

module.exports = mongoose.model('Payment', paymentSchema);