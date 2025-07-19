const mongoose = require('mongoose');
const EarningsService = require('../services/EarningsService');
const Earnings = require('../models/Earnings');
const Payment = require('../models/Payment');
const Offer = require('../models/Offer');
const User = require('../models/User');

// Mock data
const mockRiderId = new mongoose.Types.ObjectId();
const mockBusinessId = new mongoose.Types.ObjectId();
const mockOfferId = new mongoose.Types.ObjectId();

describe('EarningsService', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lastmile_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  });

  afterAll(async () => {
    // Clean up and disconnect
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Earnings.deleteMany({});
    await Payment.deleteMany({});
    await Offer.deleteMany({});
    await User.deleteMany({});
  });

  describe('generateEarningsFromOffer', () => {
    let mockOffer, mockRider, mockBusiness;

    beforeEach(async () => {
      // Create test users
      mockRider = await User.create({
        _id: mockRiderId,
        name: 'Test Rider',
        email: 'rider@test.com',
        password: 'password',
        role: 'rider',
        profile: {
          phone: '1234567890',
          vehicleType: 'bike',
          completedDeliveries: 5
        }
      });

      mockBusiness = await User.create({
        _id: mockBusinessId,
        name: 'Test Business',
        email: 'business@test.com',
        password: 'password',
        role: 'business',
        profile: {
          businessName: 'Test Business Inc',
          businessAddress: {
            street: '123 Business St',
            city: 'Business City',
            state: 'BC',
            zipCode: '12345'
          },
          businessPhone: '0987654321'
        }
      });

      // Create test offer
      mockOffer = await Offer.create({
        _id: mockOfferId,
        business: mockBusinessId,
        title: 'Test Delivery',
        description: 'Test delivery description',
        pickup: {
          address: '123 Pickup St',
          coordinates: [-74.006, 40.7128],
          contactName: 'Pickup Contact',
          contactPhone: '1111111111'
        },
        delivery: {
          address: '456 Delivery Ave',
          coordinates: [-74.0059, 40.7127],
          contactName: 'Delivery Contact',
          contactPhone: '2222222222'
        },
        payment: {
          amount: 25.50,
          currency: 'USD',
          paymentMethod: 'card'
        },
        status: 'completed',
        acceptedBy: mockRiderId,
        acceptedAt: new Date('2023-01-15T10:00:00Z'),
        completedAt: new Date('2023-01-15T10:45:00Z'),
        estimatedDistance: 5000,
        estimatedDuration: 30,
        actualDistance: 4800,
        actualDuration: 28
      });
    });

    test('should generate earnings successfully for completed offer', async () => {
      const result = await EarningsService.generateEarningsFromOffer(mockOfferId.toString());

      expect(result.success).toBe(true);
      expect(result.message).toBe('Earnings generated successfully');
      expect(result.earnings).toBeDefined();
      expect(result.earnings.grossAmount).toBe(25.50);
      expect(result.earnings.netAmount).toBeCloseTo(24.23, 2); // After 5% platform fee
      expect(result.payment).toBeDefined();

      // Verify rider's completed deliveries count was updated
      const updatedRider = await User.findById(mockRiderId);
      expect(updatedRider.profile.completedDeliveries).toBe(6);
    });

    test('should return existing earnings if already generated', async () => {
      // Generate earnings first time
      await EarningsService.generateEarningsFromOffer(mockOfferId.toString());

      // Try to generate again
      const result = await EarningsService.generateEarningsFromOffer(mockOfferId.toString());

      expect(result.success).toBe(true);
      expect(result.message).toBe('Earnings already generated for this offer');
      expect(result.earnings).toBeDefined();

      // Verify only one earnings record exists
      const earningsCount = await Earnings.countDocuments({ offer: mockOfferId });
      expect(earningsCount).toBe(1);
    });

    test('should throw error for non-existent offer', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(EarningsService.generateEarningsFromOffer(nonExistentId.toString()))
        .rejects.toThrow('Offer not found');
    });

    test('should throw error for non-completed offer', async () => {
      mockOffer.status = 'in_progress';
      await mockOffer.save();

      await expect(EarningsService.generateEarningsFromOffer(mockOfferId.toString()))
        .rejects.toThrow('Only completed offers can generate earnings');
    });

    test('should throw error for offer without assigned rider', async () => {
      mockOffer.acceptedBy = null;
      await mockOffer.save();

      await expect(EarningsService.generateEarningsFromOffer(mockOfferId.toString()))
        .rejects.toThrow('Offer must be accepted by a rider');
    });

    test('should create payment record if it does not exist', async () => {
      const result = await EarningsService.generateEarningsFromOffer(mockOfferId.toString());

      expect(result.success).toBe(true);
      
      // Verify payment was created
      const payment = await Payment.findOne({ offer: mockOfferId });
      expect(payment).toBeDefined();
      expect(payment.totalAmount).toBe(25.50);
      expect(payment.platformFee).toBeCloseTo(1.28, 2); // 5% of 25.50 with minimum 0.50
    });

    test('should use existing payment record if available', async () => {
      // Create payment record first
      const existingPayment = await Payment.create({
        offer: mockOfferId,
        business: mockBusinessId,
        rider: mockRiderId,
        totalAmount: 25.50,
        platformFee: 2.00,
        riderEarnings: 23.50,
        currency: 'USD',
        paymentMethod: 'credit_card',
        status: 'completed'
      });

      const result = await EarningsService.generateEarningsFromOffer(mockOfferId.toString());

      expect(result.success).toBe(true);
      expect(result.earnings.platformFee).toBe(2.00); // Uses existing payment's fee
      expect(result.earnings.netAmount).toBe(23.50);

      // Verify no duplicate payment was created
      const paymentCount = await Payment.countDocuments({ offer: mockOfferId });
      expect(paymentCount).toBe(1);
    });
  });

  describe('getRiderEarningsDashboard', () => {
    let mockRider;

    beforeEach(async () => {
      mockRider = await User.create({
        _id: mockRiderId,
        name: 'Test Rider',
        email: 'rider@test.com',
        password: 'password',
        role: 'rider',
        profile: {
          phone: '1234567890',
          vehicleType: 'bike',
          completedDeliveries: 10,
          rating: 4.8
        }
      });

      // Create some earnings records
      const earnings1 = new Earnings({
        rider: mockRiderId,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 25.00,
        platformFee: 2.50,
        netAmount: 22.50,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        distance: 5000,
        duration: 30,
        earnedAt: new Date()
      });
      await earnings1.save();

      const earnings2 = new Earnings({
        rider: mockRiderId,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 30.00,
        platformFee: 3.00,
        netAmount: 27.00,
        paymentStatus: 'pending',
        paymentMethod: 'digital',
        distance: 6000,
        duration: 35,
        earnedAt: new Date()
      });
      await earnings2.save();
    });

    test('should return comprehensive dashboard data', async () => {
      const dashboard = await EarningsService.getRiderEarningsDashboard(mockRiderId.toString());

      expect(dashboard.success).toBe(true);
      expect(dashboard.period).toBe('month');
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.allTimeStats).toBeDefined();
      expect(dashboard.recentEarnings).toBeDefined();
      expect(dashboard.pendingEarnings).toBeDefined();
      expect(dashboard.performanceMetrics).toBeDefined();
      
      expect(dashboard.summary.totalEarnings).toBe(55.00);
      expect(dashboard.summary.totalNet).toBe(49.50);
      expect(dashboard.summary.totalDeliveries).toBe(2);
      expect(dashboard.pendingEarnings).toHaveLength(1);
      expect(dashboard.pendingEarnings[0].finalAmount).toBe(27.00);
    });

    test('should calculate performance metrics correctly', async () => {
      const dashboard = await EarningsService.getRiderEarningsDashboard(mockRiderId.toString());

      expect(dashboard.performanceMetrics).toBeDefined();
      expect(dashboard.performanceMetrics.efficiency).toBeDefined();
      expect(dashboard.performanceMetrics.productivity).toBeDefined();
      
      const efficiency = dashboard.performanceMetrics.efficiency;
      expect(efficiency.earningsPerDelivery).toBeCloseTo(24.75, 2); // 49.50 / 2
      expect(efficiency.earningsPerHour).toBeCloseTo(45.69, 2); // (49.50 / 65) * 60
      expect(efficiency.earningsPerKm).toBeCloseTo(4.5, 2); // 49.50 / (11000/1000)
    });

    test('should handle different time periods', async () => {
      const weekDashboard = await EarningsService.getRiderEarningsDashboard(mockRiderId.toString(), { period: 'week' });
      const yearDashboard = await EarningsService.getRiderEarningsDashboard(mockRiderId.toString(), { period: 'year' });

      expect(weekDashboard.period).toBe('week');
      expect(yearDashboard.period).toBe('year');
      expect(weekDashboard.summary).toBeDefined();
      expect(yearDashboard.summary).toBeDefined();
    });
  });

  describe('getEarningsHistory', () => {
    beforeEach(async () => {
      // Create multiple earnings records with different dates
      const dates = [
        new Date('2023-01-01'),
        new Date('2023-01-02'),
        new Date('2023-01-03'),
        new Date('2023-01-04'),
        new Date('2023-01-05')
      ];

      for (let i = 0; i < dates.length; i++) {
        const earnings = new Earnings({
          rider: mockRiderId,
          offer: new mongoose.Types.ObjectId(),
          payment: new mongoose.Types.ObjectId(),
          grossAmount: 20 + i * 5,
          platformFee: 2 + i * 0.5,
          netAmount: 18 + i * 4.5,
          paymentStatus: i % 2 === 0 ? 'paid' : 'pending',
          paymentMethod: 'card',
          distance: 4000 + i * 1000,
          duration: 25 + i * 5,
          earnedAt: dates[i]
        });
        await earnings.save();
      }
    });

    test('should return paginated earnings history', async () => {
      const history = await EarningsService.getEarningsHistory(mockRiderId.toString(), {
        page: 1,
        limit: 3
      });

      expect(history.success).toBe(true);
      expect(history.earnings).toHaveLength(3);
      expect(history.pagination.total).toBe(5);
      expect(history.pagination.page).toBe(1);
      expect(history.pagination.limit).toBe(3);
      expect(history.pagination.pages).toBe(2);
    });

    test('should filter by payment status', async () => {
      const paidHistory = await EarningsService.getEarningsHistory(mockRiderId.toString(), {
        paymentStatus: 'paid'
      });

      expect(paidHistory.success).toBe(true);
      expect(paidHistory.earnings).toHaveLength(3); // 3 paid earnings
      expect(paidHistory.earnings.every(e => e.paymentStatus === 'paid')).toBe(true);
    });

    test('should filter by date range', async () => {
      const history = await EarningsService.getEarningsHistory(mockRiderId.toString(), {
        startDate: '2023-01-02',
        endDate: '2023-01-04'
      });

      expect(history.success).toBe(true);
      expect(history.earnings).toHaveLength(3); // 3 earnings in date range
    });

    test('should sort earnings correctly', async () => {
      const ascHistory = await EarningsService.getEarningsHistory(mockRiderId.toString(), {
        sortBy: 'grossAmount',
        sortOrder: 'asc'
      });

      expect(ascHistory.success).toBe(true);
      expect(ascHistory.earnings[0].grossAmount).toBe(20); // Lowest amount first
      expect(ascHistory.earnings[4].grossAmount).toBe(40); // Highest amount last
    });

    test('should include formatted earnings data', async () => {
      const history = await EarningsService.getEarningsHistory(mockRiderId.toString());

      expect(history.success).toBe(true);
      expect(history.earnings[0]).toHaveProperty('id');
      expect(history.earnings[0]).toHaveProperty('grossAmount');
      expect(history.earnings[0]).toHaveProperty('netAmount');
      expect(history.earnings[0]).toHaveProperty('finalAmount');
      expect(history.earnings[0]).toHaveProperty('paymentStatus');
      expect(history.earnings[0]).toHaveProperty('earnedAt');
    });
  });

  describe('addBonus', () => {
    let earnings;

    beforeEach(async () => {
      earnings = new Earnings({
        rider: mockRiderId,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 25.00,
        platformFee: 2.50,
        netAmount: 22.50,
        paymentStatus: 'paid',
        paymentMethod: 'card'
      });
      await earnings.save();
    });

    test('should add bonus successfully', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const result = await EarningsService.addBonus(
        earnings._id.toString(),
        5.00,
        'Peak hours bonus',
        adminId.toString()
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Bonus added successfully');
      expect(result.earnings.bonusAmount).toBe(5.00);
      expect(result.earnings.bonusReason).toBe('Peak hours bonus');
      expect(result.earnings.finalAmount).toBe(27.50); // 22.50 + 5.00
    });

    test('should throw error for non-existent earnings', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(EarningsService.addBonus(
        nonExistentId.toString(),
        5.00,
        'Bonus',
        new mongoose.Types.ObjectId().toString()
      )).rejects.toThrow('Earnings record not found');
    });

    test('should throw error for negative bonus amount', async () => {
      await expect(EarningsService.addBonus(
        earnings._id.toString(),
        -5.00,
        'Invalid bonus',
        new mongoose.Types.ObjectId().toString()
      )).rejects.toThrow('Bonus amount must be positive');
    });

    test('should throw error for zero bonus amount', async () => {
      await expect(EarningsService.addBonus(
        earnings._id.toString(),
        0,
        'Invalid bonus',
        new mongoose.Types.ObjectId().toString()
      )).rejects.toThrow('Bonus amount must be positive');
    });
  });

  describe('addAdjustment', () => {
    let earnings;

    beforeEach(async () => {
      earnings = new Earnings({
        rider: mockRiderId,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 25.00,
        platformFee: 2.50,
        netAmount: 22.50,
        paymentStatus: 'paid',
        paymentMethod: 'card'
      });
      await earnings.save();
    });

    test('should add adjustment successfully', async () => {
      const adjustment = {
        amount: 3.00,
        reason: 'Distance correction',
        appliedBy: new mongoose.Types.ObjectId()
      };

      const result = await EarningsService.addAdjustment(earnings._id.toString(), adjustment);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Adjustment added successfully');
      expect(result.earnings.adjustments).toHaveLength(1);
      expect(result.earnings.adjustments[0].amount).toBe(3.00);
      expect(result.earnings.adjustments[0].reason).toBe('Distance correction');
    });

    test('should throw error for non-existent earnings', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const adjustment = { amount: 3.00, reason: 'Test' };
      
      await expect(EarningsService.addAdjustment(nonExistentId.toString(), adjustment))
        .rejects.toThrow('Earnings record not found');
    });
  });

  describe('getEarningsComparison', () => {
    beforeEach(async () => {
      // Create earnings for the test rider
      const earnings = new Earnings({
        rider: mockRiderId,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 25.00,
        platformFee: 2.50,
        netAmount: 22.50,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        distance: 5000,
        duration: 30,
        earnedAt: new Date()
      });
      await earnings.save();

      // Create earnings for other riders to establish platform averages
      const otherRider = new mongoose.Types.ObjectId();
      const otherEarnings = new Earnings({
        rider: otherRider,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 20.00,
        platformFee: 2.00,
        netAmount: 18.00,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        distance: 4000,
        duration: 25,
        earnedAt: new Date()
      });
      await otherEarnings.save();
    });

    test('should return earnings comparison', async () => {
      const comparison = await EarningsService.getEarningsComparison(mockRiderId.toString(), 'month');

      expect(comparison.success).toBe(true);
      expect(comparison.period).toBe('month');
      expect(comparison.comparison).toBeDefined();
      expect(comparison.riderSummary).toBeDefined();
      expect(comparison.platformAverages).toBeDefined();
      
      expect(comparison.comparison.earningsPerDelivery).toBeDefined();
      expect(comparison.comparison.earningsPerHour).toBeDefined();
      expect(comparison.comparison.earningsPerKm).toBeDefined();
      
      expect(comparison.comparison.earningsPerDelivery.rider).toBe(22.50);
      expect(comparison.comparison.earningsPerDelivery.platform).toBeDefined();
      expect(comparison.comparison.earningsPerDelivery.difference).toBeDefined();
    });
  });

  describe('updatePaymentStatus', () => {
    let earnings, payment;

    beforeEach(async () => {
      payment = await Payment.create({
        offer: new mongoose.Types.ObjectId(),
        business: mockBusinessId,
        rider: mockRiderId,
        totalAmount: 25.00,
        platformFee: 2.50,
        riderEarnings: 22.50,
        currency: 'USD',
        paymentMethod: 'credit_card',
        status: 'pending'
      });

      earnings = new Earnings({
        rider: mockRiderId,
        offer: new mongoose.Types.ObjectId(),
        payment: payment._id,
        grossAmount: 25.00,
        platformFee: 2.50,
        netAmount: 22.50,
        paymentStatus: 'pending',
        paymentMethod: 'card'
      });
      await earnings.save();
    });

    test('should update payment status successfully', async () => {
      const result = await EarningsService.updatePaymentStatus(earnings._id.toString(), 'paid');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Payment status updated successfully');
      expect(result.earnings.paymentStatus).toBe('paid');

      // Verify related payment was also updated
      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.status).toBe('completed');
    });

    test('should throw error for non-existent earnings', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await expect(EarningsService.updatePaymentStatus(nonExistentId.toString(), 'paid'))
        .rejects.toThrow('Earnings record not found');
    });

    test('should handle different status updates', async () => {
      // Test processing status
      await EarningsService.updatePaymentStatus(earnings._id.toString(), 'processing');
      let updatedEarnings = await Earnings.findById(earnings._id);
      expect(updatedEarnings.paymentStatus).toBe('processing');

      // Test failed status
      await EarningsService.updatePaymentStatus(earnings._id.toString(), 'failed');
      updatedEarnings = await Earnings.findById(earnings._id);
      expect(updatedEarnings.paymentStatus).toBe('failed');
    });
  });

  describe('Helper Methods', () => {
    test('should map payment methods correctly', () => {
      expect(EarningsService.mapPaymentMethod('cash')).toBe('cash');
      expect(EarningsService.mapPaymentMethod('card')).toBe('card');
      expect(EarningsService.mapPaymentMethod('credit_card')).toBe('card');
      expect(EarningsService.mapPaymentMethod('debit_card')).toBe('card');
      expect(EarningsService.mapPaymentMethod('paypal')).toBe('digital');
      expect(EarningsService.mapPaymentMethod('stripe')).toBe('digital');
      expect(EarningsService.mapPaymentMethod('unknown')).toBe('card'); // Default
    });

    test('should calculate performance metrics correctly', () => {
      const summary = {
        totalFinal: 100,
        totalDeliveries: 5,
        totalDuration: 150, // 2.5 hours
        totalDistance: 25000 // 25km
      };

      const metrics = EarningsService.calculatePerformanceMetrics(summary);

      expect(metrics.efficiency.earningsPerHour).toBeCloseTo(40, 2); // (100/150)*60
      expect(metrics.efficiency.earningsPerKm).toBeCloseTo(4, 2); // 100/25
      expect(metrics.efficiency.earningsPerDelivery).toBe(20); // 100/5
      expect(metrics.productivity.deliveriesPerHour).toBeCloseTo(2, 2); // (5/150)*60
      expect(metrics.productivity.averageDistance).toBe(5000); // 25000/5
      expect(metrics.productivity.averageDuration).toBe(30); // 150/5
    });

    test('should calculate percentage difference correctly', () => {
      expect(EarningsService.calculatePercentageDifference(110, 100)).toBe(10.0);
      expect(EarningsService.calculatePercentageDifference(90, 100)).toBe(-10.0);
      expect(EarningsService.calculatePercentageDifference(100, 100)).toBe(0.0);
      expect(EarningsService.calculatePercentageDifference(50, 0)).toBe(0); // Handle division by zero
    });
  });
});