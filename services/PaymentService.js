const Payment = require('../models/Payment');
const Offer = require('../models/Offer');
const User = require('../models/User');
const NotificationService = require('./NotificationService');

/**
 * PaymentService - Handles payment processing and transaction management
 */
class PaymentService {
  constructor(options = {}) {
    this.options = {
      defaultCurrency: 'USD',
      maxRetries: 5,
      retryDelay: 30 * 60 * 1000, // 30 minutes
      ...options
    };
    
    // Initialize payment gateway (mock implementation)
    this.paymentGateway = options.paymentGateway || this._getDefaultPaymentGateway();
    this.notificationService = options.notificationService || null;
  }

  /**
   * Process payment for a completed delivery
   * @param {String} offerId - Offer ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Payment>} Created payment record
   */
  async processPayment(offerId, paymentData) {
    try {
      // Validate offer
      const offer = await Offer.findById(offerId)
        .populate('business')
        .populate('acceptedBy');
      
      if (!offer) {
        throw new Error(`Offer not found: ${offerId}`);
      }
      
      if (offer.status !== 'delivered') {
        throw new Error(`Cannot process payment for offer with status: ${offer.status}`);
      }
      
      // Check if payment already exists
      const existingPayment = await Payment.findOne({ offer: offerId });
      if (existingPayment) {
        throw new Error(`Payment already exists for offer: ${offerId}`);
      }
      
      // Calculate amounts
      const totalAmount = offer.payment.amount;
      const platformFee = Payment.calculatePlatformFee(totalAmount);
      const riderEarnings = totalAmount - platformFee;
      
      // Create payment record
      const payment = new Payment({
        offer: offerId,
        business: offer.business._id,
        rider: offer.acceptedBy._id,
        totalAmount,
        platformFee,
        riderEarnings,
        currency: paymentData.currency || this.options.defaultCurrency,
        paymentMethod: paymentData.paymentMethod,
        paymentMethodDetails: paymentData.paymentMethodDetails,
        metadata: {
          ipAddress: paymentData.ipAddress,
          userAgent: paymentData.userAgent,
          source: paymentData.source || 'web'
        }
      });
      
      await payment.save();
      
      // Process payment through gateway
      try {
        await this._processPaymentGateway(payment, paymentData);
        
        // Update offer status
        offer.status = 'completed';
        await offer.save();
        
        // Send notifications
        if (this.notificationService) {
          await this._sendPaymentNotifications(payment, 'completed');
        }
        
        return payment;
      } catch (gatewayError) {
        // Mark payment as failed
        await payment.markAsFailed(gatewayError.message, gatewayError.response);
        
        // Send failure notifications
        if (this.notificationService) {
          await this._sendPaymentNotifications(payment, 'failed');
        }
        
        throw gatewayError;
      }
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Retry failed payment
   * @param {String} paymentId - Payment ID
   * @returns {Promise<Payment>} Updated payment record
   */
  async retryPayment(paymentId) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('offer')
        .populate('business')
        .populate('rider');
      
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }
      
      if (!payment.canRetry()) {
        throw new Error('Payment cannot be retried');
      }
      
      // Increment retry count
      await payment.incrementRetry();
      
      // Reset status to processing
      payment.status = 'processing';
      await payment.save();
      
      try {
        // Retry payment through gateway
        await this._processPaymentGateway(payment);
        
        // Send success notifications
        if (this.notificationService) {
          await this._sendPaymentNotifications(payment, 'completed');
        }
        
        return payment;
      } catch (gatewayError) {
        // Mark as failed again
        await payment.markAsFailed(gatewayError.message, gatewayError.response);
        
        // Send failure notifications if max retries reached
        if (!payment.canRetry() && this.notificationService) {
          await this._sendPaymentNotifications(payment, 'failed_final');
        }
        
        throw gatewayError;
      }
    } catch (error) {
      console.error('Payment retry failed:', error);
      throw error;
    }
  }

  /**
   * Process refund for a payment
   * @param {String} paymentId - Payment ID
   * @param {Number} amount - Refund amount (optional, defaults to full amount)
   * @param {String} reason - Refund reason
   * @returns {Promise<Payment>} Updated payment record
   */
  async refundPayment(paymentId, amount, reason) {
    try {
      const payment = await Payment.findById(paymentId)
        .populate('business')
        .populate('rider');
      
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }
      
      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }
      
      const refundAmount = amount || payment.totalAmount;
      
      // Process refund through gateway
      const refundResult = await this.paymentGateway.processRefund({
        transactionId: payment.externalTransactionId,
        amount: refundAmount,
        currency: payment.currency,
        reason
      });
      
      // Update payment record
      await payment.processRefund(refundAmount, reason);
      
      // Send refund notifications
      if (this.notificationService) {
        await this._sendPaymentNotifications(payment, 'refunded');
      }
      
      return payment;
    } catch (error) {
      console.error('Refund processing failed:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a user
   * @param {String} userId - User ID
   * @param {String} userType - 'business' or 'rider'
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Payment history with pagination
   */
  async getPaymentHistory(userId, userType, filters = {}) {
    try {
      const {
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = filters;
      
      const skip = (page - 1) * limit;
      const options = {
        status,
        startDate,
        endDate,
        limit: parseInt(limit),
        skip
      };
      
      let payments;
      if (userType === 'business') {
        payments = await Payment.getBusinessPayments(userId, options);
      } else {
        payments = await Payment.getRiderPayments(userId, options);
      }
      
      // Get total count for pagination
      const totalQuery = { [userType]: userId };
      if (status) totalQuery.status = status;
      if (startDate || endDate) {
        totalQuery.createdAt = {};
        if (startDate) totalQuery.createdAt.$gte = new Date(startDate);
        if (endDate) totalQuery.createdAt.$lte = new Date(endDate);
      }
      
      const total = await Payment.countDocuments(totalQuery);
      
      return {
        payments: payments.map(p => p.getDetails()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Failed to get payment history:', error);
      throw error;
    }
  }

  /**
   * Get payment statistics for a user
   * @param {String} userId - User ID
   * @param {String} userType - 'business' or 'rider'
   * @returns {Promise<Object>} Payment statistics
   */
  async getPaymentStats(userId, userType) {
    try {
      const stats = await Payment.getPaymentStats(userId, userType);
      
      // Add additional calculations for riders
      if (userType === 'rider') {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        
        const monthlyEarnings = await Payment.aggregate([
          {
            $match: {
              rider: new mongoose.Types.ObjectId(userId),
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
        
        stats.monthlyEarnings = monthlyEarnings[0]?.totalEarnings || 0;
        stats.monthlyDeliveries = monthlyEarnings[0]?.deliveryCount || 0;
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get payment stats:', error);
      throw error;
    }
  }

  /**
   * Update payment status
   * @param {String} paymentId - Payment ID
   * @param {String} status - New status
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Payment>} Updated payment
   */
  async updatePaymentStatus(paymentId, status, metadata = {}) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }
      
      const oldStatus = payment.status;
      payment.status = status;
      
      // Update relevant fields based on status
      switch (status) {
        case 'processing':
          payment.processedAt = new Date();
          break;
        case 'completed':
          payment.processedAt = new Date();
          payment.metadata.processingTime = Date.now() - payment.createdAt.getTime();
          break;
        case 'failed':
          if (metadata.reason) {
            payment.failureReason = metadata.reason;
          }
          break;
      }
      
      // Merge additional metadata
      if (metadata.gatewayResponse) {
        payment.metadata.gatewayResponse = metadata.gatewayResponse;
      }
      
      await payment.save();
      
      // Send notifications if status changed significantly
      if (oldStatus !== status && ['completed', 'failed'].includes(status) && this.notificationService) {
        await this._sendPaymentNotifications(payment, status);
      }
      
      return payment;
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  /**
   * Process scheduled payment retries
   * @returns {Promise<Object>} Processing results
   */
  async processScheduledRetries() {
    try {
      const retryablePayments = await Payment.getRetryablePayments();
      
      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };
      
      for (const payment of retryablePayments) {
        results.processed++;
        
        try {
          await this.retryPayment(payment._id);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            paymentId: payment._id,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to process scheduled retries:', error);
      throw error;
    }
  }

  /**
   * Calculate fees for a payment amount
   * @param {Number} amount - Payment amount
   * @returns {Object} Fee breakdown
   */
  calculateFees(amount) {
    const platformFee = Payment.calculatePlatformFee(amount);
    const riderEarnings = amount - platformFee;
    
    return {
      totalAmount: amount,
      platformFee,
      riderEarnings,
      feePercentage: (platformFee / amount * 100).toFixed(2)
    };
  }

  /**
   * Process payment through gateway
   * @param {Payment} payment - Payment record
   * @param {Object} paymentData - Payment data (optional for retries)
   * @returns {Promise<Object>} Gateway response
   * @private
   */
  async _processPaymentGateway(payment, paymentData = {}) {
    try {
      // Mark as processing
      await payment.markAsProcessing();
      
      // Process through gateway
      const gatewayResponse = await this.paymentGateway.processPayment({
        amount: payment.totalAmount,
        currency: payment.currency,
        paymentMethod: paymentData.paymentMethod || payment.paymentMethod,
        paymentMethodDetails: paymentData.paymentMethodDetails || payment.paymentMethodDetails,
        transactionId: payment.transactionId,
        metadata: {
          offerId: payment.offer,
          businessId: payment.business,
          riderId: payment.rider
        }
      });
      
      // Mark as completed
      await payment.markAsCompleted(gatewayResponse);
      
      return gatewayResponse;
    } catch (error) {
      console.error('Payment gateway processing failed:', error);
      throw error;
    }
  }

  /**
   * Send payment-related notifications
   * @param {Payment} payment - Payment record
   * @param {String} eventType - Event type
   * @private
   */
  async _sendPaymentNotifications(payment, eventType) {
    try {
      const notificationTypes = {
        completed: 'payment_processed',
        failed: 'payment_failed',
        failed_final: 'payment_failed',
        refunded: 'payment_refunded'
      };
      
      const notificationType = notificationTypes[eventType];
      if (!notificationType) return;
      
      // Send to business owner
      await this.notificationService.send({
        userId: payment.business,
        type: notificationType,
        title: this._getNotificationTitle(eventType, 'business'),
        message: this._getNotificationMessage(eventType, 'business', payment),
        data: {
          paymentId: payment._id,
          offerId: payment.offer,
          amount: payment.totalAmount,
          currency: payment.currency
        }
      });
      
      // Send to rider (for completed payments)
      if (eventType === 'completed') {
        await this.notificationService.send({
          userId: payment.rider,
          type: notificationType,
          title: this._getNotificationTitle(eventType, 'rider'),
          message: this._getNotificationMessage(eventType, 'rider', payment),
          data: {
            paymentId: payment._id,
            offerId: payment.offer,
            earnings: payment.riderEarnings,
            currency: payment.currency
          }
        });
      }
    } catch (error) {
      console.error('Failed to send payment notifications:', error);
      // Don't throw error as this shouldn't fail the payment process
    }
  }

  /**
   * Get notification title based on event type and recipient
   * @param {String} eventType - Event type
   * @param {String} recipient - Recipient type
   * @returns {String} Notification title
   * @private
   */
  _getNotificationTitle(eventType, recipient) {
    const titles = {
      completed: {
        business: 'Payment Processed',
        rider: 'Payment Received'
      },
      failed: {
        business: 'Payment Failed',
        rider: 'Payment Issue'
      },
      refunded: {
        business: 'Payment Refunded',
        rider: 'Payment Refunded'
      }
    };
    
    return titles[eventType]?.[recipient] || 'Payment Update';
  }

  /**
   * Get notification message based on event type and recipient
   * @param {String} eventType - Event type
   * @param {String} recipient - Recipient type
   * @param {Payment} payment - Payment record
   * @returns {String} Notification message
   * @private
   */
  _getNotificationMessage(eventType, recipient, payment) {
    const messages = {
      completed: {
        business: `Your payment of ${payment.currency} ${payment.totalAmount} has been processed successfully.`,
        rider: `You have received ${payment.currency} ${payment.riderEarnings} for your delivery.`
      },
      failed: {
        business: `Your payment of ${payment.currency} ${payment.totalAmount} could not be processed. Please check your payment method.`,
        rider: `There was an issue processing your payment. Our team has been notified.`
      },
      refunded: {
        business: `A refund of ${payment.currency} ${payment.refundAmount || payment.totalAmount} has been processed.`,
        rider: `A payment refund has been processed for your delivery.`
      }
    };
    
    return messages[eventType]?.[recipient] || 'Your payment status has been updated.';
  }

  /**
   * Get default payment gateway (mock implementation)
   * @returns {Object} Payment gateway interface
   * @private
   */
  _getDefaultPaymentGateway() {
    return {
      processPayment: async (paymentData) => {
        // Mock payment processing
        console.log(`[MOCK] Processing payment: ${paymentData.currency} ${paymentData.amount}`);
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate occasional failures (10% failure rate)
        if (Math.random() < 0.1) {
          throw new Error('Payment gateway error: Insufficient funds');
        }
        
        return {
          success: true,
          transactionId: `gw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          processedAt: new Date(),
          fees: {
            processing: paymentData.amount * 0.029 + 0.30 // Stripe-like fees
          }
        };
      },
      
      processRefund: async (refundData) => {
        console.log(`[MOCK] Processing refund: ${refundData.currency} ${refundData.amount}`);
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          success: true,
          refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          processedAt: new Date()
        };
      }
    };
  }
}

module.exports = PaymentService;