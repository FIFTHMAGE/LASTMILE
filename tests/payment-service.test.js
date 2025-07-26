const mongoose = require('mongoose');
const PaymentService = require('../services/PaymentService');
const Payment = require('../models/Payment');
const Offer = require('../models/Offer');
const User = require('../models/User');
const NotificationService = require('../services/NotificationService');

// Mock dependencies
jest.mock('../models/Payment');
jest.mock('../models/Offer');
jest.mock('../models/User');
jest.mock('../services/NotificationService');

describe('PaymentService', () => {
  let paymentService;
  let mockPaymentGateway;
  let mockNotificationService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock payment gateway
    mockPaymentGateway = {
      processPayment: jest.fn().mockResolvedValue({
        success: true,
        transactionId: 'gw_12345',
        processedAt: new Date(),
        fees: { processing: 1.00 }
      }),
      processRefund: jest.fn().mockResolvedValue({
        success: true,
        refundId: 'ref_12345',
        processedAt: new Date()
      })
    };
    
    // Mock notification service
    mockNotificationService = {
      send: jest.fn().mockResolvedValue({ _id: 'notification_id' })
    };
    
    // Initialize service with mocks
    paymentService = new PaymentService({
      paymentGateway: mockPaymentGateway,
      notificationService: mockNotificationService
    });
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const service = new PaymentService();
      expect(service.options.defaultCurrency).toBe('USD');
      expect(service.options.maxRetries).toBe(5);
    });

    test('should accept custom options', () => {
      const service = new PaymentService({
        defaultCurrency: 'EUR',
        maxRetries: 3
      });
      expect(service.options.defaultCurrency).toBe('EUR');
      expect(service.options.maxRetries).toBe(3);
    });
  });

  describe('processPayment', () => {
    let mockOffer;
    let mockPayment;

    beforeEach(() => {
      mockOffer = {
        _id: new mongoose.Types.ObjectId(),
        business: { _id: new mongoose.Types.ObjectId() },
        acceptedBy: { _id: new mongoose.Types.ObjectId() },
        status: 'delivered',
        payment: { amount: 25.00 },
        save: jest.fn().mockResolvedValue(true)
      };

      mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        offer: mockOffer._id,
        business: mockOffer.business._id,
        rider: mockOffer.acceptedBy._id,
        totalAmount: 25.00,
        platformFee: 1.25,
        riderEarnings: 23.75,
        save: jest.fn().mockResolvedValue(true),
        markAsProcessing: jest.fn().mockResolvedValue(true),
        markAsCompleted: jest.fn().mockResolvedValue(true),
        markAsFailed: jest.fn().mockResolvedValue(true),
        getDetails: jest.fn().mockReturnValue({
          id: 'payment_id',
          amount: 25.00,
          status: 'completed'
        })
      };

      // Mock Offer.findById
      Offer.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOffer)
        })
      });

      // Mock Payment.findOne and constructor
      Payment.findOne = jest.fn().mockResolvedValue(null);
      Payment.calculatePlatformFee = jest.fn().mockReturnValue(1.25);
      Payment.mockImplementation(() => mockPayment);
    });

    test('should process payment successfully', async () => {
      const paymentData = {
        paymentMethod: 'credit_card',
        paymentMethodDetails: { last4: '4242' },
        currency: 'USD'
      };

      const result = await paymentService.processPayment(mockOffer._id, paymentData);

      expect(Offer.findById).toHaveBeenCalledWith(mockOffer._id);
      expect(Payment.findOne).toHaveBeenCalledWith({ offer: mockOffer._id });
      expect(Payment.calculatePlatformFee).toHaveBeenCalledWith(25.00);
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockPayment.markAsProcessing).toHaveBeenCalled();
      expect(mockPayment.markAsCompleted).toHaveBeenCalled();
      expect(mockOffer.save).toHaveBeenCalled();
      expect(mockOffer.status).toBe('completed');
      expect(mockNotificationService.send).toHaveBeenCalledTimes(2); // Business and rider
      expect(result).toBe(mockPayment);
    });

    test('should throw error if offer not found', async () => {
      Offer.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await expect(paymentService.processPayment('invalid_id', {}))
        .rejects.toThrow('Offer not found: invalid_id');
    });

    test('should throw error if offer not delivered', async () => {
      mockOffer.status = 'accepted';

      await expect(paymentService.processPayment(mockOffer._id, {}))
        .rejects.toThrow('Cannot process payment for offer with status: accepted');
    });

    test('should throw error if payment already exists', async () => {
      Payment.findOne = jest.fn().mockResolvedValue({ _id: 'existing_payment' });

      await expect(paymentService.processPayment(mockOffer._id, {}))
        .rejects.toThrow(`Payment already exists for offer: ${mockOffer._id}`);
    });

    test('should handle payment gateway failure', async () => {
      mockPaymentGateway.processPayment.mockRejectedValue(new Error('Gateway error'));

      await expect(paymentService.processPayment(mockOffer._id, {
        paymentMethod: 'credit_card'
      })).rejects.toThrow('Gateway error');

      expect(mockPayment.markAsFailed).toHaveBeenCalledWith('Gateway error', undefined);
      expect(mockNotificationService.send).toHaveBeenCalled(); // Failure notification
    });
  });

  describe('retryPayment', () => {
    let mockPayment;

    beforeEach(() => {
      mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        canRetry: jest.fn().mockReturnValue(true),
        incrementRetry: jest.fn().mockResolvedValue(true),
        markAsCompleted: jest.fn().mockResolvedValue(true),
        markAsFailed: jest.fn().mockResolvedValue(true),
        status: 'failed',
        save: jest.fn().mockResolvedValue(true),
        getDetails: jest.fn().mockReturnValue({
          id: 'payment_id',
          status: 'completed'
        })
      };

      Payment.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockPayment)
          })
        })
      });
    });

    test('should retry payment successfully', async () => {
      const result = await paymentService.retryPayment(mockPayment._id);

      expect(Payment.findById).toHaveBeenCalledWith(mockPayment._id);
      expect(mockPayment.canRetry).toHaveBeenCalled();
      expect(mockPayment.incrementRetry).toHaveBeenCalled();
      expect(mockPayment.status).toBe('processing');
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockPaymentGateway.processPayment).toHaveBeenCalled();
      expect(mockPayment.markAsCompleted).toHaveBeenCalled();
      expect(mockNotificationService.send).toHaveBeenCalled();
      expect(result).toBe(mockPayment);
    });

    test('should throw error if payment not found', async () => {
      Payment.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
          })
        })
      });

      await expect(paymentService.retryPayment('invalid_id'))
        .rejects.toThrow('Payment not found: invalid_id');
    });

    test('should throw error if payment cannot be retried', async () => {
      mockPayment.canRetry.mockReturnValue(false);

      await expect(paymentService.retryPayment(mockPayment._id))
        .rejects.toThrow('Payment cannot be retried');
    });

    test('should handle retry failure', async () => {
      mockPaymentGateway.processPayment.mockRejectedValue(new Error('Retry failed'));

      await expect(paymentService.retryPayment(mockPayment._id))
        .rejects.toThrow('Retry failed');

      expect(mockPayment.markAsFailed).toHaveBeenCalledWith('Retry failed', undefined);
    });
  });

  describe('refundPayment', () => {
    let mockPayment;

    beforeEach(() => {
      mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        status: 'completed',
        totalAmount: 25.00,
        externalTransactionId: 'ext_12345',
        currency: 'USD',
        processRefund: jest.fn().mockResolvedValue(true),
        getDetails: jest.fn().mockReturnValue({
          id: 'payment_id',
          status: 'refunded'
        })
      };

      Payment.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockPayment)
        })
      });
    });

    test('should process full refund successfully', async () => {
      const reason = 'Customer request';
      const result = await paymentService.refundPayment(mockPayment._id, null, reason);

      expect(Payment.findById).toHaveBeenCalledWith(mockPayment._id);
      expect(mockPaymentGateway.processRefund).toHaveBeenCalledWith({
        transactionId: 'ext_12345',
        amount: 25.00,
        currency: 'USD',
        reason
      });
      expect(mockPayment.processRefund).toHaveBeenCalledWith(25.00, reason);
      expect(mockNotificationService.send).toHaveBeenCalled();
      expect(result).toBe(mockPayment);
    });

    test('should process partial refund successfully', async () => {
      const amount = 10.00;
      const reason = 'Partial refund';
      
      await paymentService.refundPayment(mockPayment._id, amount, reason);

      expect(mockPaymentGateway.processRefund).toHaveBeenCalledWith({
        transactionId: 'ext_12345',
        amount: 10.00,
        currency: 'USD',
        reason
      });
      expect(mockPayment.processRefund).toHaveBeenCalledWith(10.00, reason);
    });

    test('should throw error if payment not found', async () => {
      Payment.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      });

      await expect(paymentService.refundPayment('invalid_id', null, 'reason'))
        .rejects.toThrow('Payment not found: invalid_id');
    });

    test('should throw error if payment not completed', async () => {
      mockPayment.status = 'pending';

      await expect(paymentService.refundPayment(mockPayment._id, null, 'reason'))
        .rejects.toThrow('Can only refund completed payments');
    });
  });

  describe('getPaymentHistory', () => {
    beforeEach(() => {
      Payment.getBusinessPayments = jest.fn().mockResolvedValue([
        { getDetails: () => ({ id: 'payment1' }) },
        { getDetails: () => ({ id: 'payment2' }) }
      ]);
      Payment.getRiderPayments = jest.fn().mockResolvedValue([
        { getDetails: () => ({ id: 'payment3' }) }
      ]);
      Payment.countDocuments = jest.fn().mockResolvedValue(10);
    });

    test('should get business payment history', async () => {
      const userId = new mongoose.Types.ObjectId();
      const filters = { status: 'completed', page: 1, limit: 20 };

      const result = await paymentService.getPaymentHistory(userId, 'business', filters);

      expect(Payment.getBusinessPayments).toHaveBeenCalledWith(userId, {
        status: 'completed',
        limit: 20,
        skip: 0
      });
      expect(Payment.countDocuments).toHaveBeenCalled();
      expect(result.payments).toHaveLength(2);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.pages).toBe(1);
    });

    test('should get rider payment history', async () => {
      const userId = new mongoose.Types.ObjectId();
      const filters = { page: 2, limit: 5 };

      const result = await paymentService.getPaymentHistory(userId, 'rider', filters);

      expect(Payment.getRiderPayments).toHaveBeenCalledWith(userId, {
        limit: 5,
        skip: 5
      });
      expect(result.payments).toHaveLength(1);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });
  });

  describe('getPaymentStats', () => {
    beforeEach(() => {
      Payment.getPaymentStats = jest.fn().mockResolvedValue({
        totalPayments: 10,
        totalAmount: 250.00,
        completedPayments: 8,
        completedAmount: 200.00,
        averageAmount: 25.00
      });
    });

    test('should get payment statistics', async () => {
      const userId = new mongoose.Types.ObjectId();
      const result = await paymentService.getPaymentStats(userId, 'business');

      expect(Payment.getPaymentStats).toHaveBeenCalledWith(userId, 'business');
      expect(result.totalPayments).toBe(10);
      expect(result.completedAmount).toBe(200.00);
    });

    test('should get rider statistics with monthly data', async () => {
      Payment.aggregate = jest.fn().mockResolvedValue([{
        _id: null,
        totalEarnings: 150.00,
        deliveryCount: 6
      }]);

      const userId = new mongoose.Types.ObjectId();
      const result = await paymentService.getPaymentStats(userId, 'rider');

      expect(Payment.getPaymentStats).toHaveBeenCalledWith(userId, 'rider');
      expect(Payment.aggregate).toHaveBeenCalled();
      expect(result.monthlyEarnings).toBe(150.00);
      expect(result.monthlyDeliveries).toBe(6);
    });
  });

  describe('calculateFees', () => {
    beforeEach(() => {
      Payment.calculatePlatformFee = jest.fn().mockReturnValue(1.25);
    });

    test('should calculate fee breakdown', () => {
      const result = paymentService.calculateFees(25.00);

      expect(Payment.calculatePlatformFee).toHaveBeenCalledWith(25.00);
      expect(result.totalAmount).toBe(25.00);
      expect(result.platformFee).toBe(1.25);
      expect(result.riderEarnings).toBe(23.75);
      expect(result.feePercentage).toBe('5.00');
    });
  });

  describe('processScheduledRetries', () => {
    beforeEach(() => {
      Payment.getRetryablePayments = jest.fn().mockResolvedValue([
        { _id: 'payment1' },
        { _id: 'payment2' }
      ]);
    });

    test('should process scheduled retries successfully', async () => {
      paymentService.retryPayment = jest.fn()
        .mockResolvedValueOnce({ _id: 'payment1' })
        .mockRejectedValueOnce(new Error('Retry failed'));

      const result = await paymentService.processScheduledRetries();

      expect(Payment.getRetryablePayments).toHaveBeenCalled();
      expect(paymentService.retryPayment).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('updatePaymentStatus', () => {
    let mockPayment;

    beforeEach(() => {
      mockPayment = {
        _id: new mongoose.Types.ObjectId(),
        status: 'pending',
        metadata: {},
        createdAt: new Date(Date.now() - 5000),
        save: jest.fn().mockResolvedValue(true)
      };

      Payment.findById = jest.fn().mockResolvedValue(mockPayment);
    });

    test('should update payment status to completed', async () => {
      const result = await paymentService.updatePaymentStatus(
        mockPayment._id,
        'completed',
        { gatewayResponse: { success: true } }
      );

      expect(Payment.findById).toHaveBeenCalledWith(mockPayment._id);
      expect(mockPayment.status).toBe('completed');
      expect(mockPayment.processedAt).toBeInstanceOf(Date);
      expect(mockPayment.metadata.processingTime).toBeDefined();
      expect(mockPayment.metadata.gatewayResponse.success).toBe(true);
      expect(mockPayment.save).toHaveBeenCalled();
      expect(mockNotificationService.send).toHaveBeenCalled();
      expect(result).toBe(mockPayment);
    });

    test('should update payment status to failed', async () => {
      await paymentService.updatePaymentStatus(
        mockPayment._id,
        'failed',
        { reason: 'Card declined' }
      );

      expect(mockPayment.status).toBe('failed');
      expect(mockPayment.failureReason).toBe('Card declined');
      expect(mockNotificationService.send).toHaveBeenCalled();
    });

    test('should throw error if payment not found', async () => {
      Payment.findById = jest.fn().mockResolvedValue(null);

      await expect(paymentService.updatePaymentStatus('invalid_id', 'completed'))
        .rejects.toThrow('Payment not found: invalid_id');
    });
  });
});