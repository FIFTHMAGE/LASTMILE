const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const DeliveryTracking = require('../models/DeliveryTracking');
const Offer = require('../models/Offer');
const User = require('../models/User');
const LocationTracking = require('../models/LocationTracking');

// Mock authentication middleware
jest.mock('../middleware/auth', () => {
  return {
    auth: (req, res, next) => {
      req.user = {
        id: req.headers['x-auth-user-id'] || '5f8d0f55d7a243001c9a4d52',
        role: req.headers['x-auth-user-role'] || 'rider'
      };
      next();
    },
    requireRole: (role) => (req, res, next) => {
      if (req.user.role !== role) {
        return res.status(403).json({ message: `Access denied. ${role} role required.` });
      }
      next();
    }
  };
});

describe('Delivery Tracking Endpoints', () => {
  let riderId, businessId, offerId, offer, rider, business;

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
    // Clear collections
    await DeliveryTracking.deleteMany({});
    await Offer.deleteMany({});
    await User.deleteMany({});
    await LocationTracking.deleteMany({});

    // Create test data
    riderId = new mongoose.Types.ObjectId();
    businessId = new mongoose.Types.ObjectId();
    offerId = new mongoose.Types.ObjectId();

    rider = await User.create({
      _id: riderId,
      name: 'Test Rider',
      email: 'rider@test.com',
      password: 'password',
      role: 'rider',
      profile: {
        phone: '1234567890',
        vehicleType: 'bike'
      }
    });

    business = await User.create({
      _id: businessId,
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

    offer = await Offer.create({
      _id: offerId,
      business: businessId,
      title: 'Test Delivery',
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
      status: 'accepted',
      acceptedBy: riderId,
      acceptedAt: new Date(),
      estimatedDistance: 5000,
      estimatedDuration: 30
    });
  });

  describe('POST /api/delivery/start/:offerId', () => {
    test('should start delivery tracking for accepted offer', async () => {
      const response = await request(app)
        .post(`/api/delivery/start/${offerId}`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery tracking started');
      expect(response.body.tracking).toBeDefined();
      expect(response.body.tracking.currentStatus).toBe('accepted');
      expect(response.body.tracking.isActive).toBe(true);
    });

    test('should return 404 for non-existent offer', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/delivery/start/${nonExistentId}`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Offer not found');
    });

    test('should return 403 for non-assigned rider', async () => {
      const otherRiderId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/delivery/start/${offerId}`)
        .set('x-auth-user-id', otherRiderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not assigned to this offer');
    });

    test('should return 400 for non-accepted offer', async () => {
      offer.status = 'open';
      await offer.save();

      const response = await request(app)
        .post(`/api/delivery/start/${offerId}`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Offer must be in accepted status to start tracking');
    });
  });

  describe('GET /api/delivery/track/:offerId', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should get delivery tracking for business owner', async () => {
      const response = await request(app)
        .get(`/api/delivery/track/${offerId}`)
        .set('x-auth-user-id', businessId.toString())
        .set('x-auth-user-role', 'business');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tracking).toBeDefined();
      expect(response.body.tracking.currentStatus).toBe('accepted');
    });

    test('should get delivery tracking for assigned rider', async () => {
      const response = await request(app)
        .get(`/api/delivery/track/${offerId}`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tracking).toBeDefined();
    });

    test('should include location data when available', async () => {
      // Add location data
      await LocationTracking.updateRiderLocation(riderId, {
        coordinates: [-74.005, 40.712],
        accuracy: 10,
        heading: 90,
        speed: 5,
        offerId: offerId,
        trackingType: 'heading_to_pickup'
      });

      const response = await request(app)
        .get(`/api/delivery/track/${offerId}`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(200);
      expect(response.body.tracking.currentLocation).toBeDefined();
      expect(response.body.tracking.currentLocation.coordinates).toEqual([-74.005, 40.712]);
    });

    test('should return 403 for unauthorized user', async () => {
      const unauthorizedId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/delivery/track/${offerId}`)
        .set('x-auth-user-id', unauthorizedId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('POST /api/delivery/:offerId/event', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should add delivery event successfully', async () => {
      const eventData = {
        eventType: 'heading_to_pickup',
        notes: 'Started heading to pickup location',
        location: {
          coordinates: [-74.005, 40.712]
        }
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/event`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(eventData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event added successfully');
      expect(response.body.tracking.currentStatus).toBe('heading_to_pickup');
    });

    test('should update offer status for delivery events', async () => {
      const eventData = {
        eventType: 'package_delivered',
        notes: 'Package delivered successfully'
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/event`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(eventData);

      expect(response.status).toBe(200);
      
      // Check that offer status was updated
      const updatedOffer = await Offer.findById(offerId);
      expect(updatedOffer.status).toBe('delivered');
      expect(updatedOffer.deliveredAt).toBeDefined();
    });

    test('should validate event type', async () => {
      const eventData = {
        eventType: 'invalid_event',
        notes: 'Test notes'
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/event`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(eventData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should return 403 for non-assigned rider', async () => {
      const otherRiderId = new mongoose.Types.ObjectId();
      const eventData = {
        eventType: 'heading_to_pickup',
        notes: 'Test notes'
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/event`)
        .set('x-auth-user-id', otherRiderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(eventData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not assigned to this delivery');
    });
  });

  describe('POST /api/delivery/:offerId/pickup-attempt', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should record successful pickup attempt', async () => {
      const attemptData = {
        successful: true,
        notes: 'Package picked up successfully',
        contactAttempts: [{
          method: 'phone',
          successful: true,
          response: 'Customer answered'
        }]
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/pickup-attempt`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(attemptData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Pickup attempt recorded');
      expect(response.body.tracking.currentStatus).toBe('picked_up');
    });

    test('should record failed pickup attempt', async () => {
      const attemptData = {
        successful: false,
        notes: 'Customer not available'
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/pickup-attempt`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(attemptData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tracking.currentStatus).toBe('accepted'); // Status shouldn't change for failed attempt
    });

    test('should validate required fields', async () => {
      const attemptData = {
        successful: true
        // Missing notes
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/pickup-attempt`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(attemptData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/delivery/:offerId/delivery-attempt', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
      // Set up tracking to delivery stage
      await tracking.addEvent('package_picked_up');
      await tracking.addEvent('in_transit');
      await tracking.addEvent('arrived_at_delivery');
    });

    test('should record successful delivery attempt', async () => {
      const attemptData = {
        successful: true,
        notes: 'Package delivered successfully',
        deliveryMethod: 'hand_to_customer',
        signatureRequired: true,
        signatureObtained: true,
        photoTaken: true
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/delivery-attempt`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(attemptData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Delivery attempt recorded');
      expect(response.body.tracking.currentStatus).toBe('delivered');
    });

    test('should record failed delivery attempt', async () => {
      const attemptData = {
        successful: false,
        notes: 'Customer not home',
        contactAttempts: [{
          method: 'phone',
          successful: false,
          response: 'No answer'
        }]
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/delivery-attempt`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(attemptData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.tracking.currentStatus).toBe('arrived_at_delivery'); // Status shouldn't change
    });
  });

  describe('POST /api/delivery/:offerId/issue', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should report issue successfully', async () => {
      const issueData = {
        type: 'traffic_delay',
        description: 'Heavy traffic causing delay',
        impactOnDelivery: 'minor_delay'
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/issue`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(issueData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Issue reported successfully');
    });

    test('should validate issue type', async () => {
      const issueData = {
        type: 'invalid_issue',
        description: 'Test description'
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/issue`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(issueData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/delivery/:offerId/eta', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should update ETA successfully', async () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const etaData = {
        estimatedArrivalTime: futureTime.toISOString()
      };

      const response = await request(app)
        .put(`/api/delivery/${offerId}/eta`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(etaData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('ETA updated successfully');
      expect(response.body.estimatedArrivalTime).toBeDefined();
      expect(response.body.estimatedTimeRemaining).toBeGreaterThan(0);
    });

    test('should validate ISO8601 date format', async () => {
      const etaData = {
        estimatedArrivalTime: 'invalid-date'
      };

      const response = await request(app)
        .put(`/api/delivery/${offerId}/eta`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(etaData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/delivery/rider/active', () => {
    test('should get active deliveries for rider', async () => {
      // Create multiple deliveries
      const offer2 = await Offer.create({
        business: businessId,
        title: 'Second Delivery',
        pickup: {
          address: '789 Second St',
          coordinates: [-74.007, 40.713],
          contactName: 'Second Contact',
          contactPhone: '3333333333'
        },
        delivery: {
          address: '101 Second Ave',
          coordinates: [-74.008, 40.714],
          contactName: 'Second Delivery',
          contactPhone: '4444444444'
        },
        payment: { amount: 30.00, currency: 'USD', paymentMethod: 'cash' },
        status: 'accepted',
        acceptedBy: riderId,
        acceptedAt: new Date()
      });

      await DeliveryTracking.createForOffer(offer);
      await DeliveryTracking.createForOffer(offer2);

      const response = await request(app)
        .get('/api/delivery/rider/active')
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.activeDeliveries).toHaveLength(2);
      expect(response.body.count).toBe(2);
    });

    test('should return empty array when no active deliveries', async () => {
      const response = await request(app)
        .get('/api/delivery/rider/active')
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.activeDeliveries).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/delivery/business/active', () => {
    test('should get active deliveries for business', async () => {
      await DeliveryTracking.createForOffer(offer);

      const response = await request(app)
        .get('/api/delivery/business/active')
        .set('x-auth-user-id', businessId.toString())
        .set('x-auth-user-role', 'business');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.activeDeliveries).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });
  });

  describe('POST /api/delivery/:offerId/calculate-eta', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should calculate ETA successfully', async () => {
      const etaData = {
        currentLocation: {
          coordinates: [-74.005, 40.712]
        },
        vehicleType: 'bike',
        trafficFactor: 1.2
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/calculate-eta`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(etaData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.eta).toBeDefined();
      expect(response.body.eta.estimatedArrivalTime).toBeDefined();
      expect(response.body.eta.estimatedMinutes).toBeGreaterThan(0);
      expect(response.body.eta.distance).toBeGreaterThan(0);
    });

    test('should validate coordinates format', async () => {
      const etaData = {
        currentLocation: {
          coordinates: [-74.005] // Missing latitude
        }
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/calculate-eta`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(etaData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should handle different delivery statuses', async () => {
      // Test for pickup phase
      const etaData = {
        currentLocation: {
          coordinates: [-74.005, 40.712]
        }
      };

      let response = await request(app)
        .post(`/api/delivery/${offerId}/calculate-eta`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(etaData);

      expect(response.status).toBe(200);
      expect(response.body.eta.destination).toEqual(offer.pickup.coordinates);

      // Update to delivery phase
      await tracking.addEvent('package_picked_up');

      response = await request(app)
        .post(`/api/delivery/${offerId}/calculate-eta`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(etaData);

      expect(response.status).toBe(200);
      expect(response.body.eta.destination).toEqual(offer.delivery.coordinates);
    });
  });

  describe('GET /api/delivery/:offerId/route-optimization', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should get route optimization suggestions', async () => {
      const response = await request(app)
        .get(`/api/delivery/${offerId}/route-optimization`)
        .query({ currentLocation: '-74.005,40.712' })
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.routeOptimization).toBeDefined();
      expect(response.body.routeOptimization.suggestion).toBeDefined();
      expect(response.body.routeOptimization.alternativeRoutes).toHaveLength(2);
    });

    test('should validate location format', async () => {
      const response = await request(app)
        .get(`/api/delivery/${offerId}/route-optimization`)
        .query({ currentLocation: 'invalid-format' })
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid location format. Use: lng,lat');
    });

    test('should require current location', async () => {
      const response = await request(app)
        .get(`/api/delivery/${offerId}/route-optimization`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current location is required');
    });
  });

  describe('POST /api/delivery/:offerId/location-update', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
    });

    test('should update location and recalculate ETA', async () => {
      const locationData = {
        coordinates: [-74.005, 40.712],
        accuracy: 10,
        heading: 90,
        speed: 5,
        batteryLevel: 85
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/location-update`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(locationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Location updated successfully');
      expect(response.body.location.coordinates).toEqual([-74.005, 40.712]);
    });

    test('should validate coordinates', async () => {
      const locationData = {
        coordinates: [-74.005] // Missing latitude
      };

      const response = await request(app)
        .post(`/api/delivery/${offerId}/location-update`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider')
        .send(locationData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/delivery/:offerId/history', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(offer);
      await tracking.addEvent('heading_to_pickup', { notes: 'Started journey' });
      await tracking.addEvent('arrived_at_pickup', { notes: 'Arrived at pickup' });
    });

    test('should get delivery history for business owner', async () => {
      const response = await request(app)
        .get(`/api/delivery/${offerId}/history`)
        .set('x-auth-user-id', businessId.toString())
        .set('x-auth-user-role', 'business');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.history).toBeDefined();
      expect(response.body.history.events).toHaveLength(3); // Initial + 2 added events
      expect(response.body.history.currentStatus).toBe('arrived_at_pickup');
    });

    test('should get delivery history for assigned rider', async () => {
      const response = await request(app)
        .get(`/api/delivery/${offerId}/history`)
        .set('x-auth-user-id', riderId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.history).toBeDefined();
    });

    test('should return 403 for unauthorized user', async () => {
      const unauthorizedId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/delivery/${offerId}/history`)
        .set('x-auth-user-id', unauthorizedId.toString())
        .set('x-auth-user-role', 'rider');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('Admin Endpoints', () => {
    describe('GET /api/delivery/status/:status', () => {
      test('should get deliveries by status for admin', async () => {
        await DeliveryTracking.createForOffer(offer);

        const response = await request(app)
          .get('/api/delivery/status/accepted')
          .set('x-auth-user-id', new mongoose.Types.ObjectId().toString())
          .set('x-auth-user-role', 'admin');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.deliveries).toHaveLength(1);
        expect(response.body.pagination).toBeDefined();
      });

      test('should return 403 for non-admin users', async () => {
        const response = await request(app)
          .get('/api/delivery/status/accepted')
          .set('x-auth-user-id', riderId.toString())
          .set('x-auth-user-role', 'rider');

        expect(response.status).toBe(403);
      });
    });

    describe('GET /api/delivery/stats', () => {
      test('should get delivery statistics for admin', async () => {
        await DeliveryTracking.createForOffer(offer);

        const response = await request(app)
          .get('/api/delivery/stats')
          .set('x-auth-user-id', new mongoose.Types.ObjectId().toString())
          .set('x-auth-user-role', 'admin');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.stats).toBeDefined();
        expect(response.body.stats.activeDeliveries).toBeDefined();
        expect(response.body.stats.statusBreakdown).toBeDefined();
      });
    });

    describe('GET /api/delivery/analytics/performance', () => {
      test('should get performance analytics for admin', async () => {
        // Create completed delivery
        const completedTracking = await DeliveryTracking.createForOffer(offer);
        completedTracking.currentStatus = 'completed';
        completedTracking.isActive = false;
        completedTracking.completedAt = new Date();
        await completedTracking.save();

        const response = await request(app)
          .get('/api/delivery/analytics/performance')
          .query({ period: 'week' })
          .set('x-auth-user-id', new mongoose.Types.ObjectId().toString())
          .set('x-auth-user-role', 'admin');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.analytics).toBeDefined();
        expect(response.body.analytics.summary).toBeDefined();
        expect(response.body.analytics.dailyTrend).toBeDefined();
      });
    });
  });
});