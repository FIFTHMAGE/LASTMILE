const mongoose = require('mongoose');
const EarningsService = require('../services/EarningsService');
const Payment = require('../models/Payment');
const Offer = require('../models/Offer');
const User = require('../models/User');

// Mock dependencies
jest.mock('../models/Payment');
jest.mock('../models/Offer');
jest.mock('../models/User');

describe('EarningsService', () => {
  let earningsService;
  let riderId;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    riderId = new mongoose.Types.ObjectId();
    earningsService = new EarningsService();
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const service = new EarningsService();
      expect(service.options.defaultCurrency).toBe('USD');
    });

    test('should accept custom options', () => {
      const service = new EarningsService({
        defaultCurrency: 'EUR'
      });
      expect(service.options.defaultCurrency).toBe('EUR');
    });
  });

  describe('getRiderEarningsSummary', () => {
    beforeEach(() => {
      // Mock Payment.getPaymentStats
      Payment.getPaymentStats = jest.fn().mockResolvedValue({
        completedAmount: 500.00,
        completedPayments: 20,
        averageAmount: 25.00
      });

      // Mock Payment.find for pending earnings
      Payment.find = jest.fn().mockResolvedValue([
        { riderEarnings: 15.00 },
        { riderEarnings: 20.00 }
      ]);

      // Mock Payment.aggregate for time-based earnings
      Payment.aggregate = jest.fn().mockResolvedValue([{
        _id: null,
        totalEarnings: 100.00,
        deliveryCount: 4,
        averageEarnings: 25.00
      }]);

      // Mock Offer.countDocuments
      Offer.countDocuments = jest.fn()
        .mockResolvedValueOnce(25) // total offers
        .mockResolvedValueOnce(20); // completed offers
    });

    test('should return comprehensive earnings summary', async () => {
      const result = await earningsService.getRiderEarningsSummary(riderId);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('timeBasedEarnings');
      expect(result).toHaveProperty('performanceMetrics');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('trends');

      expect(result.summary.totalEarnings).toBe(500.00);
      expect(result.summary.totalDeliveries).toBe(20);
      expect(result.summary.averageEarningsPerDelivery).toBe(25.00);
      expect(result.summary.currency).toBe('USD');
    });

    test('should handle custom currency', async () => {
      const result = await earningsService.getRiderEarningsSummary(riderId, { currency: 'EUR' });

      expect(result.summary.currency).toBe('EUR');
    });

    test('should calculate pending earnings', async () => {
      const result = await earningsService.getRiderEarningsSummary(riderId);

      expect(Payment.find).toHaveBeenCalledWith({
        rider: riderId,
        status: { $in: ['pending', 'processing'] }
      });
      expect(result.summary.pendingEarnings).toBe(35.00); // 15 + 20
    });
  });

  describe('getRiderEarningsHistory', () => {
    beforeEach(() => {
      const mockPayments = [
        {
          _id: 'payment1',
          createdAt: new Date('2024-01-15'),
          riderEarnings: 25.00,
          totalAmount: 30.00,
          platformFee: 5.00,
          currency: 'USD',
          status: 'completed',
          transactionId: 'txn_123',
          processedAt: new Date('2024-01-15'),
          offer: {
            _id: 'offer1',
            title: 'Delivery 1',
            pickup: { address: 'Pickup Address' },
            delivery: { address: 'Delivery Address' },
            business: { businessName: 'Test Business', email: 'test@business.com' }
          }
        }
      ];

      Payment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockResolvedValue(mockPayments)
            })
          })
        })
      });

      Payment.countDocuments = jest.fn().mockResolvedValue(1);
    });

    test('should return paginated earnings history', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        status: 'completed',
        page: 1,
        limit: 20
      };

      const result = await earningsService.getRiderEarningsHistory(riderId, filters);

      expect(result).toHaveProperty('earningsHistory');
      expect(result).toHaveProperty('pagination');
      expect(result).toHaveProperty('summary');

      expect(result.earningsHistory).toHaveLength(1);
      expect(result.earningsHistory[0].earnings).toBe(25.00);
      expect(result.pagination.total).toBe(1);
      expect(result.summary.totalEarnings).toBe(25.00);
    });

    test('should handle empty results', async () => {
      Payment.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      Payment.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await earningsService.getRiderEarningsHistory(riderId);

      expect(result.earningsHistory).toHaveLength(0);
      expect(result.summary.totalEarnings).toBe(0);
      expect(result.summary.averageEarnings).toBe(0);
    });
  });

  describe('getEarningsBreakdown', () => {
    beforeEach(() => {
      Payment.aggregate = jest.fn().mockResolvedValue([
        {
          _id: { year: 2024, month: 1 },
          totalEarnings: 150.00,
          totalAmount: 180.00,
          platformFees: 30.00,
          deliveryCount: 6,
          averageEarnings: 25.00,
          date: '2024-01'
        },
        {
          _id: { year: 2024, month: 2 },
          totalEarnings: 200.00,
          totalAmount: 240.00,
          platformFees: 40.00,
          deliveryCount: 8,
          averageEarnings: 25.00,
          date: '2024-02'
        }
      ]);
    });

    test('should return monthly earnings breakdown', async () => {
      const result = await earningsService.getEarningsBreakdown(riderId, 'monthly');

      expect(result).toHaveLength(2);
      expect(result[0].period).toBe('2024-01');
      expect(result[0].totalEarnings).toBe(150.00);
      expect(result[0].deliveryCount).toBe(6);
      expect(result[1].period).toBe('2024-02');
      expect(result[1].totalEarnings).toBe(200.00);
    });

    test('should handle daily breakdown', async () => {
      Payment.aggregate = jest.fn().mockResolvedValue([
        {
          _id: { year: 2024, month: 1, day: 15 },
          totalEarnings: 50.00,
          totalAmount: 60.00,
          platformFees: 10.00,
          deliveryCount: 2,
          averageEarnings: 25.00,
          date: '2024-01-15'
        }
      ]);

      const result = await earningsService.getEarningsBreakdown(riderId, 'daily');

      expect(result).toHaveLength(1);
      expect(result[0].period).toBe('2024-01-15');
      expect(result[0].totalEarnings).toBe(50.00);
    });

    test('should handle weekly breakdown', async () => {
      Payment.aggregate = jest.fn().mockResolvedValue([
        {
          _id: { year: 2024, week: 3 },
          totalEarnings: 75.00,
          totalAmount: 90.00,
          platformFees: 15.00,
          deliveryCount: 3,
          averageEarnings: 25.00,
          date: '2024-W03'
        }
      ]);

      const result = await earningsService.getEarningsBreakdown(riderId, 'weekly');

      expect(result).toHaveLength(1);
      expect(result[0].period).toBe('2024-W03');
      expect(result[0].totalEarnings).toBe(75.00);
    });

    test('should apply date filters', async () => {
      const options = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 5
      };

      await earningsService.getEarningsBreakdown(riderId, 'monthly', options);

      expect(Payment.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              rider: riderId,
              status: 'completed',
              createdAt: expect.objectContaining({
                $gte: new Date('2024-01-01'),
                $lte: new Date('2024-01-31')
              })
            })
          }),
          expect.objectContaining({ $limit: 5 })
        ])
      );
    });
  });

  describe('getRiderPerformanceMetrics', () => {
    beforeEach(() => {
      // Mock offer counts
      Offer.countDocuments = jest.fn()
        .mockResolvedValueOnce(25) // total offers
        .mockResolvedValueOnce(20); // completed offers

      // Mock payment aggregation
      Payment.aggregate = jest.fn().mockResolvedValue([{
        _id: null,
        totalEarnings: 500.00,
        deliveryCount: 20
      }]);
    });

    test('should return comprehensive performance metrics', async () => {
      const result = await earningsService.getRiderPerformanceMetrics(riderId);

      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('totalDeliveries');
      expect(result).toHaveProperty('averageDeliveryTime');
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('earningsEfficiency');
      expect(result).toHaveProperty('deliveryPatterns');

      expect(result.completionRate).toBe(80); // 20/25 * 100
      expect(result.totalDeliveries).toBe(20);
    });

    test('should handle zero deliveries', async () => {
      Offer.countDocuments = jest.fn()
        .mockResolvedValueOnce(0) // total offers
        .mockResolvedValueOnce(0); // completed offers

      const result = await earningsService.getRiderPerformanceMetrics(riderId);

      expect(result.completionRate).toBe(0);
      expect(result.totalDeliveries).toBe(0);
    });
  });

  describe('Earnings Calculations', () => {
    test('should calculate pending earnings correctly', async () => {
      Payment.find = jest.fn().mockResolvedValue([
        { riderEarnings: 15.00 },
        { riderEarnings: 20.00 },
        { riderEarnings: 10.00 }
      ]);

      const pendingEarnings = await earningsService._getPendingEarnings(riderId);

      expect(Payment.find).toHaveBeenCalledWith({
        rider: riderId,
        status: { $in: ['pending', 'processing'] }
      });
      expect(pendingEarnings).toBe(45.00);
    });

    test('should handle no pending earnings', async () => {
      Payment.find = jest.fn().mockResolvedValue([]);

      const pendingEarnings = await earningsService._getPendingEarnings(riderId);

      expect(pendingEarnings).toBe(0);
    });

    test('should calculate earnings trends', async () => {
      // Mock current month earnings
      Payment.aggregate = jest.fn()
        .mockResolvedValueOnce([{
          _id: null,
          totalEarnings: 200.00,
          deliveryCount: 8
        }])
        .mockResolvedValueOnce([{
          _id: null,
          totalEarnings: 150.00,
          deliveryCount: 6
        }]);

      const trends = await earningsService._calculateEarningsTrends(riderId);

      expect(trends.currentMonthEarnings).toBe(200.00);
      expect(trends.lastMonthEarnings).toBe(150.00);
      expect(trends.currentMonthDeliveries).toBe(8);
      expect(trends.lastMonthDeliveries).toBe(6);
      expect(trends.earningsChange).toBe(33.33); // (200-150)/150 * 100
      expect(trends.deliveryChange).toBe(33.33); // (8-6)/6 * 100
    });

    test('should handle zero previous earnings in trends', async () => {
      Payment.aggregate = jest.fn()
        .mockResolvedValueOnce([{
          _id: null,
          totalEarnings: 100.00,
          deliveryCount: 4
        }])
        .mockResolvedValueOnce([]); // No previous month data

      const trends = await earningsService._calculateEarningsTrends(riderId);

      expect(trends.earningsChange).toBe(0);
      expect(trends.deliveryChange).toBe(0);
    });
  });

  describe('Time-based Earnings', () => {
    beforeEach(() => {
      Payment.aggregate = jest.fn().mockResolvedValue([{
        _id: null,
        totalEarnings: 50.00,
        deliveryCount: 2,
        averageEarnings: 25.00
      }]);
    });

    test('should calculate time-based earnings for all periods', async () => {
      const timeBasedEarnings = await earningsService._getTimeBasedEarnings(riderId, 'USD');

      expect(timeBasedEarnings).toHaveProperty('today');
      expect(timeBasedEarnings).toHaveProperty('thisWeek');
      expect(timeBasedEarnings).toHaveProperty('thisMonth');
      expect(timeBasedEarnings).toHaveProperty('thisYear');

      expect(timeBasedEarnings.today.currency).toBe('USD');
      expect(timeBasedEarnings.today.totalEarnings).toBe(50.00);
      expect(timeBasedEarnings.today.deliveryCount).toBe(2);
    });

    test('should handle empty time periods', async () => {
      Payment.aggregate = jest.fn().mockResolvedValue([]);

      const timeBasedEarnings = await earningsService._getTimeBasedEarnings(riderId, 'USD');

      expect(timeBasedEarnings.today.totalEarnings).toBe(0);
      expect(timeBasedEarnings.today.deliveryCount).toBe(0);
      expect(timeBasedEarnings.today.averageEarnings).toBe(0);
    });
  });

  describe('Performance Metrics Calculations', () => {
    test('should calculate earnings efficiency', async () => {
      Payment.aggregate = jest.fn().mockResolvedValue([{
        _id: null,
        totalEarnings: 300.00,
        deliveryCount: 12
      }]);

      const efficiency = await earningsService._calculateEarningsEfficiency(riderId);

      expect(efficiency.earningsPerDelivery).toBe(25.00); // 300/12
      expect(efficiency.totalDeliveries).toBe(12);
      expect(efficiency.estimatedTotalHours).toBe(18); // 12 * 1.5
      expect(efficiency.earningsPerHour).toBe(16.67); // 300/18, rounded
    });

    test('should handle zero deliveries in efficiency calculation', async () => {
      Payment.aggregate = jest.fn().mockResolvedValue([]);

      const efficiency = await earningsService._calculateEarningsEfficiency(riderId);

      expect(efficiency.earningsPerDelivery).toBe(0);
      expect(efficiency.earningsPerHour).toBe(0);
      expect(efficiency.totalDeliveries).toBe(0);
    });

    test('should analyze delivery patterns', async () => {
      Payment.aggregate = jest.fn().mockResolvedValue([
        {
          _id: { dayOfWeek: 1, hour: 9 }, // Monday, 9 AM
          deliveryCount: 2,
          totalEarnings: 50.00,
          averageEarnings: 25.00
        },
        {
          _id: { dayOfWeek: 1, hour: 14 }, // Monday, 2 PM
          deliveryCount: 1,
          totalEarnings: 30.00,
          averageEarnings: 30.00
        },
        {
          _id: { dayOfWeek: 2, hour: 9 }, // Tuesday, 9 AM
          deliveryCount: 1,
          totalEarnings: 25.00,
          averageEarnings: 25.00
        }
      ]);

      const patterns = await earningsService._analyzeDeliveryPatterns(riderId);

      expect(patterns.dayPatterns).toHaveProperty('1'); // Monday
      expect(patterns.dayPatterns).toHaveProperty('2'); // Tuesday
      expect(patterns.hourPatterns).toHaveProperty('9'); // 9 AM
      expect(patterns.hourPatterns).toHaveProperty('14'); // 2 PM

      expect(patterns.dayPatterns['1'].deliveryCount).toBe(3); // 2 + 1
      expect(patterns.dayPatterns['1'].totalEarnings).toBe(80.00); // 50 + 30
      expect(patterns.hourPatterns['9'].deliveryCount).toBe(3); // 2 + 1
      expect(patterns.hourPatterns['9'].totalEarnings).toBe(75.00); // 50 + 25
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      Payment.getPaymentStats = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(earningsService.getRiderEarningsSummary(riderId))
        .rejects.toThrow('Database error');
    });

    test('should handle aggregation errors', async () => {
      Payment.aggregate = jest.fn().mockRejectedValue(new Error('Aggregation failed'));

      await expect(earningsService.getEarningsBreakdown(riderId))
        .rejects.toThrow('Aggregation failed');
    });

    test('should return default values on calculation errors', async () => {
      Payment.aggregate = jest.fn().mockRejectedValue(new Error('Calculation error'));

      const trends = await earningsService._calculateEarningsTrends(riderId);

      expect(trends.earningsChange).toBe(0);
      expect(trends.deliveryChange).toBe(0);
      expect(trends.currentMonthEarnings).toBe(0);
    });
  });
});