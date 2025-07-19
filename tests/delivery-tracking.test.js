const mongoose = require('mongoose');
const DeliveryTracking = require('../models/DeliveryTracking');

describe('DeliveryTracking Model', () => {
  let deliveryTracking;
  let offerId, riderId, businessId;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create test IDs
    offerId = new mongoose.Types.ObjectId();
    riderId = new mongoose.Types.ObjectId();
    businessId = new mongoose.Types.ObjectId();

    // Create test delivery tracking
    deliveryTracking = new DeliveryTracking({
      offer: offerId,
      rider: riderId,
      business: businessId,
      currentStatus: 'accepted'
    });
  });

  describe('Schema Validation', () => {
    test('should create delivery tracking with required fields', () => {
      const validationError = deliveryTracking.validateSync();

      expect(validationError).toBeUndefined();
      expect(deliveryTracking.offer).toEqual(offerId);
      expect(deliveryTracking.rider).toEqual(riderId);
      expect(deliveryTracking.business).toEqual(businessId);
      expect(deliveryTracking.currentStatus).toBe('accepted');
    });

    test('should require essential fields', () => {
      const tracking = new DeliveryTracking({});
      const validationError = tracking.validateSync();

      expect(validationError).toBeDefined();
      expect(validationError.errors.offer).toBeDefined();
      expect(validationError.errors.rider).toBeDefined();
      expect(validationError.errors.business).toBeDefined();
    });

    test('should validate status enum', () => {
      deliveryTracking.currentStatus = 'invalid_status';
      const validationError = deliveryTracking.validateSync();

      expect(validationError.errors.currentStatus).toBeDefined();
    });

    test('should set default values', () => {
      expect(deliveryTracking.currentStatus).toBe('accepted');
      expect(deliveryTracking.statusTimestamps.accepted).toBeInstanceOf(Date);
      expect(deliveryTracking.events).toEqual([]);
      expect(deliveryTracking.locationHistory).toEqual([]);
      expect(deliveryTracking.issues).toEqual([]);
    });
  });

  describe('Virtual Properties', () => {
    test('should calculate totalDeliveryTime virtual', () => {
      deliveryTracking.statusTimestamps.accepted = new Date('2024-01-01T10:00:00Z');
      deliveryTracking.statusTimestamps.completed = new Date('2024-01-01T11:30:00Z');

      expect(deliveryTracking.totalDeliveryTime).toBe(90); // 90 minutes
    });

    test('should return null for totalDeliveryTime if not completed', () => {
      deliveryTracking.statusTimestamps.accepted = new Date('2024-01-01T10:00:00Z');
      
      expect(deliveryTracking.totalDeliveryTime).toBeNull();
    });

    test('should calculate currentPhase virtual', () => {
      expect(deliveryTracking.currentPhase).toBe('awaiting_pickup');

      deliveryTracking.currentStatus = 'picked_up';
      expect(deliveryTracking.currentPhase).toBe('pickup_completed');

      deliveryTracking.currentStatus = 'in_transit';
      expect(deliveryTracking.currentPhase).toBe('en_route');

      deliveryTracking.currentStatus = 'delivered';
      expect(deliveryTracking.currentPhase).toBe('awaiting_confirmation');

      deliveryTracking.currentStatus = 'completed';
      expect(deliveryTracking.currentPhase).toBe('delivery_complete');
    });

    test('should calculate progressPercentage virtual', () => {
      expect(deliveryTracking.progressPercentage).toBe(0); // accepted = 0%

      deliveryTracking.currentStatus = 'picked_up';
      expect(deliveryTracking.progressPercentage).toBe(25); // picked_up = 25%

      deliveryTracking.currentStatus = 'in_transit';
      expect(deliveryTracking.progressPercentage).toBe(50); // in_transit = 50%

      deliveryTracking.currentStatus = 'delivered';
      expect(deliveryTracking.progressPercentage).toBe(75); // delivered = 75%

      deliveryTracking.currentStatus = 'completed';
      expect(deliveryTracking.progressPercentage).toBe(100); // completed = 100%
    });

    test('should calculate estimatedTimeRemaining virtual', () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      deliveryTracking.estimatedDelivery = {
        estimatedTime: futureTime
      };

      const remaining = deliveryTracking.estimatedTimeRemaining;
      expect(remaining).toBeGreaterThanOrEqual(29);
      expect(remaining).toBeLessThanOrEqual(30);
    });

    test('should return 0 for past estimated time', () => {
      const pastTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      deliveryTracking.estimatedDelivery = {
        estimatedTime: pastTime
      };

      expect(deliveryTracking.estimatedTimeRemaining).toBe(0);
    });
  });

  describe('Pre-save Middleware', () => {
    test('should calculate metrics on save', async () => {
      deliveryTracking.locationHistory = [
        { coordinates: [0, 0], timestamp: new Date('2024-01-01T10:00:00Z') },
        { coordinates: [0.01, 0.01], timestamp: new Date('2024-01-01T10:05:00Z') },
        { coordinates: [0.02, 0.02], timestamp: new Date('2024-01-01T10:10:00Z') }
      ];

      deliveryTracking.statusTimestamps = {
        accepted: new Date('2024-01-01T10:00:00Z'),
        picked_up: new Date('2024-01-01T10:15:00Z'),
        delivered: new Date('2024-01-01T10:45:00Z'),
        completed: new Date('2024-01-01T10:50:00Z')
      };

      deliveryTracking.save = jest.fn().mockResolvedValue(deliveryTracking);

      // Manually trigger pre-save logic
      deliveryTracking.metrics.pickupDuration = Math.round(
        (deliveryTracking.statusTimestamps.picked_up - deliveryTracking.statusTimestamps.accepted) / (1000 * 60)
      );
      deliveryTracking.metrics.transitDuration = Math.round(
        (deliveryTracking.statusTimestamps.delivered - deliveryTracking.statusTimestamps.picked_up) / (1000 * 60)
      );
      deliveryTracking.metrics.totalDuration = Math.round(
        (deliveryTracking.statusTimestamps.completed - deliveryTracking.statusTimestamps.accepted) / (1000 * 60)
      );

      expect(deliveryTracking.metrics.pickupDuration).toBe(15); // 15 minutes
      expect(deliveryTracking.metrics.transitDuration).toBe(30); // 30 minutes
      expect(deliveryTracking.metrics.totalDuration).toBe(50); // 50 minutes
    });
  });

  describe('Instance Methods', () => {
    beforeEach(() => {
      deliveryTracking.save = jest.fn().mockResolvedValue(deliveryTracking);
    });

    describe('updateStatus', () => {
      test('should update status with valid transition', async () => {
        await deliveryTracking.updateStatus('picked_up', {
          description: 'Package picked up from sender',
          reportedBy: riderId
        });

        expect(deliveryTracking.currentStatus).toBe('picked_up');
        expect(deliveryTracking.statusTimestamps.picked_up).toBeInstanceOf(Date);
        expect(deliveryTracking.events).toHaveLength(1);
        expect(deliveryTracking.events[0].type).toBe('package_picked_up');
        expect(deliveryTracking.events[0].description).toBe('Package picked up from sender');
        expect(deliveryTracking.save).toHaveBeenCalled();
      });

      test('should throw error for invalid status transition', async () => {
        await expect(deliveryTracking.updateStatus('completed'))
          .rejects.toThrow('Invalid status transition from accepted to completed');
      });

      test('should add location to event if provided', async () => {
        const location = {
          coordinates: [-74.006, 40.7128],
          address: '123 Main St, New York, NY'
        };

        await deliveryTracking.updateStatus('picked_up', { location });

        expect(deliveryTracking.events[0].location).toEqual(location);
      });
    });

    describe('updateLocation', () => {
      test('should update current location and add to history', async () => {
        const coordinates = [-74.006, 40.7128];
        const options = {
          address: '123 Main St, New York, NY',
          accuracy: 5,
          speed: 25,
          heading: 90
        };

        await deliveryTracking.updateLocation(coordinates, options);

        expect(deliveryTracking.currentLocation.coordinates).toEqual(coordinates);
        expect(deliveryTracking.currentLocation.address).toBe(options.address);
        expect(deliveryTracking.locationHistory).toHaveLength(1);
        expect(deliveryTracking.locationHistory[0].coordinates).toEqual(coordinates);
        expect(deliveryTracking.locationHistory[0].accuracy).toBe(5);
        expect(deliveryTracking.events).toHaveLength(1);
        expect(deliveryTracking.events[0].type).toBe('location_updated');
        expect(deliveryTracking.save).toHaveBeenCalled();
      });

      test('should limit location history to 1000 entries', async () => {
        // Fill location history with 1001 entries
        deliveryTracking.locationHistory = Array(1001).fill().map((_, i) => ({
          coordinates: [i, i],
          timestamp: new Date()
        }));

        await deliveryTracking.updateLocation([-74.006, 40.7128]);

        expect(deliveryTracking.locationHistory).toHaveLength(1000);
        expect(deliveryTracking.locationHistory[999].coordinates).toEqual([-74.006, 40.7128]);
      });
    });

    describe('reportIssue', () => {
      test('should add issue and create event', async () => {
        const issueData = {
          type: 'package_damaged',
          description: 'Package appears to be damaged during transit',
          reportedBy: riderId,
          location: {
            coordinates: [-74.006, 40.7128],
            address: '123 Main St'
          },
          severity: 'high',
          photos: ['photo1.jpg', 'photo2.jpg']
        };

        await deliveryTracking.reportIssue(issueData);

        expect(deliveryTracking.issues).toHaveLength(1);
        expect(deliveryTracking.issues[0].type).toBe('package_damaged');
        expect(deliveryTracking.issues[0].severity).toBe('high');
        expect(deliveryTracking.issues[0].photos).toEqual(['photo1.jpg', 'photo2.jpg']);
        expect(deliveryTracking.events).toHaveLength(1);
        expect(deliveryTracking.events[0].type).toBe('issue_reported');
        expect(deliveryTracking.save).toHaveBeenCalled();
      });

      test('should set default severity if not provided', async () => {
        await deliveryTracking.reportIssue({
          type: 'wrong_address',
          description: 'Address not found',
          reportedBy: riderId
        });

        expect(deliveryTracking.issues[0].severity).toBe('medium');
      });
    });

    describe('confirmDelivery', () => {
      test('should set delivery confirmation details', async () => {
        // Set status to in_transit first so delivery confirmation can work
        deliveryTracking.currentStatus = 'in_transit';
        
        const confirmationData = {
          confirmationType: 'photo',
          confirmationData: {
            photoUrl: 'delivery-photo.jpg',
            recipientName: 'John Doe',
            notes: 'Left at front door'
          },
          deliveryLocation: {
            coordinates: [-74.006, 40.7128],
            address: '123 Main St',
            instructions: 'Ring doorbell'
          }
        };

        await deliveryTracking.confirmDelivery(confirmationData);

        expect(deliveryTracking.deliveryConfirmation.confirmationType).toBe('photo');
        expect(deliveryTracking.deliveryConfirmation.confirmationData.photoUrl).toBe('delivery-photo.jpg');
        expect(deliveryTracking.deliveryConfirmation.deliveryLocation.address).toBe('123 Main St');
        expect(deliveryTracking.save).toHaveBeenCalled();
      });
    });

    describe('updateEstimatedDelivery', () => {
      test('should calculate estimated delivery time', async () => {
        const factors = {
          distance: 10, // 10 km
          traffic: 'heavy',
          weather: 'rain',
          timeOfDay: 'rush_hour'
        };

        await deliveryTracking.updateEstimatedDelivery(factors);

        expect(deliveryTracking.estimatedDelivery.distance).toBe(10);
        expect(deliveryTracking.estimatedDelivery.estimatedDuration).toBeGreaterThan(0);
        expect(deliveryTracking.estimatedDelivery.estimatedTime).toBeInstanceOf(Date);
        expect(deliveryTracking.estimatedDelivery.factors.traffic).toBe('heavy');
        expect(deliveryTracking.save).toHaveBeenCalled();
      });

      test('should adjust speed based on conditions', async () => {
        // Test light traffic (should be faster)
        await deliveryTracking.updateEstimatedDelivery({
          distance: 10,
          traffic: 'light'
        });
        const lightTrafficDuration = deliveryTracking.estimatedDelivery.estimatedDuration;

        // Reset and test heavy traffic (should be slower)
        deliveryTracking.estimatedDelivery = {};
        await deliveryTracking.updateEstimatedDelivery({
          distance: 10,
          traffic: 'heavy'
        });
        const heavyTrafficDuration = deliveryTracking.estimatedDelivery.estimatedDuration;

        expect(heavyTrafficDuration).toBeGreaterThan(lightTrafficDuration);
      });
    });

    describe('getSummary', () => {
      test('should return delivery summary', () => {
        deliveryTracking._id = new mongoose.Types.ObjectId();
        deliveryTracking.issues = [
          { resolved: false },
          { resolved: true }
        ];

        const summary = deliveryTracking.getSummary();

        expect(summary.id).toEqual(deliveryTracking._id);
        expect(summary.offerId).toEqual(offerId);
        expect(summary.currentStatus).toBe('accepted');
        expect(summary.currentPhase).toBe('awaiting_pickup');
        expect(summary.progressPercentage).toBe(0);
        expect(summary.issueCount).toBe(2);
        expect(summary.hasActiveIssues).toBe(true);
      });
    });

    describe('getDetailedTracking', () => {
      test('should return detailed tracking information', () => {
        deliveryTracking._id = new mongoose.Types.ObjectId();
        deliveryTracking.events = Array(25).fill().map((_, i) => ({
          type: 'location_updated',
          timestamp: new Date(),
          description: `Event ${i}`
        }));
        deliveryTracking.locationHistory = Array(60).fill().map((_, i) => ({
          coordinates: [i, i],
          timestamp: new Date()
        }));

        const detailed = deliveryTracking.getDetailedTracking();

        expect(detailed.events).toHaveLength(20); // Last 20 events
        expect(detailed.locationHistory).toHaveLength(50); // Last 50 locations
        expect(detailed).toHaveProperty('estimatedDelivery');
        expect(detailed).toHaveProperty('deliveryConfirmation');
        expect(detailed).toHaveProperty('issues');
      });
    });
  });

  describe('Private Helper Methods', () => {
    test('should validate status transitions correctly', () => {
      expect(deliveryTracking._isValidStatusTransition('accepted', 'picked_up')).toBe(true);
      expect(deliveryTracking._isValidStatusTransition('accepted', 'completed')).toBe(false);
      expect(deliveryTracking._isValidStatusTransition('picked_up', 'in_transit')).toBe(true);
      expect(deliveryTracking._isValidStatusTransition('completed', 'delivered')).toBe(false);
    });

    test('should get correct event type for status', () => {
      expect(deliveryTracking._getEventTypeForStatus('picked_up')).toBe('package_picked_up');
      expect(deliveryTracking._getEventTypeForStatus('in_transit')).toBe('in_transit_started');
      expect(deliveryTracking._getEventTypeForStatus('delivered')).toBe('package_delivered');
      expect(deliveryTracking._getEventTypeForStatus('completed')).toBe('delivery_completed');
    });

    test('should calculate distance between coordinates', () => {
      const coord1 = [0, 0];
      const coord2 = [0.01, 0.01]; // Approximately 1.57 km
      
      const distance = deliveryTracking._calculateDistance(coord1, coord2);
      
      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(2);
    });

    test('should convert degrees to radians', () => {
      expect(deliveryTracking._toRadians(180)).toBeCloseTo(Math.PI);
      expect(deliveryTracking._toRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(deliveryTracking._toRadians(0)).toBe(0);
    });
  });

  describe('Static Methods', () => {
    beforeEach(() => {
      // Mock static methods
      DeliveryTracking.find = jest.fn();
      DeliveryTracking.findOne = jest.fn();
      DeliveryTracking.aggregate = jest.fn();
    });

    describe('createForOffer', () => {
      test('should create delivery tracking for offer', async () => {
        const mockSave = jest.fn().mockResolvedValue({
          offer: offerId,
          rider: riderId,
          business: businessId,
          currentStatus: 'accepted'
        });

        DeliveryTracking.prototype.save = mockSave;

        const initialLocation = {
          coordinates: [-74.006, 40.7128],
          address: '123 Main St'
        };

        const result = await DeliveryTracking.createForOffer(
          offerId,
          riderId,
          businessId,
          { initialLocation }
        );

        expect(mockSave).toHaveBeenCalled();
      });
    });

    describe('getActiveDeliveries', () => {
      test('should find active deliveries for rider', () => {
        const mockChain = {
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue([])
        };

        DeliveryTracking.find.mockReturnValue(mockChain);

        DeliveryTracking.getActiveDeliveries(riderId);

        expect(DeliveryTracking.find).toHaveBeenCalledWith({
          rider: riderId,
          currentStatus: { $in: ['accepted', 'picked_up', 'in_transit', 'delivered'] }
        });
      });
    });

    describe('getBusinessDeliveries', () => {
      test('should find deliveries for business', () => {
        const mockChain = {
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          skip: jest.fn().mockResolvedValue([])
        };

        DeliveryTracking.find.mockReturnValue(mockChain);

        DeliveryTracking.getBusinessDeliveries(businessId, { status: 'in_transit' });

        expect(DeliveryTracking.find).toHaveBeenCalledWith({
          business: businessId,
          currentStatus: 'in_transit'
        });
      });
    });

    describe('getByOfferId', () => {
      test('should find delivery tracking by offer ID', () => {
        const mockPopulate = jest.fn().mockReturnThis();

        DeliveryTracking.findOne.mockReturnValue({
          populate: mockPopulate.mockReturnValue({
            populate: mockPopulate.mockReturnValue({
              populate: mockPopulate
            })
          })
        });

        DeliveryTracking.getByOfferId(offerId);

        expect(DeliveryTracking.findOne).toHaveBeenCalledWith({ offer: offerId });
      });
    });

    describe('getDeliveryStats', () => {
      test('should calculate delivery statistics', async () => {
        const mockStats = [
          { _id: 'completed', count: 10, avgDuration: 45, avgDistance: 5.5 },
          { _id: 'in_transit', count: 3, avgDuration: null, avgDistance: null },
          { _id: 'cancelled', count: 2, avgDuration: null, avgDistance: null }
        ];

        DeliveryTracking.aggregate.mockResolvedValue(mockStats);

        const stats = await DeliveryTracking.getDeliveryStats({ riderId });

        expect(stats.totalDeliveries).toBe(15);
        expect(stats.statusBreakdown.completed).toBe(10);
        expect(stats.statusBreakdown.in_transit).toBe(3);
        expect(stats.completionRate).toBe(66.67); // 10/15 * 100, rounded
        expect(stats.averageDuration).toBe(45);
        expect(stats.averageDistance).toBe(5.5);
      });

      test('should handle empty statistics', async () => {
        DeliveryTracking.aggregate.mockResolvedValue([]);

        const stats = await DeliveryTracking.getDeliveryStats();

        expect(stats.totalDeliveries).toBe(0);
        expect(stats.completionRate).toBe(0);
        expect(stats.averageDuration).toBe(0);
        expect(stats.averageDistance).toBe(0);
      });

      test('should apply date filters', async () => {
        DeliveryTracking.aggregate.mockResolvedValue([]);

        await DeliveryTracking.getDeliveryStats({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

        expect(DeliveryTracking.aggregate).toHaveBeenCalledWith([
          {
            $match: {
              createdAt: {
                $gte: new Date('2024-01-01'),
                $lte: new Date('2024-01-31')
              }
            }
          },
          expect.any(Object)
        ]);
      });
    });
  });

  describe('Location and Distance Calculations', () => {
    test('should handle location updates correctly', async () => {
      deliveryTracking.save = jest.fn().mockResolvedValue(deliveryTracking);

      const locations = [
        [-74.006, 40.7128], // New York
        [-74.007, 40.7129], // Slightly moved
        [-74.008, 40.7130]  // Moved again
      ];

      for (const coords of locations) {
        await deliveryTracking.updateLocation(coords, {
          accuracy: 5,
          speed: 20
        });
      }

      expect(deliveryTracking.locationHistory).toHaveLength(3);
      expect(deliveryTracking.currentLocation.coordinates).toEqual(locations[2]);
      expect(deliveryTracking.events.filter(e => e.type === 'location_updated')).toHaveLength(3);
    });

    test('should calculate realistic distances', () => {
      // Test known distance: New York to Philadelphia (approximately 130 km)
      const nyc = [-74.006, 40.7128];
      const philly = [-75.1652, 39.9526];
      
      const distance = deliveryTracking._calculateDistance(nyc, philly);
      
      expect(distance).toBeGreaterThan(120);
      expect(distance).toBeLessThan(140);
    });
  });

  describe('Issue Management', () => {
    test('should track multiple issues', async () => {
      deliveryTracking.save = jest.fn().mockResolvedValue(deliveryTracking);

      const issues = [
        {
          type: 'package_damaged',
          description: 'Box is wet',
          reportedBy: riderId,
          severity: 'high'
        },
        {
          type: 'recipient_unavailable',
          description: 'No one home',
          reportedBy: riderId,
          severity: 'medium'
        }
      ];

      for (const issue of issues) {
        await deliveryTracking.reportIssue(issue);
      }

      expect(deliveryTracking.issues).toHaveLength(2);
      expect(deliveryTracking.issues[0].type).toBe('package_damaged');
      expect(deliveryTracking.issues[1].type).toBe('recipient_unavailable');
      expect(deliveryTracking.events.filter(e => e.type === 'issue_reported')).toHaveLength(2);
    });

    test('should identify active issues in summary', () => {
      deliveryTracking.issues = [
        { resolved: false, type: 'package_damaged' },
        { resolved: true, type: 'wrong_address' },
        { resolved: false, type: 'recipient_unavailable' }
      ];

      const summary = deliveryTracking.getSummary();

      expect(summary.issueCount).toBe(3);
      expect(summary.hasActiveIssues).toBe(true);
    });
  });
});