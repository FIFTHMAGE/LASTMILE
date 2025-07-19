const mongoose = require('mongoose');
const DeliveryTracking = require('../models/DeliveryTracking');
const Offer = require('../models/Offer');
const User = require('../models/User');

// Mock data
const mockRiderId = new mongoose.Types.ObjectId();
const mockBusinessId = new mongoose.Types.ObjectId();
const mockOfferId = new mongoose.Types.ObjectId();

// Mock offer data
const mockOffer = {
  _id: mockOfferId,
  business: mockBusinessId,
  title: 'Test Delivery',
  pickup: {
    address: '123 Pickup St',
    coordinates: [-74.006, 40.7128],
    contactName: 'Pickup Contact',
    contactPhone: '1111111111',
    availableFrom: new Date('2023-01-15T10:00:00Z')
  },
  delivery: {
    address: '456 Delivery Ave',
    coordinates: [-74.0059, 40.7127],
    contactName: 'Delivery Contact',
    contactPhone: '2222222222',
    deliverBy: new Date('2023-01-15T12:00:00Z')
  },
  payment: {
    amount: 25.50,
    currency: 'USD',
    paymentMethod: 'card'
  },
  status: 'accepted',
  acceptedBy: mockRiderId,
  acceptedAt: new Date('2023-01-15T09:30:00Z'),
  estimatedDistance: 5000,
  estimatedDuration: 30
};

