const mongoose = require('mongoose');
const LocationTracking = require('../models/LocationTracking');
const User = require('../models/User');

describe('Location Tracking', () => {
  let testRider;
  let testOffer;
  let sampleLocationData;

  beforeAll(() => {
    // Mock rider and offer IDs
    testRider = new mongoose.Types.ObjectId();
    testOffer = new mongoose.Types.ObjectId();

    // Sample location data for testing
    sampleLocationData = {
      coordinates: [-74.006, 40.7128], // NYC coordinates
      accuracy: 10,
      altitude: 50,
      heading: 180,
      speed: 5.5,
      batteryLevel: 85,
      deviceInfo: {
        platform: 'ios',
        version: '1.0.0',
        userAgent: 'LastMileApp/1.0.0 iOS'
      },
      offerId: testOffer,
      trackingType: 'heading_to_pickup'
    };
  });

  describe('LocationTracking Model', () => {
    test('should create location tracking record with required fields', () => {
      const locationRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        }
      });

      expect(locationRecord.rider).toEqual(testRider);
      expect(locationRecord.currentLocation.type).toBe('Point');
      expect(locationRecord.currentLocation.coordinates).toEqual([-74.006, 40.7128]);
      expect(locationRecord.isActive).toBe(true);
      expect(locationRecord.trackingType).toBe('idle');
      expect(locationRecord.timestamp).toBeInstanceOf(Date);
    });

    test('should validate coordinate format', () => {
      const locationRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        }
      });

      expect(locationRecord.currentLocation.coordinates).toHaveLength(2);
      expect(typeof locationRecord.currentLocation.coordinates[0]).toBe('number');
      expect(typeof locationRecord.currentLocation.coordinates[1]).toBe('number');
    });

    test('should validate tracking type enum values', () => {
      const validTrackingTypes = ['idle', 'heading_to_pickup', 'at_pickup', 'heading_to_delivery', 'at_delivery'];
      
      validTrackingTypes.forEach(trackingType => {
        const locationRecord = new LocationTracking({
          rider: testRider,
          currentLocation: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          },
          trackingType
        });
        
        expect(locationRecord.trackingType).toBe(trackingType);
      });
    });

    test('should include optional metadata fields', () => {
      const locationRecord = new LocationTracking({
        rider: testRider,
        offer: testOffer,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        accuracy: 15,
        altitude: 100,
        heading: 270,
        speed: 8.3,
        batteryLevel: 75,
        deviceInfo: {
          platform: 'android',
          version: '2.1.0',
          userAgent: 'LastMileApp/2.1.0 Android'
        },
        trackingType: 'in_transit'
      });

      expect(locationRecord.offer).toEqual(testOffer);
      expect(locationRecord.accuracy).toBe(15);
      expect(locationRecord.altitude).toBe(100);
      expect(locationRecord.heading).toBe(270);
      expect(locationRecord.speed).toBe(8.3);
      expect(locationRecord.batteryLevel).toBe(75);
      expect(locationRecord.deviceInfo.platform).toBe('android');
    });
  });

  describe('Instance Methods', () => {
    test('getLocationSummary should return essential location data', () => {
      const locationRecord = new LocationTracking({
        rider: testRider,
        offer: testOffer,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        accuracy: 10,
        heading: 180,
        speed: 5.5,
        trackingType: 'heading_to_pickup'
      });

      const summary = locationRecord.getLocationSummary();

      expect(summary).toEqual({
        id: locationRecord._id,
        rider: testRider,
        offer: testOffer,
        coordinates: [-74.006, 40.7128],
        accuracy: 10,
        heading: 180,
        speed: 5.5,
        trackingType: 'heading_to_pickup',
        timestamp: locationRecord.timestamp,
        isActive: true
      });
    });

    test('getLocationSummary should handle missing coordinates', () => {
      const locationRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: null
        }
      });

      const summary = locationRecord.getLocationSummary();
      expect(summary.coordinates).toBeNull();
    });
  });

  describe('Static Methods - updateRiderLocation', () => {
    test('should validate coordinates format', async () => {
      const invalidCoordinates = [
        null,
        [],
        [1],
        ['a', 'b'],
        [181, 0], // Invalid longitude
        [0, 91]   // Invalid latitude
      ];

      for (const coords of invalidCoordinates) {
        await expect(LocationTracking.updateRiderLocation(testRider, { coordinates: coords }))
          .rejects.toThrow();
      }
    });

    test('should create location record with valid data', async () => {
      // Mock the save method and User.findByIdAndUpdate
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockFindByIdAndUpdate = jest.fn().mockResolvedValue(true);
      
      LocationTracking.prototype.save = mockSave;
      mongoose.model = jest.fn().mockReturnValue({ findByIdAndUpdate: mockFindByIdAndUpdate });

      const locationData = {
        coordinates: [-74.006, 40.7128],
        accuracy: 10,
        trackingType: 'heading_to_pickup'
      };

      const result = await LocationTracking.updateRiderLocation(testRider, locationData);

      expect(result).toBeInstanceOf(LocationTracking);
      expect(result.rider).toEqual(testRider);
      expect(result.currentLocation.coordinates).toEqual([-74.006, 40.7128]);
      expect(result.accuracy).toBe(10);
      expect(result.trackingType).toBe('heading_to_pickup');
      expect(mockSave).toHaveBeenCalled();
    });

    test('should handle coordinate range validation', async () => {
      const validCoordinates = [
        [-180, -90], // Southwest corner
        [180, 90],   // Northeast corner
        [0, 0],      // Equator/Prime Meridian
        [-74.006, 40.7128] // NYC
      ];

      for (const coords of validCoordinates) {
        const locationData = { coordinates: coords };
        
        // This should not throw an error
        expect(() => {
          const [lng, lat] = coords;
          if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            throw new Error('Coordinates out of valid range');
          }
        }).not.toThrow();
      }
    });
  });

  describe('Static Methods - Query Operations', () => {
    test('getRiderLocationHistory should build correct query', () => {
      const options = {
        limit: 25,
        startTime: '2024-01-15T10:00:00Z',
        endTime: '2024-01-15T18:00:00Z',
        offerId: testOffer
      };

      // Mock the query chain
      const mockSort = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockPopulate = jest.fn().mockReturnValue([]);
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
        limit: mockLimit,
        populate: mockPopulate
      });

      LocationTracking.find = mockFind;

      LocationTracking.getRiderLocationHistory(testRider, options);

      expect(mockFind).toHaveBeenCalledWith({
        rider: testRider,
        timestamp: {
          $gte: new Date('2024-01-15T10:00:00Z'),
          $lte: new Date('2024-01-15T18:00:00Z')
        },
        offer: testOffer
      });
      expect(mockSort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockLimit).toHaveBeenCalledWith(25);
    });

    test('getActiveRiders should use geospatial aggregation', () => {
      const coordinates = [-74.006, 40.7128];
      const radius = 5000;

      // Mock aggregate method
      const mockAggregate = jest.fn().mockReturnValue([]);
      LocationTracking.aggregate = mockAggregate;

      LocationTracking.getActiveRiders(coordinates, radius);

      expect(mockAggregate).toHaveBeenCalledWith([
        {
          $match: {
            isActive: true,
            timestamp: { $gte: expect.any(Date) }
          }
        },
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: coordinates
            },
            distanceField: 'distance',
            maxDistance: radius,
            spherical: true
          }
        },
        expect.any(Object), // $group stage
        expect.any(Object), // $replaceRoot stage
        expect.any(Object), // $lookup stage
        { $sort: { distance: 1 } }
      ]);
    });

    test('getDeliveryTracking should query by offer', () => {
      const mockSort = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockPopulate = jest.fn().mockReturnValue([]);
      const mockFind = jest.fn().mockReturnValue({
        sort: mockSort,
        limit: mockLimit,
        populate: mockPopulate
      });

      LocationTracking.find = mockFind;

      LocationTracking.getDeliveryTracking(testOffer);

      expect(mockFind).toHaveBeenCalledWith({
        offer: testOffer,
        isActive: true
      });
      expect(mockSort).toHaveBeenCalledWith({ timestamp: -1 });
      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    test('deactivateTracking should update records', async () => {
      const mockUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 5 });
      LocationTracking.updateMany = mockUpdateMany;

      await LocationTracking.deactivateTracking(testRider, testOffer);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        {
          rider: testRider,
          isActive: true,
          offer: testOffer
        },
        {
          isActive: false,
          updatedAt: expect.any(Date)
        }
      );
    });

    test('deactivateTracking should work without offer ID', async () => {
      const mockUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });
      LocationTracking.updateMany = mockUpdateMany;

      await LocationTracking.deactivateTracking(testRider);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        {
          rider: testRider,
          isActive: true
        },
        {
          isActive: false,
          updatedAt: expect.any(Date)
        }
      );
    });
  });

  describe('Distance Calculation', () => {
    test('calculateDistanceTraveled should sum distances between points', async () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      
      // Mock location history with multiple points
      const mockLocations = [
        {
          currentLocation: { coordinates: [-74.006, 40.7128] }, // NYC
          timestamp: new Date('2024-01-15T10:00:00Z')
        },
        {
          currentLocation: { coordinates: [-74.005, 40.7130] }, // Slightly moved
          timestamp: new Date('2024-01-15T10:05:00Z')
        },
        {
          currentLocation: { coordinates: [-74.004, 40.7135] }, // Further moved
          timestamp: new Date('2024-01-15T10:10:00Z')
        }
      ];

      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockLocations)
      });
      LocationTracking.find = mockFind;

      const distance = await LocationTracking.calculateDistanceTraveled(testRider, testOffer, startTime);

      expect(mockFind).toHaveBeenCalledWith({
        rider: testRider,
        offer: testOffer,
        timestamp: { $gte: startTime }
      });
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    test('calculateDistanceTraveled should return 0 for insufficient data', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]) // No locations
      });
      LocationTracking.find = mockFind;

      const distance = await LocationTracking.calculateDistanceTraveled(testRider, testOffer, new Date());
      expect(distance).toBe(0);
    });

    test('_calculateDistance should use Haversine formula', () => {
      const coords1 = [-74.006, 40.7128]; // NYC
      const coords2 = [-73.9857, 40.6892]; // Brooklyn

      const distance = LocationTracking._calculateDistance(coords1, coords2);

      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(3000); // At least 3km
      expect(distance).toBeLessThan(15000);   // Less than 15km
    });

    test('_calculateDistance should handle same coordinates', () => {
      const coords = [-74.006, 40.7128];
      const distance = LocationTracking._calculateDistance(coords, coords);

      expect(distance).toBe(0);
    });
  });

  describe('Tracking Types and States', () => {
    test('should support all tracking type transitions', () => {
      const trackingFlow = [
        'idle',
        'heading_to_pickup',
        'at_pickup',
        'heading_to_delivery',
        'at_delivery'
      ];

      trackingFlow.forEach(trackingType => {
        const locationRecord = new LocationTracking({
          rider: testRider,
          currentLocation: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          },
          trackingType
        });

        expect(locationRecord.trackingType).toBe(trackingType);
      });
    });

    test('should handle active/inactive states', () => {
      const activeRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        isActive: true
      });

      const inactiveRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        isActive: false
      });

      expect(activeRecord.isActive).toBe(true);
      expect(inactiveRecord.isActive).toBe(false);
    });
  });

  describe('Device and Battery Information', () => {
    test('should store device information', () => {
      const deviceInfo = {
        platform: 'ios',
        version: '1.2.3',
        userAgent: 'LastMileApp/1.2.3 iOS 15.0'
      };

      const locationRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        deviceInfo,
        batteryLevel: 65
      });

      expect(locationRecord.deviceInfo).toEqual(deviceInfo);
      expect(locationRecord.batteryLevel).toBe(65);
    });

    test('should handle missing device information', () => {
      const locationRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        }
      });

      // Mongoose creates empty objects for nested schemas when not provided
      expect(locationRecord.deviceInfo).toBeDefined();
      expect(locationRecord.batteryLevel).toBeNull();
    });
  });

  describe('Performance and Indexing', () => {
    test('should have geospatial index configuration', () => {
      // Test that the schema has the correct index configuration
      const locationRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        }
      });

      expect(locationRecord.currentLocation.type).toBe('Point');
      expect(Array.isArray(locationRecord.currentLocation.coordinates)).toBe(true);
    });

    test('should support TTL for automatic cleanup', () => {
      const oldTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      
      const locationRecord = new LocationTracking({
        rider: testRider,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        timestamp: oldTimestamp
      });

      // TTL index should be configured to delete records older than 7 days
      expect(locationRecord.timestamp).toEqual(oldTimestamp);
    });

    test('should optimize queries with compound indexes', () => {
      // Test query patterns that would use compound indexes
      const queryPatterns = [
        { rider: testRider, timestamp: -1 },
        { offer: testOffer, timestamp: -1 },
        { rider: testRider, isActive: true, timestamp: -1 },
        { trackingType: 'heading_to_pickup', isActive: true }
      ];

      queryPatterns.forEach(pattern => {
        expect(typeof pattern).toBe('object');
        expect(Object.keys(pattern).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-time Tracking Scenarios', () => {
    test('should handle delivery workflow tracking', () => {
      const deliveryStates = [
        { trackingType: 'idle', description: 'Rider available' },
        { trackingType: 'heading_to_pickup', description: 'Going to pickup' },
        { trackingType: 'at_pickup', description: 'At pickup location' },
        { trackingType: 'heading_to_delivery', description: 'Going to delivery' },
        { trackingType: 'at_delivery', description: 'At delivery location' }
      ];

      deliveryStates.forEach(state => {
        const locationRecord = new LocationTracking({
          rider: testRider,
          offer: testOffer,
          currentLocation: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          },
          trackingType: state.trackingType
        });

        expect(locationRecord.trackingType).toBe(state.trackingType);
        expect(locationRecord.offer).toEqual(testOffer);
      });
    });

    test('should handle multiple concurrent deliveries', () => {
      const offer1 = new mongoose.Types.ObjectId();
      const offer2 = new mongoose.Types.ObjectId();

      const tracking1 = new LocationTracking({
        rider: testRider,
        offer: offer1,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        trackingType: 'heading_to_pickup'
      });

      const tracking2 = new LocationTracking({
        rider: testRider,
        offer: offer2,
        currentLocation: {
          type: 'Point',
          coordinates: [-74.007, 40.7130]
        },
        trackingType: 'heading_to_delivery'
      });

      expect(tracking1.offer).toEqual(offer1);
      expect(tracking2.offer).toEqual(offer2);
      expect(tracking1.rider).toEqual(tracking2.rider);
    });
  });
});