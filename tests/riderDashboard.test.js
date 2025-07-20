/**
 * Rider Dashboard Tests
 * Comprehensive tests for rider dashboard endpoints
 */

const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const DeliveryTracking = require('../models/DeliveryTracking');
const jwt = require('jsonwebtoken');

describe('Rider Dashboard API', () => {
  let riderUser;
  let businessUser;
  let riderToken;
  let testOffer;
  let testPayment;
  let testNotification;

  beforeEach(async () => {
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

    // Generate JWT token for rider user
    riderToken = jwt.sign(
      { 
        userId: riderUser._id,
        _id: riderUser._id,
        role: riderUser.role,
        email: riderUser.email
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
      user: riderUser._id,
      offer: testOffer._id,
      type: 'offer_available',
      title: 'New Offer Available',
      message: 'A new delivery offer is available near you.',
      data: { offerId: testOffer._id },
      channels: ['in_app'],
      read: false
    });
  });

  describe('GET /api/rider/overview', () => {
    test('should get rider dashboard overview', async () => {
      const response = await request(app)
        .get('/api/rider/overview')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overview');
      expect(response.body.data).toHaveProperty('recentDeliveries');
      expect(response.body.data).toHaveProperty('deliveriesByStatus');
      expect(response.body.data).toHaveProperty('monthlyTrends');
      expect(response.body.data).toHaveProperty('nearbyOffers');
      expect(response.body.data).toHaveProperty('recentPayments');

      // Check overview structure
      const overview = response.body.data.overview;
      expect(overview).toHaveProperty('totalDeliveries');
      expect(overview).toHaveProperty('activeDeliveries');
      expect(overview).toHaveProperty('completedDeliveries');
      expect(overview).toHaveProperty('completionRate');
      expect(overview).toHaveProperty('totalEarnings');
      expect(overview).toHaveProperty('thisMonthEarnings');
      expect(overview).toHaveProperty('avgRating');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/rider/overview')
        .expect(401);
    });

    test('should require rider role', async () => {
      const businessToken = jwt.sign(
        { 
          userId: businessUser._id,
          _id: businessUser._id,
          role: businessUser.role,
          email: businessUser.email
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      await request(app)
        .get('/api/rider/overview')
        .set('Authorization', `Bearer ${businessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/rider/nearby-offers', () => {
    test('should get nearby offers with coordinates', async () => {
      const response = await request(app)
        .get('/api/rider/nearby-offers')
        .query({
          lat: 40.7128,
          lng: -74.006,
          maxDistance: 10000
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('offers');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('riderLocation');
      expect(Array.isArray(response.body.data.offers)).toBe(true);
    });

    test('should use rider profile location if no coordinates provided', async () => {
      const response = await request(app)
        .get('/api/rider/nearby-offers')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.riderLocation.coordinates).toEqual([-74.006, 40.7128]);
    });

    test('should filter offers by payment amount', async () => {
      await request(app)
        .get('/api/rider/nearby-offers')
        .query({
          lat: 40.7128,
          lng: -74.006,
          minPayment: 20,
          maxPayment: 30
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });

    test('should sort offers by distance, payment, or created date', async () => {
      await request(app)
        .get('/api/rider/nearby-offers')
        .query({
          lat: 40.7128,
          lng: -74.006,
          sortBy: 'payment',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });

    test('should require location when rider has no profile location', async () => {
      // Update rider to have no location
      await User.findByIdAndUpdate(riderUser._id, {
        $unset: { 'profile.currentLocation': 1 }
      });

      await request(app)
        .get('/api/rider/nearby-offers')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });
  });

  describe('GET /api/rider/deliveries', () => {
    beforeEach(async () => {
      // Create accepted offer for rider
      await Offer.create({
        business: businessUser._id,
        title: 'Accepted Delivery',
        acceptedBy: riderUser._id,
        status: 'accepted',
        acceptedAt: new Date(),
        pickup: {
          address: '123 Test St',
          coordinates: [-74.006, 40.7128]
        },
        delivery: {
          address: '456 Test Ave',
          coordinates: [-73.9857, 40.6892]
        },
        payment: { amount: 20 }
      });
    });

    test('should get rider delivery history', async () => {
      const response = await request(app)
        .get('/api/rider/deliveries')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deliveries');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('statusSummary');
      expect(Array.isArray(response.body.data.deliveries)).toBe(true);
    });

    test('should filter deliveries by status', async () => {
      await request(app)
        .get('/api/rider/deliveries')
        .query({ status: 'accepted' })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });

    test('should filter deliveries by date range', async () => {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 7);
      
      await request(app)
        .get('/api/rider/deliveries')
        .query({ 
          dateFrom: dateFrom.toISOString(),
          dateTo: new Date().toISOString()
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });

    test('should support pagination', async () => {
      await request(app)
        .get('/api/rider/deliveries')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });
  });

  describe('GET /api/rider/earnings', () => {
    test('should get rider earnings for all time', async () => {
      const response = await request(app)
        .get('/api/rider/earnings')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('dailyEarnings');
      expect(response.body.data).toHaveProperty('payments');
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('should get earnings for specific periods', async () => {
      const periods = ['today', 'week', 'month', 'year'];
      
      for (const period of periods) {
        await request(app)
          .get('/api/rider/earnings')
          .query({ period })
          .set('Authorization', `Bearer ${riderToken}`)
          .expect(200);
      }
    });

    test('should get earnings for custom date range', async () => {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 30);
      
      await request(app)
        .get('/api/rider/earnings')
        .query({ 
          period: 'custom',
          dateFrom: dateFrom.toISOString(),
          dateTo: new Date().toISOString()
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });
  });

  describe('PATCH /api/rider/availability', () => {
    test('should update rider availability to available', async () => {
      const response = await request(app)
        .patch('/api/rider/availability')
        .send({ isAvailable: true })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isAvailable).toBe(true);
    });

    test('should update rider availability to unavailable', async () => {
      const response = await request(app)
        .patch('/api/rider/availability')
        .send({ isAvailable: false })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isAvailable).toBe(false);
    });

    test('should require isAvailable field', async () => {
      await request(app)
        .patch('/api/rider/availability')
        .send({})
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });
  });

  describe('PATCH /api/rider/location', () => {
    test('should update rider location', async () => {
      const response = await request(app)
        .patch('/api/rider/location')
        .send({ 
          lat: 40.7589,
          lng: -73.9851,
          accuracy: 10
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location.coordinates).toEqual([-73.9851, 40.7589]);
    });

    test('should require lat and lng', async () => {
      await request(app)
        .patch('/api/rider/location')
        .send({ lat: 40.7589 })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });

    test('should validate coordinate ranges', async () => {
      await request(app)
        .patch('/api/rider/location')
        .send({ 
          lat: 200, // Invalid latitude
          lng: -73.9851
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });
  });

  describe('POST /api/rider/offers/:offerId/accept', () => {
    test('should accept an open offer', async () => {
      const response = await request(app)
        .post(`/api/rider/offers/${testOffer._id}/accept`)
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offer.status).toBe('accepted');
      expect(response.body.data.offer.acceptedAt).toBeDefined();

      // Verify offer was updated in database
      const updatedOffer = await Offer.findById(testOffer._id);
      expect(updatedOffer.status).toBe('accepted');
      expect(updatedOffer.acceptedBy.toString()).toBe(riderUser._id.toString());
    });

    test('should not accept offer if rider is unavailable', async () => {
      // Set rider as unavailable
      await User.findByIdAndUpdate(riderUser._id, {
        'profile.isAvailable': false
      });

      await request(app)
        .post(`/api/rider/offers/${testOffer._id}/accept`)
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });

    test('should not accept offer if rider has active delivery', async () => {
      // Create active delivery for rider
      await Offer.create({
        business: businessUser._id,
        title: 'Active Delivery',
        acceptedBy: riderUser._id,
        status: 'accepted',
        pickup: { address: 'Test', coordinates: [0, 0] },
        delivery: { address: 'Test', coordinates: [0, 0] },
        payment: { amount: 20 }
      });

      await request(app)
        .post(`/api/rider/offers/${testOffer._id}/accept`)
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });

    test('should not accept non-existent offer', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .post(`/api/rider/offers/${fakeId}/accept`)
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/rider/deliveries/:offerId/status', () => {
    let acceptedOffer;

    beforeEach(async () => {
      acceptedOffer = await Offer.create({
        business: businessUser._id,
        title: 'Test Delivery Status',
        acceptedBy: riderUser._id,
        status: 'accepted',
        acceptedAt: new Date(),
        pickup: {
          address: '123 Test St',
          coordinates: [-74.006, 40.7128]
        },
        delivery: {
          address: '456 Test Ave',
          coordinates: [-73.9857, 40.6892]
        },
        payment: { amount: 25 }
      });
    });

    test('should update delivery status to picked_up', async () => {
      const response = await request(app)
        .patch(`/api/rider/deliveries/${acceptedOffer._id}/status`)
        .send({ status: 'picked_up' })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.status).toBe('picked_up');
      expect(response.body.data.delivery.pickedUpAt).toBeDefined();
    });

    test('should update delivery status to in_transit', async () => {
      // First update to picked_up
      await Offer.findByIdAndUpdate(acceptedOffer._id, {
        status: 'picked_up',
        pickedUpAt: new Date()
      });

      const response = await request(app)
        .patch(`/api/rider/deliveries/${acceptedOffer._id}/status`)
        .send({ status: 'in_transit' })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.status).toBe('in_transit');
    });

    test('should update delivery status to delivered', async () => {
      // Update to in_transit first
      await Offer.findByIdAndUpdate(acceptedOffer._id, {
        status: 'in_transit',
        pickedUpAt: new Date(),
        inTransitAt: new Date()
      });

      const response = await request(app)
        .patch(`/api/rider/deliveries/${acceptedOffer._id}/status`)
        .send({ status: 'delivered' })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.delivery.status).toBe('delivered');
      expect(response.body.data.delivery.deliveredAt).toBeDefined();

      // Verify rider is available again
      const updatedRider = await User.findById(riderUser._id);
      expect(updatedRider.profile.isAvailable).toBe(true);
    });

    test('should not allow invalid status transitions', async () => {
      await request(app)
        .patch(`/api/rider/deliveries/${acceptedOffer._id}/status`)
        .send({ status: 'delivered' }) // Skip picked_up and in_transit
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });

    test('should require status field', async () => {
      await request(app)
        .patch(`/api/rider/deliveries/${acceptedOffer._id}/status`)
        .send({})
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });

    test('should not update non-existent delivery', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .patch(`/api/rider/deliveries/${fakeId}/status`)
        .send({ status: 'picked_up' })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(404);
    });
  });

  describe('GET /api/rider/notifications', () => {
    test('should get rider notifications', async () => {
      const response = await request(app)
        .get('/api/rider/notifications')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('notifications');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data).toHaveProperty('unreadCount');
      expect(Array.isArray(response.body.data.notifications)).toBe(true);
    });

    test('should filter notifications by read status', async () => {
      await request(app)
        .get('/api/rider/notifications')
        .query({ isRead: 'false' })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });

    test('should filter notifications by type', async () => {
      await request(app)
        .get('/api/rider/notifications')
        .query({ type: 'offer_available' })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);
    });
  });

  describe('PATCH /api/rider/notifications/:notificationId/read', () => {
    test('should mark notification as read', async () => {
      const response = await request(app)
        .patch(`/api/rider/notifications/${testNotification._id}/read`)
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.read).toBe(true);
      expect(response.body.data.notification.readAt).toBeDefined();

      // Verify in database
      const updatedNotification = await Notification.findById(testNotification._id);
      expect(updatedNotification.read).toBe(true);
    });

    test('should not mark non-existent notification as read', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      await request(app)
        .patch(`/api/rider/notifications/${fakeId}/read`)
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/rider/notifications/mark-all-read', () => {
    test('should mark all notifications as read', async () => {
      // Create additional unread notification
      await Notification.create({
        user: riderUser._id,
        type: 'test',
        title: 'Test',
        message: 'Test message',
        read: false
      });

      const response = await request(app)
        .patch('/api/rider/notifications/mark-all-read')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updatedCount).toBeGreaterThan(0);

      // Verify all notifications are read
      const unreadCount = await Notification.countDocuments({
        user: riderUser._id,
        read: false
      });
      expect(unreadCount).toBe(0);
    });
  });

  describe('GET /api/rider/profile', () => {
    test('should get rider profile', async () => {
      const response = await request(app)
        .get('/api/rider/profile')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toHaveProperty('id');
      expect(response.body.data.profile).toHaveProperty('name');
      expect(response.body.data.profile).toHaveProperty('email');
      expect(response.body.data.profile).toHaveProperty('phone');
      expect(response.body.data.profile).toHaveProperty('vehicleType');
      expect(response.body.data.profile).toHaveProperty('isAvailable');
      expect(response.body.data.profile).toHaveProperty('completedDeliveries');
      expect(response.body.data.profile).toHaveProperty('totalEarnings');
    });
  });

  describe('PATCH /api/rider/profile', () => {
    test('should update rider profile', async () => {
      const response = await request(app)
        .patch('/api/rider/profile')
        .send({
          name: 'Updated Rider Name',
          'profile.phone': '555-9999',
          'profile.vehicleType': 'car'
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.name).toBe('Updated Rider Name');

      // Verify in database
      const updatedRider = await User.findById(riderUser._id);
      expect(updatedRider.name).toBe('Updated Rider Name');
      expect(updatedRider.profile.phone).toBe('555-9999');
      expect(updatedRider.profile.vehicleType).toBe('car');
    });

    test('should not update restricted fields', async () => {
      await request(app)
        .patch('/api/rider/profile')
        .send({
          email: 'newemail@test.com', // Should be ignored
          role: 'admin' // Should be ignored
        })
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });

    test('should require valid updates', async () => {
      await request(app)
        .patch('/api/rider/profile')
        .send({})
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(400);
    });
  });

  describe('GET /api/rider/stats', () => {
    test('should get rider statistics for default period', async () => {
      const response = await request(app)
        .get('/api/rider/stats')
        .set('Authorization', `Bearer ${riderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('periodData');
      expect(response.body.data).toHaveProperty('statusBreakdown');
      expect(response.body.data).toHaveProperty('averages');
      expect(response.body.data).toHaveProperty('earnings');
    });

    test('should get statistics for different periods', async () => {
      const periods = ['7d', '30d', '90d'];
      
      for (const period of periods) {
        const response = await request(app)
          .get('/api/rider/stats')
          .query({ period })
          .set('Authorization', `Bearer ${riderToken}`)
          .expect(200);

        expect(response.body.data.period).toBe(period);
      }
    });
  });
});