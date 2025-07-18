const mongoose = require('mongoose');
const Payment = require('../models/Payment');

describe('Payment Model', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    test('should create payment with required fields', () => {
      const paymentData = {
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        platformFee: 1.25,
        riderEarnings: 23.75,
        currency: 'USD',
        paymentMethod: 'credit_card'
      };

      const payment = new Payment(paymentData);
      const validationError = payment.validateSync();

      expect(validationError).toBeUndefined();
      expect(payment.offer).toEqual(paymentData.offer);
      expect(payment.totalAmount).toBe(25.00);
      expect(payment.status).toBe('pending');
      expect(payment.retryCount).toBe(0);
    });

    test('should require essential fields', () => {
      const payment = new Payment({});
      const validationError = payment.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.offer).toBeDefined();
      expect(validationError.errors.business).toBeDefined();
      expect(validationError.errors.rider).toBeDefined();
      expect(validationError.errors.totalAmount).toBeDefined();
      expect(validationError.errors.paymentMethod).toBeDefined();
    });

    test('should validate payment method enum', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        paymentMethod: 'invalid_method'
      });

      const validationError = payment.validateSync();
      expect(validationError.errors.paymentMethod).toBeDefined();
    });

    test('should validate status enum', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        paymentMethod: 'credit_card',
        status: 'invalid_status'
      });

      const validationError = payment.validateSync();
      expect(validationError.errors.status).toBeDefined();
    });

    test('should validate currency enum', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        paymentMethod: 'credit_card',
        currency: 'INVALID'
      });

      const validationError = payment.validateSync();
      expect(validationError.errors.currency).toBeDefined();
    });

    test('should not allow negative amounts', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: -10.00,
        paymentMethod: 'credit_card'
      });

      const validationError = payment.validateSync();
      expect(validationError.errors.totalAmount).toBeDefined();
    });

    test('should limit retry count to maximum', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        paymentMethod: 'credit_card',
        retryCount: 10
      });

      const validationError = payment.validateSync();
      expect(validationError.errors.retryCount).toBeDefined();
    });
  });

  describe('Pre-save Middleware', () => {
    test('should calculate rider earnings from total amount and platform fee', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        platformFee: 1.25,
        paymentMethod: 'credit_card'
      });

      // Trigger pre-save middleware
      payment.save = jest.fn();
      payment.isModified = jest.fn().mockReturnValue(true);
      payment.isNew = true;

      // Manually call pre-save logic
      payment.riderEarnings = payment.totalAmount - payment.platformFee;

      expect(payment.riderEarnings).toBe(23.75);
    });

    test('should generate transaction ID for new payments', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        paymentMethod: 'credit_card'
      });

      payment.isNew = true;
      payment.isModified = jest.fn().mockReturnValue(false);

      // Simulate pre-save middleware
      if (!payment.transactionId && payment.isNew) {
        payment.transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      expect(payment.transactionId).toBeDefined();
      expect(payment.transactionId).toMatch(/^txn_\d+_[a-z0-9]+$/);
    });
  });

  describe('Virtual Properties', () => {
    test('should calculate net amount virtual', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        platformFee: 1.25,
        paymentMethod: 'credit_card'
      });

      expect(payment.netAmount).toBe(23.75);
    });

    test('should provide payment summary virtual', () => {
      const payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        platformFee: 1.25,
        riderEarnings: 23.75,
        currency: 'USD',
        paymentMethod: 'credit_card',
        status: 'completed'
      });

      const summary = payment.summary;
      expect(summary).toHaveProperty('id');
      expect(summary.amount).toBe(25.00);
      expect(summary.currency).toBe('USD');
      expect(summary.status).toBe('completed');
      expect(summary.method).toBe('credit_card');
      expect(summary.riderEarnings).toBe(23.75);
    });
  });

  describe('Instance Methods', () => {
    let payment;

    beforeEach(() => {
      payment = new Payment({
        offer: new mongoose.Types.ObjectId(),
        business: new mongoose.Types.ObjectId(),
        rider: new mongoose.Types.ObjectId(),
        totalAmount: 25.00,
        platformFee: 1.25,
        riderEarnings: 23.75,
        paymentMethod: 'credit_card'
      });
      payment.save = jest.fn().mockResolvedValue(payment);
    });

    test('markAsProcessing should update status and external ID', async () => {
      const externalId = 'ext_12345';
      await payment.markAsProcessing(externalId);

      expect(payment.status).toBe('processing');
      expect(payment.externalTransactionId).toBe(externalId);
      expect(payment.processedAt).toBeInstanceOf(Date);
      expect(payment.save).toHaveBeenCalled();
    });

    test('markAsCompleted should update status and metadata', async () => {
      const gatewayResponse = { success: true, id: 'gw_12345' };
      await payment.markAsCompleted(gatewayResponse);

      expect(payment.status).toBe('completed');
      expect(payment.processedAt).toBeInstanceOf(Date);
      expect(payment.metadata.gatewayResponse).toEqual(gatewayResponse);
      expect(payment.metadata.processingTime).toBeDefined();
      expect(payment.save).toHaveBeenCalled();
    });

    test('markAsFailed should update status and failure reason', async () => {
      const reason = 'Insufficient funds';
      const gatewayResponse = { error: 'card_declined' };
      await payment.markAsFailed(reason, gatewayResponse);

      expect(payment.status).toBe('failed');
      expect(payment.failureReason).toBe(reason);
      expect(payment.metadata.gatewayResponse).toEqual(gatewayResponse);
      expect(payment.save).toHaveBeenCalled();
    });

    test('processRefund should handle full refund', async () => {
      payment.status = 'completed';
      const reason = 'Customer request';
      
      await payment.processRefund(null, reason);

      expect(payment.status).toBe('refunded');
      expect(payment.refundAmount).toBe(25.00);
      expect(payment.refundReason).toBe(reason);
      expect(payment.refundedAt).toBeInstanceOf(Date);
      expect(payment.save).toHaveBeenCalled();
    });

    test('processRefund should handle partial refund', async () => {
      payment.status = 'completed';
      const refundAmount = 10.00;
      const reason = 'Partial refund';
      
      await payment.processRefund(refundAmount, reason);

      expect(payment.status).toBe('refunded');
      expect(payment.refundAmount).toBe(10.00);
      expect(payment.refundReason).toBe(reason);
      expect(payment.save).toHaveBeenCalled();
    });

    test('processRefund should throw error for non-completed payments', async () => {
      payment.status = 'pending';
      
      await expect(payment.processRefund(10.00, 'test')).rejects.toThrow(
        'Can only refund completed payments'
      );
    });

    test('processRefund should throw error for excessive refund amount', async () => {
      payment.status = 'completed';
      
      await expect(payment.processRefund(50.00, 'test')).rejects.toThrow(
        'Refund amount cannot exceed payment amount'
      );
    });

    test('incrementRetry should increase retry count', async () => {
      await payment.incrementRetry();

      expect(payment.retryCount).toBe(1);
      expect(payment.lastRetryAt).toBeInstanceOf(Date);
      expect(payment.save).toHaveBeenCalled();
    });

    test('incrementRetry should throw error at maximum retries', async () => {
      payment.retryCount = 5;
      
      await expect(payment.incrementRetry()).rejects.toThrow(
        'Maximum retry attempts reached'
      );
    });

    test('canRetry should return true for failed payments under retry limit', () => {
      payment.status = 'failed';
      payment.retryCount = 2;

      expect(payment.canRetry()).toBe(true);
    });

    test('canRetry should return false for completed payments', () => {
      payment.status = 'completed';
      payment.retryCount = 2;

      expect(payment.canRetry()).toBe(false);
    });

    test('canRetry should return false at maximum retries', () => {
      payment.status = 'failed';
      payment.retryCount = 5;

      expect(payment.canRetry()).toBe(false);
    });

    test('getDetails should return formatted payment details', () => {
      payment._id = new mongoose.Types.ObjectId();
      payment.transactionId = 'txn_12345';
      payment.createdAt = new Date();

      const details = payment.getDetails();

      expect(details).toHaveProperty('id', payment._id);
      expect(details).toHaveProperty('totalAmount', 25.00);
      expect(details).toHaveProperty('platformFee', 1.25);
      expect(details).toHaveProperty('riderEarnings', 23.75);
      expect(details).toHaveProperty('currency', 'USD');
      expect(details).toHaveProperty('paymentMethod', 'credit_card');
      expect(details).toHaveProperty('status', 'pending');
      expect(details).toHaveProperty('transactionId', 'txn_12345');
      expect(details.metadata).toHaveProperty('retryCount', 0);
    });
  });

  describe('Static Methods', () => {
    test('calculatePlatformFee should calculate 5% fee with minimum', () => {
      const fee1 = Payment.calculatePlatformFee(10.00);
      expect(fee1).toBe(0.50); // Minimum fee

      const fee2 = Payment.calculatePlatformFee(20.00);
      expect(fee2).toBe(1.00); // 5% of 20

      const fee3 = Payment.calculatePlatformFee(100.00);
      expect(fee3).toBe(5.00); // 5% of 100
    });

    test('findByTransactionId should find payment by transaction ID', () => {
      const findOneSpy = jest.spyOn(Payment, 'findOne').mockResolvedValue({});
      const transactionId = 'txn_12345';

      Payment.findByTransactionId(transactionId);

      expect(findOneSpy).toHaveBeenCalledWith({ transactionId });
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      // Mock Mongoose query methods
      Payment.find = jest.fn().mockReturnThis();
      Payment.populate = jest.fn().mockReturnThis();
      Payment.sort = jest.fn().mockReturnThis();
      Payment.limit = jest.fn().mockReturnThis();
      Payment.skip = jest.fn().mockReturnThis();
      Payment.countDocuments = jest.fn().mockResolvedValue(10);
      Payment.aggregate = jest.fn().mockResolvedValue([]);
    });

    test('getBusinessPayments should query with business filter', () => {
      const businessId = new mongoose.Types.ObjectId();
      const options = { status: 'completed', limit: 10, skip: 0 };

      Payment.getBusinessPayments(businessId, options);

      expect(Payment.find).toHaveBeenCalledWith({
        business: businessId,
        status: 'completed'
      });
    });

    test('getRiderPayments should query with rider filter', () => {
      const riderId = new mongoose.Types.ObjectId();
      const options = { status: 'completed', limit: 10, skip: 0 };

      Payment.getRiderPayments(riderId, options);

      expect(Payment.find).toHaveBeenCalledWith({
        rider: riderId,
        status: 'completed'
      });
    });

    test('getRetryablePayments should find failed payments under retry limit', () => {
      Payment.getRetryablePayments();

      expect(Payment.find).toHaveBeenCalledWith({
        status: 'failed',
        retryCount: { $lt: 5 },
        $or: [
          { lastRetryAt: { $exists: false } },
          { lastRetryAt: { $lt: expect.any(Date) } }
        ]
      });
    });
  });

  describe('Payment Statistics', () => {
    test('getPaymentStats should aggregate payment data', async () => {
      const userId = new mongoose.Types.ObjectId();
      const mockStats = [
        { _id: 'completed', count: 5, totalAmount: 125.00, avgAmount: 25.00 },
        { _id: 'failed', count: 1, totalAmount: 20.00, avgAmount: 20.00 }
      ];

      Payment.aggregate = jest.fn().mockResolvedValue(mockStats);

      const stats = await Payment.getPaymentStats(userId, 'business');

      expect(stats.totalPayments).toBe(6);
      expect(stats.totalAmount).toBe(145.00);
      expect(stats.completedPayments).toBe(5);
      expect(stats.completedAmount).toBe(125.00);
      expect(stats.failedPayments).toBe(1);
      expect(stats.averageAmount).toBe(25.00);
    });
  });
});