describe('DeliveryTracking Model', () => {
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
    await DeliveryTracking.deleteMany({});
    await Offer.deleteMany({});
    await User.deleteMany({});
  });

  describe('DeliveryTracking Creation', () => {
    test('should create delivery tracking for accepted offer', async () => {
      const tracking = await DeliveryTracking.createForOffer(mockOffer);

      expect(tracking).toBeDefined();
      expect(tracking.offer.toString()).toBe(mockOfferId.toString());
      expect(tracking.rider.toString()).toBe(mockRiderId.toString());
      expect(tracking.business.toString()).toBe(mockBusinessId.toString());
      expect(tracking.currentStatus).toBe('accepted');
      expect(tracking.isActive).toBe(true);
      expect(tracking.events).toHaveLength(1);
      expect(tracking.events[0].eventType).toBe('delivery_accepted');
    });

    test('should prevent duplicate tracking for same offer', async () => {
      // Create first tracking
      await DeliveryTracking.createForOffer(mockOffer);

      // Try to create another one
      const duplicateTracking = await DeliveryTracking.createForOffer(mockOffer);

      // Should return existing tracking
      expect(duplicateTracking).toBeDefined();
      const count = await DeliveryTracking.countDocuments({ offer: mockOfferId });
      expect(count).toBe(1);
    });

    test('should reject offer without assigned rider', async () => {
      const offerWithoutRider = {
        ...mockOffer,
        acceptedBy: null
      };

      await expect(DeliveryTracking.createForOffer(offerWithoutRider))
        .rejects.toThrow('Offer must be accepted by a rider');
    });

    test('should set initial timing estimates', async () => {
      const tracking = await DeliveryTracking.createForOffer(mockOffer);

      expect(tracking.acceptedAt).toEqual(mockOffer.acceptedAt);
      expect(tracking.estimatedDistance).toBe(5000);
      expect(tracking.estimatedPickupTime).toEqual(mockOffer.pickup.availableFrom);
      expect(tracking.estimatedDeliveryTime).toEqual(mockOffer.delivery.deliverBy);
    });
  });

  describe('Event Management', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(mockOffer);
    });

    test('should add events correctly', async () => {
      await tracking.addEvent('heading_to_pickup', {
        notes: 'Started heading to pickup location',
        location: { coordinates: [-74.005, 40.712] }
      });

      expect(tracking.events).toHaveLength(2); // Initial + new event
      const newEvent = tracking.events[1];
      expect(newEvent.eventType).toBe('heading_to_pickup');
      expect(newEvent.notes).toBe('Started heading to pickup location');
      expect(newEvent.location.coordinates).toEqual([-74.005, 40.712]);
      expect(tracking.currentStatus).toBe('heading_to_pickup');
    });

    test('should update status based on event type', async () => {
      await tracking.addEvent('arrived_at_pickup');
      expect(tracking.currentStatus).toBe('arrived_at_pickup');

      await tracking.addEvent('package_picked_up');
      expect(tracking.currentStatus).toBe('picked_up');
      expect(tracking.actualPickupTime).toBeDefined();

      await tracking.addEvent('in_transit');
      expect(tracking.currentStatus).toBe('in_transit');

      await tracking.addEvent('package_delivered');
      expect(tracking.currentStatus).toBe('delivered');
      expect(tracking.actualDeliveryTime).toBeDefined();

      await tracking.addEvent('delivery_completed');
      expect(tracking.currentStatus).toBe('completed');
      expect(tracking.completedAt).toBeDefined();
      expect(tracking.isActive).toBe(false);
    });

    test('should handle cancellation events', async () => {
      await tracking.addEvent('delivery_cancelled', {
        notes: 'Customer cancelled order'
      });

      expect(tracking.currentStatus).toBe('cancelled');
      expect(tracking.completedAt).toBeDefined();
      expect(tracking.isActive).toBe(false);
    });

    test('should include metadata in events', async () => {
      await tracking.addEvent('package_delivered', {
        metadata: {
          deliveryMethod: 'hand_to_customer',
          signatureObtained: true,
          photoTaken: true
        }
      });

      const deliveredEvent = tracking.events.find(e => e.eventType === 'package_delivered');
      expect(deliveredEvent.metadata.deliveryMethod).toBe('hand_to_customer');
      expect(deliveredEvent.metadata.signatureObtained).toBe(true);
      expect(deliveredEvent.metadata.photoTaken).toBe(true);
    });
  });

  describe('Pickup Attempts', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(mockOffer);
    });

    test('should record successful pickup attempt', async () => {
      await tracking.addPickupAttempt({
        successful: true,
        notes: 'Package picked up successfully',
        contactAttempts: [{
          method: 'phone',
          successful: true,
          response: 'Customer answered'
        }]
      });

      expect(tracking.pickupAttempts).toHaveLength(1);
      expect(tracking.pickupAttempts[0].successful).toBe(true);
      expect(tracking.pickupAttempts[0].contactAttempts).toHaveLength(1);
      expect(tracking.currentStatus).toBe('picked_up');
      expect(tracking.actualPickupTime).toBeDefined();
    });

    test('should record failed pickup attempt', async () => {
      await tracking.addPickupAttempt({
        successful: false,
        notes: 'Customer not available',
        contactAttempts: [{
          method: 'phone',
          successful: false,
          response: 'No answer'
        }]
      });

      expect(tracking.pickupAttempts).toHaveLength(1);
      expect(tracking.pickupAttempts[0].successful).toBe(false);
      expect(tracking.currentStatus).toBe('accepted'); // Status shouldn't change for failed attempt
      expect(tracking.actualPickupTime).toBeUndefined();
    });

    test('should track multiple pickup attempts', async () => {
      // First failed attempt
      await tracking.addPickupAttempt({
        successful: false,
        notes: 'First attempt failed'
      });

      // Second successful attempt
      await tracking.addPickupAttempt({
        successful: true,
        notes: 'Second attempt successful'
      });

      expect(tracking.pickupAttempts).toHaveLength(2);
      expect(tracking.pickupAttempts[0].successful).toBe(false);
      expect(tracking.pickupAttempts[1].successful).toBe(true);
      expect(tracking.currentStatus).toBe('picked_up');
    });
  });

  describe('Delivery Attempts', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(mockOffer);
      // Set up tracking to delivery stage
      await tracking.addEvent('package_picked_up');
      await tracking.addEvent('in_transit');
      await tracking.addEvent('arrived_at_delivery');
    });

    test('should record successful delivery attempt', async () => {
      await tracking.addDeliveryAttempt({
        successful: true,
        notes: 'Package delivered successfully',
        deliveryMethod: 'hand_to_customer',
        signatureRequired: true,
        signatureObtained: true,
        photoTaken: true
      });

      expect(tracking.deliveryAttempts).toHaveLength(1);
      const attempt = tracking.deliveryAttempts[0];
      expect(attempt.successful).toBe(true);
      expect(attempt.deliveryMethod).toBe('hand_to_customer');
      expect(attempt.signatureObtained).toBe(true);
      expect(attempt.photoTaken).toBe(true);
      expect(tracking.currentStatus).toBe('delivered');
      expect(tracking.actualDeliveryTime).toBeDefined();
    });

    test('should record failed delivery attempt', async () => {
      await tracking.addDeliveryAttempt({
        successful: false,
        notes: 'Customer not home',
        contactAttempts: [{
          method: 'doorbell',
          successful: false
        }, {
          method: 'phone',
          successful: false,
          response: 'No answer'
        }]
      });

      expect(tracking.deliveryAttempts).toHaveLength(1);
      expect(tracking.deliveryAttempts[0].successful).toBe(false);
      expect(tracking.deliveryAttempts[0].contactAttempts).toHaveLength(2);
      expect(tracking.currentStatus).toBe('arrived_at_delivery'); // Status shouldn't change
      expect(tracking.actualDeliveryTime).toBeUndefined();
    });

    test('should handle different delivery methods', async () => {
      await tracking.addDeliveryAttempt({
        successful: true,
        deliveryMethod: 'left_at_door',
        photoTaken: true,
        notes: 'Left at front door as requested'
      });

      const attempt = tracking.deliveryAttempts[0];
      expect(attempt.deliveryMethod).toBe('left_at_door');
      expect(attempt.photoTaken).toBe(true);
      expect(attempt.signatureRequired).toBe(false);
    });
  });

  describe('Issue Reporting', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(mockOffer);
    });

    test('should report issues correctly', async () => {
      await tracking.reportIssue({
        type: 'traffic_delay',
        description: 'Heavy traffic causing delay',
        reportedBy: mockRiderId,
        impactOnDelivery: 'minor_delay'
      });

      expect(tracking.issues).toHaveLength(1);
      const issue = tracking.issues[0];
      expect(issue.type).toBe('traffic_delay');
      expect(issue.description).toBe('Heavy traffic causing delay');
      expect(issue.reportedBy.toString()).toBe(mockRiderId.toString());
      expect(issue.impactOnDelivery).toBe('minor_delay');
      expect(issue.resolved).toBe(false);

      // Should also add an event
      const issueEvent = tracking.events.find(e => e.eventType === 'issue_reported');
      expect(issueEvent).toBeDefined();
      expect(issueEvent.metadata.issueType).toBe('traffic_delay');
    });

    test('should track multiple issues', async () => {
      await tracking.reportIssue({
        type: 'traffic_delay',
        description: 'Traffic jam',
        impactOnDelivery: 'minor_delay'
      });

      await tracking.reportIssue({
        type: 'wrong_address',
        description: 'Address not found',
        impactOnDelivery: 'major_delay'
      });

      expect(tracking.issues).toHaveLength(2);
      expect(tracking.issues[0].type).toBe('traffic_delay');
      expect(tracking.issues[1].type).toBe('wrong_address');
    });

    test('should handle different issue types', async () => {
      const issueTypes = [
        'vehicle_breakdown',
        'package_damaged',
        'customer_unavailable',
        'access_denied',
        'safety_concern'
      ];

      for (const type of issueTypes) {
        await tracking.reportIssue({
          type,
          description: `Test ${type} issue`
        });
      }

      expect(tracking.issues).toHaveLength(issueTypes.length);
      expect(tracking.issues.map(i => i.type)).toEqual(expect.arrayContaining(issueTypes));
    });
  });

  describe('Virtual Properties', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(mockOffer);
    });

    test('should calculate progress percentage correctly', () => {
      expect(tracking.progressPercentage).toBe(10); // accepted = 10%

      tracking.currentStatus = 'heading_to_pickup';
      expect(tracking.progressPercentage).toBe(20);

      tracking.currentStatus = 'picked_up';
      expect(tracking.progressPercentage).toBe(50);

      tracking.currentStatus = 'in_transit';
      expect(tracking.progressPercentage).toBe(70);

      tracking.currentStatus = 'delivered';
      expect(tracking.progressPercentage).toBe(95);

      tracking.currentStatus = 'completed';
      expect(tracking.progressPercentage).toBe(100);

      tracking.currentStatus = 'cancelled';
      expect(tracking.progressPercentage).toBe(0);
    });

    test('should calculate estimated time remaining', () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      tracking.estimatedDeliveryTime = futureTime;

      const remaining = tracking.estimatedTimeRemaining;
      expect(remaining).toBeGreaterThan(25);
      expect(remaining).toBeLessThan(35);
    });

    test('should return 0 for past estimated delivery time', () => {
      const pastTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      tracking.estimatedDeliveryTime = pastTime;

      expect(tracking.estimatedTimeRemaining).toBe(0);
    });

    test('should calculate total delivery duration', () => {
      const completedTime = new Date(tracking.acceptedAt.getTime() + 45 * 60 * 1000); // 45 minutes later
      tracking.completedAt = completedTime;

      expect(tracking.totalDeliveryDuration).toBe(45);
    });
  });

  describe('Performance Metrics', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(mockOffer);
    });

    test('should calculate metrics for completed delivery', () => {
      // Set up completed delivery
      const acceptedTime = new Date('2023-01-15T10:00:00Z');
      const pickupTime = new Date('2023-01-15T10:15:00Z');
      const deliveryTime = new Date('2023-01-15T10:45:00Z');
      const completedTime = new Date('2023-01-15T10:50:00Z');

      tracking.acceptedAt = acceptedTime;
      tracking.actualPickupTime = pickupTime;
      tracking.actualDeliveryTime = deliveryTime;
      tracking.completedAt = completedTime;
      tracking.actualDistance = 6000; // 6km
      tracking.estimatedDeliveryTime = new Date('2023-01-15T10:40:00Z');

      const metrics = tracking.calculateMetrics();

      expect(metrics.totalDuration).toBe(50); // 50 minutes total
      expect(metrics.timeToPickup).toBe(15); // 15 minutes to pickup
      expect(metrics.transitDuration).toBe(30); // 30 minutes in transit
      expect(metrics.averageSpeed).toBeCloseTo(12, 1); // 6km in 0.5 hours = 12 km/h
      expect(metrics.onTimePerformance).toBe(false); // Delivered 5 minutes late
      expect(metrics.delayMinutes).toBe(5);
    });

    test('should handle on-time delivery', () => {
      const acceptedTime = new Date('2023-01-15T10:00:00Z');
      const deliveryTime = new Date('2023-01-15T10:35:00Z');
      const estimatedTime = new Date('2023-01-15T10:40:00Z');

      tracking.acceptedAt = acceptedTime;
      tracking.actualDeliveryTime = deliveryTime;
      tracking.estimatedDeliveryTime = estimatedTime;

      const metrics = tracking.calculateMetrics();

      expect(metrics.onTimePerformance).toBe(true);
      expect(metrics.delayMinutes).toBe(0);
    });

    test('should handle incomplete deliveries', () => {
      // Only set accepted time
      const metrics = tracking.calculateMetrics();

      expect(metrics.totalDuration).toBeUndefined();
      expect(metrics.timeToPickup).toBeUndefined();
      expect(metrics.transitDuration).toBeUndefined();
      expect(metrics.averageSpeed).toBeUndefined();
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      // Create test users
      await User.create([
        {
          _id: mockRiderId,
          name: 'Test Rider',
          email: 'rider@test.com',
          password: 'password',
          role: 'rider',
          profile: { phone: '123', vehicleType: 'bike' }
        },
        {
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
            businessPhone: '987654321'
          }
        }
      ]);
    });

    test('should get active deliveries for rider', async () => {
      // Create multiple tracking records
      const offer1 = { ...mockOffer, _id: new mongoose.Types.ObjectId() };
      const offer2 = { ...mockOffer, _id: new mongoose.Types.ObjectId() };
      const offer3 = { ...mockOffer, _id: new mongoose.Types.ObjectId(), acceptedBy: new mongoose.Types.ObjectId() };

      await DeliveryTracking.createForOffer(offer1);
      await DeliveryTracking.createForOffer(offer2);
      await DeliveryTracking.createForOffer(offer3); // Different rider

      const activeDeliveries = await DeliveryTracking.getActiveDeliveriesForRider(mockRiderId.toString());

      expect(activeDeliveries).toHaveLength(2);
      expect(activeDeliveries.every(d => d.rider.toString() === mockRiderId.toString())).toBe(true);
      expect(activeDeliveries.every(d => d.isActive === true)).toBe(true);
    });

    test('should get delivery by offer ID', async () => {
      await DeliveryTracking.createForOffer(mockOffer);

      const tracking = await DeliveryTracking.getByOfferId(mockOfferId.toString());

      expect(tracking).toBeDefined();
      expect(tracking.offer._id.toString()).toBe(mockOfferId.toString());
    });

    test('should get deliveries by status', async () => {
      // Create tracking records with different statuses
      const tracking1 = await DeliveryTracking.createForOffer(mockOffer);
      
      const offer2 = { ...mockOffer, _id: new mongoose.Types.ObjectId() };
      const tracking2 = await DeliveryTracking.createForOffer(offer2);
      await tracking2.addEvent('heading_to_pickup');

      const offer3 = { ...mockOffer, _id: new mongoose.Types.ObjectId() };
      const tracking3 = await DeliveryTracking.createForOffer(offer3);
      await tracking3.addEvent('package_picked_up');

      const acceptedDeliveries = await DeliveryTracking.getByStatus('accepted');
      const headingDeliveries = await DeliveryTracking.getByStatus('heading_to_pickup');
      const pickedUpDeliveries = await DeliveryTracking.getByStatus('picked_up');

      expect(acceptedDeliveries).toHaveLength(1);
      expect(headingDeliveries).toHaveLength(1);
      expect(pickedUpDeliveries).toHaveLength(1);
    });

    test('should calculate delivery statistics', async () => {
      // Create completed deliveries
      const completedTime = new Date();
      const acceptedTime = new Date(completedTime.getTime() - 60 * 60 * 1000); // 1 hour ago

      const tracking1 = new DeliveryTracking({
        offer: new mongoose.Types.ObjectId(),
        rider: mockRiderId,
        business: mockBusinessId,
        currentStatus: 'completed',
        acceptedAt: acceptedTime,
        completedAt: completedTime,
        actualDeliveryTime: new Date(completedTime.getTime() - 5 * 60 * 1000), // 5 min before completion
        estimatedDeliveryTime: completedTime, // On time
        isActive: false,
        issues: [{ type: 'traffic_delay', description: 'Test issue' }]
      });
      await tracking1.save();

      const tracking2 = new DeliveryTracking({
        offer: new mongoose.Types.ObjectId(),
        rider: mockRiderId,
        business: mockBusinessId,
        currentStatus: 'cancelled',
        acceptedAt: acceptedTime,
        completedAt: completedTime,
        isActive: false
      });
      await tracking2.save();

      const stats = await DeliveryTracking.getDeliveryStats();

      expect(stats.totalDeliveries).toBe(2);
      expect(stats.completedDeliveries).toBe(1);
      expect(stats.cancelledDeliveries).toBe(1);
      expect(stats.completionRate).toBe(50);
      expect(stats.onTimeRate).toBe(100); // 1 out of 1 completed delivery was on time
      expect(stats.totalIssues).toBe(1);
      expect(stats.averageDuration).toBeCloseTo(60, 0); // 60 minutes
    });

    test('should filter statistics by date range', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();

      // Create delivery from yesterday
      const oldTracking = new DeliveryTracking({
        offer: new mongoose.Types.ObjectId(),
        rider: mockRiderId,
        business: mockBusinessId,
        currentStatus: 'completed',
        acceptedAt: yesterday,
        completedAt: yesterday,
        isActive: false
      });
      await oldTracking.save();

      // Create delivery from today
      const newTracking = new DeliveryTracking({
        offer: new mongoose.Types.ObjectId(),
        rider: mockRiderId,
        business: mockBusinessId,
        currentStatus: 'completed',
        acceptedAt: today,
        completedAt: today,
        isActive: false
      });
      await newTracking.save();

      const todayStats = await DeliveryTracking.getDeliveryStats({
        startDate: today.toISOString().split('T')[0]
      });

      expect(todayStats.totalDeliveries).toBe(1);
    });
  });

  describe('Tracking Data API Response', () => {
    let tracking;

    beforeEach(async () => {
      tracking = await DeliveryTracking.createForOffer(mockOffer);
    });

    test('should return formatted tracking data', () => {
      const trackingData = tracking.getTrackingData();

      expect(trackingData).toHaveProperty('id');
      expect(trackingData).toHaveProperty('offer');
      expect(trackingData).toHaveProperty('rider');
      expect(trackingData).toHaveProperty('business');
      expect(trackingData).toHaveProperty('currentStatus');
      expect(trackingData).toHaveProperty('progressPercentage');
      expect(trackingData).toHaveProperty('estimatedTimeRemaining');
      expect(trackingData).toHaveProperty('events');
      expect(trackingData).toHaveProperty('issues');
      expect(trackingData).toHaveProperty('metrics');

      expect(trackingData.currentStatus).toBe('accepted');
      expect(trackingData.progressPercentage).toBe(10);
      expect(trackingData.isActive).toBe(true);
      expect(trackingData.events).toHaveLength(1);
    });

    test('should limit events in tracking data', async () => {
      // Add many events
      for (let i = 0; i < 15; i++) {
        await tracking.addEvent('heading_to_pickup', { notes: `Event ${i}` });
      }

      const trackingData = tracking.getTrackingData();

      expect(trackingData.events).toHaveLength(10); // Should limit to last 10 events
    });

    test('should only show unresolved issues', async () => {
      await tracking.reportIssue({
        type: 'traffic_delay',
        description: 'Resolved issue'
      });

      await tracking.reportIssue({
        type: 'wrong_address',
        description: 'Unresolved issue'
      });

      // Mark first issue as resolved
      tracking.issues[0].resolved = true;
      tracking.issues[0].resolvedAt = new Date();
      await tracking.save();

      const trackingData = tracking.getTrackingData();

      expect(trackingData.issues).toHaveLength(1);
      expect(trackingData.issues[0].description).toBe('Unresolved issue');
    });
  });
});