const mongoose = require('mongoose');
const Earnings = require('../models/Earnings');
const Payment = require('../models/Payment');
const Offer = require('../models/Offer');
const User = require('../models/User');

// Mock data
const mockRiderId = new mongoose.Types.ObjectId();
const mockBusinessId = new mongoose.Types.ObjectId();
const mockOfferId = new mongoose.Types.ObjectId();
const mockPaymentId = new mongoose.Types.ObjectId();

// Mock completed offer
const mockOffer = {
  _id: mockOfferId,
  title: 'Test Delivery',
  business: mockBusinessId,
  status: 'completed',
  acceptedBy: mockRiderId,
  payment: {
    amount: 25.50,
    paymentMethod: 'card',
    currency: 'USD'
  },
  estimatedDistance: 5000, // 5km
  estimatedDuration: 30, // 30 minutes
  actualDistance: 4800,
  actualDuration: 28,
  pickup: { address: '123 Main St' },
  delivery: { address: '456 Oak Ave' },
  createdAt: new Date('2023-01-15T10:00:00Z'),
  completedAt: new Date('2023-01-15T10:45:00Z')
};

// Mock payment record
const mockPayment = {
  _id: mockPaymentId,
  offer: mockOfferId,
  business: mockBusinessId,
  rider: mockRiderId,
  totalAmount: 25.50,
  platformFee: 2.55, // 10% fee
  riderEarnings: 22.95,
  currency: 'USD',
  paymentMethod: 'credit_card',
  status: 'completed',
  processedAt: new Date('2023-01-15T10:45:00Z')
};

