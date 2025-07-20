/**
 * Business Dashboard Tests
 * Comprehensive tests for business dashboard endpoints
 */

const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

describe('Business Dashboard API', () => {
  let businessUser;
  let riderUser;
  let businessToken;
  let testOffer;
  let testPayment;
  let testNotification;

  beforeEach(async () => {
    // Create test business user
    businessUser = await User.create({
      name: 'Test Business',
      email: 'business@test.com',
      password: 'password123',
      role: 'business',
      profile: {
        businessName: 'Test Delivery Co',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345',
          coordinates: [-74.006, 40.7128]
        },
        businessPhone: '555-0001'
      },
      isVerified: true
    });

    // Create test rider user
    riderUser = await User.create({
      name: 'Test Rider',
      email: 'rider@test.com',
      password: 'password123',
      role: 'rider',
      profile: {
        phone: '555-0002',
        vehicleType: 'bike',
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        isAvailable: true,
        rating: 4.5,
        completedDeliveries: 10
      },
      isVerified: true
    });

    // Generate JWT token for business user
    businessToken = jwt.sign(
      { 
        userId: businessUser._id,
        _id: businessUser._id,
        role: businessUser.role,
        email: businessUser.email
      },
      process.env.JWT_SECRET || 'test-secret'
    );

    // Create test offer
    testOffer = await Offer.create({
      business: businessUser._id,
      title: 'Test Delivery',
      description: 'Test package delivery',
      packageDetails: {
        weight: 2.5,
        dimensions: { length: 20, width: 15, height: 10 },
        fragile: false,
        specialInstructions: 'Handle with care'
      },
      pickup: {
        address: '123 Pickup St, New York, NY',
        coordinates: [-74.006, 40.7128],
        contactName: 'John Pickup',
        contactPhone: '555-0001'
      },
      delivery: {
        address: '456 Delivery Ave, Brooklyn, NY',
        coordinates: [-73.9857, 40.6892],
        contactName: 'Jane Delivery',
        contactPhone: '555-0002'
      },
      payment: {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: 'card'
      },
      status: 'open',
      estimatedDistance: 5000,
      estimatedDuration: 30
    });

    // Create test payment
    testPayment = await Payment.create({
      offer: testOffer._id,
      business: businessUser._id,
      rider: riderUser._id,
      amount: 25.50,
      platformFee: 2.55,
      riderEarnings: 22.95,
      currency: 'USD',
      paymentMethod: 'card',
      status: 'completed',
      transactionId: 'test_txn_123',
      processedAt: new Date()
    });

    // Create test notification
    testNotification = await Notification.create({
      user: businessUser._id,
      offer: testOffer._id,
      type: 'offer_accepted',
      title: 'Offer Accepted',
      message: 'Your delivery offer has been accepted by a rider.',
      data: { offerId: testOffer._id },
      channels: ['in_app'],
      read: false
    });
  });

  describe('GET /api/business/overview', () => {
    test('should get business dashboard overview', async () => {
      const response = await request(app)
        .get('/api/business/overview')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('recentOffers');
      expect(response.body.data).toHaveProperty('offersByStatus');
      expect(response.body.data).toHaveProperty('monthlyTrends');
      expect(response.body.data).toHaveProperty('topRiders');
      expect(response.body.data).toHaveProperty('recentPayments');

      // Check overview structure
      const overview = response.body.data.overview;
      expect(overview).toHaveProperty('totalOffers');
      expect(overview).toHaveProperty('activeOffers');
      expect(overview).toHaveProperty('completedOffers');
      expect(overview).toHaveProperty('completionRate');
      expect(overview).toHaveProperty('totalSpent');
      expect(overview).toHaveProperty('thisMonthSpent');
      expect(overview).toHaveProperty('avgDeliveryTime');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/business/overview')
        .expect(401);
    });

    test('should require business role', async () => {
      const riderToken = jwt.sign(
        { 
          userId: riderUser._id,
          _id: riderUser._id,
          role: riderUser.role,
          email: riderUser.email
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .get('/api/business/overview')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(403);
    });
  });

  describe('GET /api/business/offers', () => {
    test('should get business offers with pagination', async () => {
      const response = await request(app)
        .get('/api/business/offers?page=1&limit=10')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('offers');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('statusSummary');

      // Check pagination structure
      const pagination = response.body.data.pagination;
      expect(pagination).toHaveProperty('currentPage');
      expect(pagination).toHaveProperty('totalPages');
      expect(pagination).toHaveProperty('totalOffers');
      expect(pagination).toHaveProperty('hasNext');
      expect(pagination).toHaveProperty('hasPrev');

      // Check offers structure
      if (response.body.data.offers.length > 0) {
        const offer = response.body.data.offers[0];
        expect(offer).toHaveProperty('id');
        expect(offer).toHaveProperty('status');
        expect(offer).toHaveProperty('payment');
        expect(offer).toHaveProperty('pickup');
        expect(offer).toHaveProperty('delivery');
        expect(offer).toHaveProperty('createdAt');
      }
    });

    test('should filter offers by status', async () => {
      const response = await request(app)
        .get('/api/business/offers?status=open')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned offers should have 'open' status
      response.body.data.offers.forEach(offer => {
        expect(offer.status).toBe('open');
      });
    });

    test('should filter offers by date range', async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const response = await request(app)
        .get(`/api/business/offers?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.offers)).toBe(true);
    });

    test('should filter offers by amount range', async () => {
      const response = await request(app)
        .get('/api/business/offers?minAmount=20&maxAmount=30')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned offers should be within the amount range
      response.body.data.offers.forEach(offer => {
        expect(offer.payment.amount).toBeGreaterThanOrEqual(20);
        expect(offer.payment.amount).toBeLessThanOrEqual(30);
      });
    });

    test('should sort offers by different fields', async () => {
      const response = await request(app)
        .get('/api/business/offers?sortBy=payment.amount&sortOrder=desc')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check if offers are sorted by amount in descending order
      const offers = response.body.data.offers;
      for (let i = 1; i < offers.length; i++) {
        expect(offers[i-1].payment.amount).toBeGreaterThanOrEqual(offers[i].payment.amount);
      }
    });
  });

  describe('GET /api/business/offers/:offerId', () => {
    test('should get specific offer details', async () => {
      const response = await request(app)
        .get(`/api/business/offers/${testOffer._id}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('offer');
      expect(response.body.data).toHaveProperty('tracking');
      expect(response.body.data).toHaveProperty('payment');

      // Check offer details
      const offer = response.body.data.offer;
      expect(offer.id).toBe(testOffer._id.toString());
      expect(offer.status).toBe(testOffer.status);
      expect(offer.packageDetails).toBeDefined();
      expect(offer.pickup).toBeDefined();
      expect(offer.delivery).toBeDefined();
      expect(offer.payment).toBeDefined();
    });

    test('should return 404 for non-existent offer', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/business/offers/${fakeId}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(404);
    });

    test('should not allow access to other business offers', async () => {
      // Create another business user
      const otherBusiness = await User.create({
        name: 'Other Business',
        email: 'other@test.com',
        password: 'password123',
        role: 'business',
        profile: {
          businessName: 'Other Business Co',
          businessPhone: '555-9999'
        },
        isVerified: true
      });

      // Create offer for other business
      const otherOffer = await Offer.create({
        business: otherBusiness._id,
        title: 'Other Business Delivery',
        pickup: {
          address: '789 Other St',
          coordinates: [-74.006, 40.7128]
        },
        delivery: {
          address: '321 Other Ave',
          coordinates: [-73.9857, 40.6892]
        },
        payment: { amount: 15.00 }
      });

      // Try to access other business's offer
      await request(app)
        .get(`/api/business/offers/${otherOffer._id}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/business/offers/:offerId/cancel', () => {
    test('should cancel an offer', async () => {
      const response = await request(app)
        .patch(`/api/business/offers/${testOffer._id}/cancel`)
        .set('Authorization', `Bearer ${businessToken}`)
        .send({ reason: 'No longer needed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled successfully');
      expect(response.body.data.offer.status).toBe('cancelled');

      // Verify offer is actually cancelled in database
      const updatedOffer = await Offer.findById(testOffer._id);
      expect(updatedOffer.status).toBe('cancelled');
    });

    test('should not cancel already completed offer', async () => {
      // Update offer to completed status
      await Offer.findByIdAndUpdate(testOffer._id, { status: 'delivered' });

      await request(app)
        .patch(`/api/business/offers/${testOffer._id}/cancel`)
        .set('Authorization', `Bearer ${businessToken}`)
        .send({ reason: 'Test cancellation' })
        .expect(400);
    });

    test('should return 404 for non-existent offer', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .patch(`/api/business/offers/${fakeId}/cancel`)
        .set('Authorization', `Bearer ${businessToken}`)
        .send({ reason: 'Test' })
        .expect(404);
    });
  });

  describe('GET /api/business/payments', () => {
    test('should get business payments with pagination', async () => {
      const response = await request(app)
        .get('/api/business/payments?page=1&limit=10')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('payments');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('summary');

      // Check payment structure
      if (response.body.data.payments.length > 0) {
        const payment = response.body.data.payments[0];
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('amount');
        expect(payment).toHaveProperty('status');
        expect(payment).toHaveProperty('method');
        expect(payment).toHaveProperty('createdAt');
      }

      // Check summary structure
      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('byStatus');
      expect(summary).toHaveProperty('totalSpent');
    });

    test('should filter payments by status', async () => {
      const response = await request(app)
        .get('/api/business/payments?status=completed')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned payments should have 'completed' status
      response.body.data.payments.forEach(payment => {
        expect(payment.status).toBe('completed');
      });
    });

    test('should filter payments by date range', async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const response = await request(app)
        .get(`/api/business/payments?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.payments)).toBe(true);
    });
  });

  describe('GET /api/business/analytics', () => {
    test('should get business analytics overview', async () => {
      const response = await request(app)
        .get('/api/business/analytics?period=30d&type=overview')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('offerTrends');
      expect(response.body.data).toHaveProperty('spendingTrends');
      expect(response.body.data).toHaveProperty('topRiders');

      // Check trends structure
      expect(Array.isArray(response.body.data.offerTrends)).toBe(true);
      expect(Array.isArray(response.body.data.spendingTrends)).toBe(true);
      expect(Array.isArray(response.body.data.topRiders)).toBe(true);
    });

    test('should support different time periods', async () => {
      const periods = ['7d', '30d', '90d', '1y'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/business/analytics?period=${period}`)
          .set('Authorization', `Bearer ${businessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(period);
      }
    });
  });

  describe('GET /api/business/notifications', () => {
    test('should get business notifications', async () => {
      const response = await request(app)
        .get('/api/business/notifications')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('unreadCount');

      // Check notification structure
      if (response.body.data.notifications.length > 0) {
        const notification = response.body.data.notifications[0];
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('title');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('read');
        expect(notification).toHaveProperty('createdAt');
      }
    });

    test('should filter notifications by read status', async () => {
      const response = await request(app)
        .get('/api/business/notifications?isRead=false')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned notifications should be unread
      response.body.data.notifications.forEach(notification => {
        expect(notification.read).toBe(false);
      });
    });

    test('should filter notifications by type', async () => {
      const response = await request(app)
        .get('/api/business/notifications?type=offer_accepted')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned notifications should be of specified type
      response.body.data.notifications.forEach(notification => {
        expect(notification.type).toBe('offer_accepted');
      });
    });
  });

  describe('PATCH /api/business/notifications/:notificationId/read', () => {
    test('should mark notification as read', async () => {
      const response = await request(app)
        .patch(`/api/business/notifications/${testNotification._id}/read`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('marked as read');
      expect(response.body.data.notification.read).toBe(true);

      // Verify notification is actually marked as read in database
      const updatedNotification = await Notification.findById(testNotification._id);
      expect(updatedNotification.read).toBe(true);
      expect(updatedNotification.readAt).toBeDefined();
    });

    test('should return 404 for non-existent notification', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .patch(`/api/business/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/business/notifications/mark-all-read', () => {
    test('should mark all notifications as read', async () => {
      // Create additional unread notifications
      await Notification.create({
        user: businessUser._id,
        type: 'offer_completed',
        title: 'Offer Completed',
        message: 'Your delivery offer has been completed.',
        read: false
      });

      const response = await request(app)
        .patch('/api/business/notifications/mark-all-read')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('All notifications marked as read');
      expect(response.body.data.updatedCount).toBeGreaterThan(0);

      // Verify all notifications are marked as read in database
      const unreadCount = await Notification.countDocuments({
        user: businessUser._id,
        read: false
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('GET /api/business/stats', () => {
    test('should get business statistics summary', async () => {
      const response = await request(app)
        .get('/api/business/stats?period=30d')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('periodData');
      expect(response.body.data).toHaveProperty('statusBreakdown');
      expect(response.body.data).toHaveProperty('averages');

      // Check total statistics structure
      const total = response.body.data.total;
      expect(total).toHaveProperty('totalOffers');
      expect(total).toHaveProperty('completedOffers');
      expect(total).toHaveProperty('cancelledOffers');
      expect(total).toHaveProperty('totalAmount');
      expect(total).toHaveProperty('completionRate');

      // Check averages structure
      const averages = response.body.data.averages;
      expect(averages).toHaveProperty('deliveryTime');
      expect(averages).toHaveProperty('distance');
      expect(averages).toHaveProperty('amount');
    });

    test('should support different time periods for stats', async () => {
      const periods = ['7d', '30d', '90d'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/business/stats?period=${period}`)
          .set('Authorization', `Bearer ${businessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(period);
      }
    });
  });

  describe('GET /api/business/export', () => {
    test('should export offers data in JSON format', async () => {
      const response = await request(app)
        .get('/api/business/export?type=offers&format=json')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('type', 'offers');
      expect(response.body.data).toHaveProperty('exportedAt');
      expect(response.body.data).toHaveProperty('count');
      expect(response.body.data).toHaveProperty('records');
      expect(Array.isArray(response.body.data.records)).toBe(true);
    });

    test('should export payments data in JSON format', async () => {
      const response = await request(app)
        .get('/api/business/export?type=payments&format=json')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('type', 'payments');
      expect(response.body.data).toHaveProperty('records');
      expect(Array.isArray(response.body.data.records)).toBe(true);
    });

    test('should export data in CSV format', async () => {
      const response = await request(app)
        .get('/api/business/export?type=offers&format=csv')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(typeof response.text).toBe('string');
    });

    test('should filter export by date range', async () => {
      const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const response = await request(app)
        .get(`/api/business/export?type=offers&dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('offers');
    });

    test('should return 400 for invalid export type', async () => {
      await request(app)
        .get('/api/business/export?type=invalid')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(400);
    });
  });

  describe('GET /api/business/profile', () => {
    test('should get business profile', async () => {
      const response = await request(app)
        .get('/api/business/profile')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('profile');

      const profile = response.body.data.profile;
      expect(profile).toHaveProperty('businessName');
      expect(profile).toHaveProperty('businessAddress');
      expect(profile).toHaveProperty('businessPhone');
      expect(profile.businessName).toBe('Test Delivery Co');
    });
  });

  describe('PATCH /api/business/profile', () => {
    test('should update business profile', async () => {
      const updateData = {
        name: 'Updated Business Name',
        'profile.businessName': 'Updated Delivery Co',
        'profile.businessPhone': '555-9999'
      };

      const response = await request(app)
        .patch('/api/business/profile')
        .set('Authorization', `Bearer ${businessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated successfully');
      expect(response.body.data.profile.businessName).toBe('Updated Delivery Co');

      // Verify update in database
      const updatedUser = await User.findById(businessUser._id);
      expect(updatedUser.name).toBe('Updated Business Name');
      expect(updatedUser.profile.businessName).toBe('Updated Delivery Co');
      expect(updatedUser.profile.businessPhone).toBe('555-9999');
    });

    test('should reject invalid profile updates', async () => {
      const invalidData = {
        password: 'newpassword', // Not allowed
        role: 'admin', // Not allowed
        invalidField: 'value' // Not allowed
      };

      const response = await request(app)
        .patch('/api/business/profile')
        .set('Authorization', `Bearer ${businessToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain('No valid updates provided');
    });

    test('should return 404 for non-existent business', async () => {
      // Create token with non-existent user ID
      const fakeToken = jwt.sign(
        { 
          userId: '507f1f77bcf86cd799439011',
          _id: '507f1f77bcf86cd799439011',
          role: 'business',
          email: 'fake@test.com'
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .patch('/api/business/profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock a database error
      const originalFind = Offer.find;
      Offer.find = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/business/offers')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(500);

      expect(response.body.message).toContain('Failed to get business offers');

      // Restore original method
      Offer.find = originalFind;
    });

    test('should handle invalid ObjectId parameters', async () => {
      await request(app)
        .get('/api/business/offers/invalid-id')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(500);
    });

    test('should handle malformed JWT tokens', async () => {
      await request(app)
        .get('/api/business/overview')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});