describe('Earnings Model', () => {
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

  describe('Earnings Creation', () => {
    test('should create earnings from completed offer and payment', async () => {
      const earnings = await Earnings.createFromOffer(mockOffer, mockPayment);

      expect(earnings).toBeDefined();
      expect(earnings.rider.toString()).toBe(mockRiderId.toString());
      expect(earnings.offer.toString()).toBe(mockOfferId.toString());
      expect(earnings.payment.toString()).toBe(mockPaymentId.toString());
      expect(earnings.grossAmount).toBe(25.50);
      expect(earnings.platformFee).toBe(2.55);
      expect(earnings.netAmount).toBe(22.95);
      expect(earnings.paymentStatus).toBe('paid'); // Completed payment
      expect(earnings.paymentMethod).toBe('card');
      expect(earnings.distance).toBe(4800); // Actual distance
      expect(earnings.duration).toBe(28); // Actual duration
    });

    test('should prevent duplicate earnings for the same offer', async () => {
      // Create first earnings record
      await Earnings.createFromOffer(mockOffer, mockPayment);

      // Try to create another one for the same offer
      const duplicateEarnings = await Earnings.createFromOffer(mockOffer, mockPayment);

      // Should return the existing record
      expect(duplicateEarnings).toBeDefined();
      const count = await Earnings.countDocuments({ offer: mockOfferId });
      expect(count).toBe(1);
    });

    test('should reject non-completed offers', async () => {
      const incompleteOffer = {
        ...mockOffer,
        status: 'in_progress'
      };

      await expect(Earnings.createFromOffer(incompleteOffer, mockPayment))
        .rejects.toThrow('Only completed offers can generate earnings');
    });

    test('should reject offers without assigned rider', async () => {
      const unassignedOffer = {
        ...mockOffer,
        acceptedBy: null
      };

      await expect(Earnings.createFromOffer(unassignedOffer, mockPayment))
        .rejects.toThrow('Offer must be accepted by a rider');
    });

    test('should require payment record', async () => {
      await expect(Earnings.createFromOffer(mockOffer, null))
        .rejects.toThrow('Payment record is required');
    });

    test('should handle pending payment status', async () => {
      const pendingPayment = {
        ...mockPayment,
        status: 'pending'
      };

      const earnings = await Earnings.createFromOffer(mockOffer, pendingPayment);

      expect(earnings.paymentStatus).toBe('pending');
      expect(earnings.paidAt).toBeUndefined();
    });

    test('should use estimated values when actual values are not available', async () => {
      const offerWithoutActuals = {
        ...mockOffer,
        actualDistance: undefined,
        actualDuration: undefined
      };

      const earnings = await Earnings.createFromOffer(offerWithoutActuals, mockPayment);

      expect(earnings.distance).toBe(5000); // Falls back to estimated
      expect(earnings.duration).toBe(30); // Falls back to estimated
    });
  });

  describe('Earnings Calculations', () => {
    let earnings;

    beforeEach(async () => {
      earnings = await Earnings.createFromOffer(mockOffer, mockPayment);
    });

    test('should calculate final amount correctly', async () => {
      expect(earnings.finalAmount).toBe(22.95); // netAmount + bonusAmount (0) + adjustments (0)
    });

    test('should calculate earnings per hour', async () => {
      const expectedPerHour = (22.95 / 28) * 60; // Convert minutes to hours
      expect(earnings.earningsPerHour).toBeCloseTo(expectedPerHour, 2);
    });

    test('should calculate earnings per kilometer', async () => {
      const expectedPerKm = 22.95 / (4800 / 1000); // Convert meters to km
      expect(earnings.earningsPerKm).toBeCloseTo(expectedPerKm, 2);
    });

    test('should handle zero duration gracefully', async () => {
      earnings.duration = 0;
      expect(earnings.earningsPerHour).toBe(0);
    });

    test('should handle zero distance gracefully', async () => {
      earnings.distance = 0;
      expect(earnings.earningsPerKm).toBe(0);
    });
  });

  describe('Bonus Management', () => {
    let earnings;

    beforeEach(async () => {
      earnings = await Earnings.createFromOffer(mockOffer, mockPayment);
    });

    test('should add bonus successfully', async () => {
      await earnings.addBonus(5.00, 'Peak hours bonus');

      expect(earnings.bonusAmount).toBe(5.00);
      expect(earnings.bonusReason).toBe('Peak hours bonus');
      expect(earnings.finalAmount).toBe(27.95); // 22.95 + 5.00
    });

    test('should accumulate multiple bonuses', async () => {
      await earnings.addBonus(3.00, 'First bonus');
      await earnings.addBonus(2.00, 'Second bonus');

      expect(earnings.bonusAmount).toBe(5.00);
      expect(earnings.finalAmount).toBe(27.95);
    });

    test('should reject negative bonus amounts', async () => {
      await expect(earnings.addBonus(-5.00, 'Invalid bonus'))
        .rejects.toThrow('Bonus amount must be positive');
    });

    test('should reject zero bonus amounts', async () => {
      await expect(earnings.addBonus(0, 'Invalid bonus'))
        .rejects.toThrow('Bonus amount must be positive');
    });
  });

  describe('Adjustments Management', () => {
    let earnings;

    beforeEach(async () => {
      earnings = await Earnings.createFromOffer(mockOffer, mockPayment);
    });

    test('should add positive adjustment', async () => {
      await earnings.addAdjustment({
        amount: 5.00,
        reason: 'Distance calculation correction',
        appliedBy: new mongoose.Types.ObjectId()
      });

      expect(earnings.adjustments).toHaveLength(1);
      expect(earnings.adjustments[0].amount).toBe(5.00);
      expect(earnings.adjustments[0].reason).toBe('Distance calculation correction');
      expect(earnings.finalAmount).toBe(27.95); // 22.95 + 5.00
    });

    test('should add negative adjustment', async () => {
      await earnings.addAdjustment({
        amount: -3.00,
        reason: 'Customer complaint resolution'
      });

      expect(earnings.adjustments).toHaveLength(1);
      expect(earnings.adjustments[0].amount).toBe(-3.00);
      expect(earnings.finalAmount).toBe(19.95); // 22.95 - 3.00
    });

    test('should add multiple adjustments', async () => {
      await earnings.addAdjustment({
        amount: 5.00,
        reason: 'Distance bonus'
      });

      await earnings.addAdjustment({
        amount: -2.00,
        reason: 'Late delivery penalty'
      });

      expect(earnings.adjustments).toHaveLength(2);
      expect(earnings.finalAmount).toBe(25.95); // 22.95 + 5.00 - 2.00
    });

    test('should reject adjustment without amount', async () => {
      await expect(earnings.addAdjustment({
        reason: 'Missing amount'
      })).rejects.toThrow('Valid adjustment with amount is required');
    });

    test('should reject adjustment without reason', async () => {
      await expect(earnings.addAdjustment({
        amount: 5.00
      })).rejects.toThrow('Adjustment reason is required');
    });

    test('should track who applied the adjustment', async () => {
      const adminId = new mongoose.Types.ObjectId();

      await earnings.addAdjustment({
        amount: 5.00,
        reason: 'Manual adjustment',
        appliedBy: adminId
      });

      expect(earnings.adjustments[0].appliedBy.toString()).toBe(adminId.toString());
      expect(earnings.adjustments[0].appliedAt).toBeDefined();
    });
  });

  describe('Payment Status Management', () => {
    let earnings;

    beforeEach(async () => {
      earnings = await Earnings.createFromOffer(mockOffer, {
        ...mockPayment,
        status: 'pending'
      });
    });

    test('should update payment status', async () => {
      await earnings.updatePaymentStatus('processing');
      expect(earnings.paymentStatus).toBe('processing');

      await earnings.updatePaymentStatus('paid');
      expect(earnings.paymentStatus).toBe('paid');
      expect(earnings.paidAt).toBeDefined();
    });

    test('should reject invalid payment status', async () => {
      await expect(earnings.updatePaymentStatus('invalid_status'))
        .rejects.toThrow('Invalid payment status');
    });

    test('should set paidAt when status becomes paid', async () => {
      expect(earnings.paidAt).toBeUndefined();

      await earnings.updatePaymentStatus('paid');
      expect(earnings.paidAt).toBeDefined();
    });

    test('should not overwrite existing paidAt', async () => {
      const originalPaidAt = new Date('2023-01-15T11:00:00Z');
      earnings.paidAt = originalPaidAt;
      await earnings.save();

      await earnings.updatePaymentStatus('paid');
      expect(earnings.paidAt).toEqual(originalPaidAt);
    });
  });

  describe('Earnings Summary', () => {
    beforeEach(async () => {
      // Create multiple earnings records for testing
      const offers = [
        {
          ...mockOffer,
          _id: new mongoose.Types.ObjectId(),
          payment: { amount: 20.00, paymentMethod: 'cash', currency: 'USD' },
          actualDistance: 4000,
          actualDuration: 25,
          completedAt: new Date('2023-01-01T10:00:00Z')
        },
        {
          ...mockOffer,
          _id: new mongoose.Types.ObjectId(),
          payment: { amount: 30.00, paymentMethod: 'card', currency: 'USD' },
          actualDistance: 6000,
          actualDuration: 35,
          completedAt: new Date('2023-01-02T10:00:00Z')
        },
        {
          ...mockOffer,
          _id: new mongoose.Types.ObjectId(),
          payment: { amount: 15.00, paymentMethod: 'digital', currency: 'USD' },
          actualDistance: 3000,
          actualDuration: 20,
          completedAt: new Date('2023-01-03T10:00:00Z')
        }
      ];

      const payments = [
        {
          ...mockPayment,
          _id: new mongoose.Types.ObjectId(),
          offer: offers[0]._id,
          totalAmount: 20.00,
          platformFee: 2.00,
          riderEarnings: 18.00,
          paymentMethod: 'cash',
          status: 'completed'
        },
        {
          ...mockPayment,
          _id: new mongoose.Types.ObjectId(),
          offer: offers[1]._id,
          totalAmount: 30.00,
          platformFee: 3.00,
          riderEarnings: 27.00,
          paymentMethod: 'credit_card',
          status: 'completed'
        },
        {
          ...mockPayment,
          _id: new mongoose.Types.ObjectId(),
          offer: offers[2]._id,
          totalAmount: 15.00,
          platformFee: 1.50,
          riderEarnings: 13.50,
          paymentMethod: 'paypal',
          status: 'pending'
        }
      ];

      for (let i = 0; i < offers.length; i++) {
        await Earnings.createFromOffer(offers[i], payments[i]);
      }
    });

    test('should get rider earnings summary', async () => {
      const summary = await Earnings.getRiderEarningsSummary(mockRiderId);

      expect(summary).toBeDefined();
      expect(summary.summary).toBeDefined();
      expect(summary.summary.totalEarnings).toBe(65.00); // 20 + 30 + 15
      expect(summary.summary.totalFees).toBe(6.50); // 2 + 3 + 1.5
      expect(summary.summary.totalNet).toBe(58.50); // 18 + 27 + 13.5
      expect(summary.summary.totalDeliveries).toBe(3);
      expect(summary.summary.totalDistance).toBe(13000); // 4000 + 6000 + 3000
      expect(summary.summary.totalDuration).toBe(80); // 25 + 35 + 20
      expect(summary.summary.paidEarnings).toBe(45.00); // 18 + 27 (completed payments)
      expect(summary.summary.pendingEarnings).toBe(13.50); // pending payment
      expect(summary.paymentMethods).toHaveLength(3); // cash, card, digital
      expect(summary.dailyEarnings).toHaveLength(3); // 3 different days
    });

    test('should filter earnings by date range', async () => {
      const summary = await Earnings.getRiderEarningsSummary(mockRiderId, {
        startDate: '2023-01-02T00:00:00Z',
        endDate: '2023-01-03T23:59:59Z'
      });

      expect(summary.summary.totalEarnings).toBe(45.00); // 30 + 15
      expect(summary.summary.totalDeliveries).toBe(2);
      expect(summary.dailyEarnings).toHaveLength(2); // 2 days in range
    });

    test('should filter earnings by payment status', async () => {
      const summary = await Earnings.getRiderEarningsSummary(mockRiderId, {
        paymentStatus: 'paid'
      });

      expect(summary.summary.totalDeliveries).toBe(2); // Only completed payments
      expect(summary.summary.totalFinal).toBe(45.00); // 18 + 27
    });

    test('should get earnings for specific period', async () => {
      // Create earnings with dates in the current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const recentOffer = {
        ...mockOffer,
        _id: new mongoose.Types.ObjectId(),
        payment: { amount: 40.00, paymentMethod: 'card', currency: 'USD' },
        actualDistance: 8000,
        actualDuration: 45,
        completedAt: new Date(currentYear, currentMonth, 1)
      };

      const recentPayment = {
        ...mockPayment,
        _id: new mongoose.Types.ObjectId(),
        offer: recentOffer._id,
        totalAmount: 40.00,
        platformFee: 4.00,
        riderEarnings: 36.00,
        paymentMethod: 'credit_card',
        status: 'completed'
      };

      await Earnings.createFromOffer(recentOffer, recentPayment);

      const monthSummary = await Earnings.getEarningsForPeriod(mockRiderId, 'month');
      expect(monthSummary.summary.totalDeliveries).toBe(1);
      expect(monthSummary.summary.totalEarnings).toBe(40.00);

      const yearSummary = await Earnings.getEarningsForPeriod(mockRiderId, 'year');
      expect(yearSummary.summary.totalDeliveries).toBe(4); // All 4 earnings records
    });
  });

  describe('Formatted Data', () => {
    test('should return formatted earnings data', async () => {
      const earnings = await Earnings.createFromOffer(mockOffer, mockPayment);
      const formatted = earnings.getFormattedData();

      expect(formatted).toBeDefined();
      expect(formatted.id).toBeDefined();
      expect(formatted.rider).toBeDefined();
      expect(formatted.offer).toBeDefined();
      expect(formatted.grossAmount).toBe(25.50);
      expect(formatted.platformFee).toBe(2.55);
      expect(formatted.netAmount).toBe(22.95);
      expect(formatted.finalAmount).toBe(22.95);
      expect(formatted.paymentStatus).toBe('paid');
      expect(formatted.paymentMethod).toBe('card');
      expect(formatted.distance).toBe(4800);
      expect(formatted.duration).toBe(28);
      expect(formatted.adjustments).toEqual([]);
    });

    test('should include bonus and adjustments in formatted data', async () => {
      const earnings = await Earnings.createFromOffer(mockOffer, mockPayment);
      
      await earnings.addBonus(5.00, 'Peak hours bonus');
      await earnings.addAdjustment({
        amount: 2.00,
        reason: 'Distance adjustment'
      });

      const formatted = earnings.getFormattedData();
      
      expect(formatted.bonusAmount).toBe(5.00);
      expect(formatted.bonusReason).toBe('Peak hours bonus');
      expect(formatted.adjustments).toHaveLength(1);
      expect(formatted.adjustments[0].amount).toBe(2.00);
      expect(formatted.adjustments[0].reason).toBe('Distance adjustment');
      expect(formatted.finalAmount).toBe(29.95); // 22.95 + 5.00 + 2.00
    });
  });

  describe('Top Earners', () => {
    beforeEach(async () => {
      // Create earnings for multiple riders
      const rider1 = new mongoose.Types.ObjectId();
      const rider2 = new mongoose.Types.ObjectId();
      
      // Create users
      await User.create([
        { _id: rider1, name: 'Rider One', email: 'rider1@test.com', password: 'password', role: 'rider', profile: { phone: '123', vehicleType: 'bike', rating: 4.8 } },
        { _id: rider2, name: 'Rider Two', email: 'rider2@test.com', password: 'password', role: 'rider', profile: { phone: '456', vehicleType: 'car', rating: 4.5 } }
      ]);

      // Create earnings for rider1 (higher earner)
      const earnings1 = new Earnings({
        rider: rider1,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 100,
        platformFee: 10,
        netAmount: 90,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        earnedAt: new Date()
      });
      await earnings1.save();

      // Create earnings for rider2 (lower earner)
      const earnings2 = new Earnings({
        rider: rider2,
        offer: new mongoose.Types.ObjectId(),
        payment: new mongoose.Types.ObjectId(),
        grossAmount: 50,
        platformFee: 5,
        netAmount: 45,
        paymentStatus: 'paid',
        paymentMethod: 'card',
        earnedAt: new Date()
      });
      await earnings2.save();
    });

    test('should get top earners', async () => {
      const topEarners = await Earnings.getTopEarners({ period: 'month', limit: 5 });

      expect(topEarners).toHaveLength(2);
      expect(topEarners[0].totalEarnings).toBe(90); // Highest earner first
      expect(topEarners[0].riderName).toBe('Rider One');
      expect(topEarners[1].totalEarnings).toBe(45);
      expect(topEarners[1].riderName).toBe('Rider Two');
    });
  });
});