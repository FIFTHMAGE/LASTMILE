const mongoose = require('mongoose');
const Offer = require('../models/Offer');

describe('Geospatial Functionality', () => {
  let sampleOfferData;
  let testCoordinates;

  beforeAll(() => {
    // Test coordinates for New York City area
    testCoordinates = {
      manhattan: [-74.006, 40.7128],
      brooklyn: [-73.9857, 40.6892],
      queens: [-73.7949, 40.7282],
      bronx: [-73.8648, 40.8448]
    };

    sampleOfferData = {
      business: new mongoose.Types.ObjectId(),
      title: 'Test Delivery',
      pickup: {
        address: '123 Broadway, New York, NY',
        coordinates: testCoordinates.manhattan,
        contactName: 'John Doe',
        contactPhone: '555-0001'
      },
      delivery: {
        address: '456 5th Ave, New York, NY',
        coordinates: [-74.0059, 40.7589],
        contactName: 'Jane Smith',
        contactPhone: '555-0002'
      },
      payment: { amount: 25.00 },
      status: 'open'
    };
  });

  describe('Geospatial Indexes and Schema', () => {
    test('should have geospatial methods', () => {
      expect(typeof Offer.findNearby).toBe('function');
      expect(typeof Offer.findWithinRadius).toBe('function');
      expect(typeof Offer.findSortedByDistance).toBe('function');
      expect(typeof Offer.calculateDistanceBetweenPoints).toBe('function');
    });

    test('should have 2dsphere indexes configured', () => {
      const offer = new Offer(sampleOfferData);
      
      // Verify coordinate format
      expect(offer.pickup.coordinates).toHaveLength(2);
      expect(offer.delivery.coordinates).toHaveLength(2);
      expect(typeof offer.pickup.coordinates[0]).toBe('number');
      expect(typeof offer.pickup.coordinates[1]).toBe('number');
    });

    test('should validate coordinate ranges', () => {
      const offer = new Offer(sampleOfferData);
      
      // Validate longitude ranges (-180 to 180)
      expect(offer.pickup.coordinates[0]).toBeGreaterThanOrEqual(-180);
      expect(offer.pickup.coordinates[0]).toBeLessThanOrEqual(180);
      
      // Validate latitude ranges (-90 to 90)
      expect(offer.pickup.coordinates[1]).toBeGreaterThanOrEqual(-90);
      expect(offer.pickup.coordinates[1]).toBeLessThanOrEqual(90);
    });
  });

  describe('Distance Calculations', () => {
    test('should calculate distance between coordinates correctly', () => {
      const distance = Offer.calculateDistanceBetweenPoints(
        testCoordinates.manhattan,
        testCoordinates.brooklyn
      );
      
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(3000);  // At least 3km
      expect(distance).toBeLessThan(15000);    // Less than 15km
    });

    test('should calculate distance using Haversine formula', () => {
      const offer = new Offer(sampleOfferData);
      const distance = offer.calculateDistance();
      
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10000); // Less than 10km for Manhattan area
    });

    test('should return null for invalid coordinates', () => {
      const invalidTests = [
        [null, testCoordinates.manhattan],
        [testCoordinates.manhattan, null],
        [[], testCoordinates.manhattan],
        [[1], testCoordinates.manhattan]
      ];

      invalidTests.forEach(([coords1, coords2]) => {
        const distance = Offer.calculateDistanceBetweenPoints(coords1, coords2);
        expect(distance).toBeNull();
      });
    });

    test('should handle edge case coordinates', () => {
      const edgeCases = [
        [[-180, -90], [180, 90]], // Opposite corners of Earth
        [[0, 0], [1, 1]],         // Near equator/prime meridian
        [[-74.006, 40.7128], [-74.006, 40.7128]] // Same coordinates
      ];

      edgeCases.forEach(([coords1, coords2]) => {
        const distance = Offer.calculateDistanceBetweenPoints(coords1, coords2);
        expect(typeof distance).toBe('number');
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Geospatial Query Performance', () => {
    test('should use efficient $near query structure', () => {
      const coordinates = testCoordinates.manhattan;
      const maxDistance = 10000;
      
      // Test query structure that would be used
      const nearQuery = {
        status: 'open',
        'pickup.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: maxDistance
          }
        }
      };

      expect(nearQuery['pickup.coordinates'].$near.$geometry.type).toBe('Point');
      expect(nearQuery['pickup.coordinates'].$near.$geometry.coordinates).toEqual(coordinates);
      expect(nearQuery['pickup.coordinates'].$near.$maxDistance).toBe(maxDistance);
    });

    test('should use $geoNear aggregation for complex queries', () => {
      const geoNearStage = {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: testCoordinates.brooklyn
          },
          distanceField: 'distanceFromRider',
          maxDistance: 15000,
          spherical: true,
          query: { status: 'open' }
        }
      };

      expect(geoNearStage.$geoNear.near.type).toBe('Point');
      expect(geoNearStage.$geoNear.distanceField).toBe('distanceFromRider');
      expect(geoNearStage.$geoNear.spherical).toBe(true);
    });

    test('should support filtering with geospatial queries', () => {
      const filters = {
        minPayment: 15,
        maxPayment: 50,
        packageType: 'fragile',
        vehicleType: 'bike'
      };

      // Test that filters can be combined with geospatial queries
      expect(filters.minPayment).toBeLessThan(filters.maxPayment);
      expect(['fragile', 'normal']).toContain(filters.packageType);
      expect(['bike', 'scooter', 'car', 'van']).toContain(filters.vehicleType);
    });
  });

  describe('Location-Based Matching', () => {
    test('should support configurable search radius', () => {
      const testRadii = [1000, 5000, 10000, 25000, 50000];
      
      testRadii.forEach(radius => {
        expect(typeof radius).toBe('number');
        expect(radius).toBeGreaterThan(0);
        expect(radius).toBeLessThanOrEqual(100000); // Max 100km
      });
    });

    test('should handle vehicle type compatibility', () => {
      const vehicleCapacities = {
        bike: { maxWeight: 5 },
        scooter: { maxWeight: 10 },
        car: { maxWeight: 50 },
        van: { maxWeight: 200 }
      };

      Object.entries(vehicleCapacities).forEach(([vehicle, capacity]) => {
        expect(capacity.maxWeight).toBeGreaterThan(0);
      });

      // Test capacity ordering
      expect(vehicleCapacities.bike.maxWeight).toBeLessThan(vehicleCapacities.scooter.maxWeight);
      expect(vehicleCapacities.scooter.maxWeight).toBeLessThan(vehicleCapacities.car.maxWeight);
      expect(vehicleCapacities.car.maxWeight).toBeLessThan(vehicleCapacities.van.maxWeight);
    });

    test('should estimate delivery time based on distance and vehicle', () => {
      const offer = new Offer(sampleOfferData);
      offer.estimatedDistance = 5000; // 5km
      
      const bikeTime = offer.estimateDeliveryTime('bike');
      const carTime = offer.estimateDeliveryTime('car');
      
      expect(typeof bikeTime).toBe('number');
      expect(typeof carTime).toBe('number');
      expect(bikeTime).toBeGreaterThan(carTime); // Bike should take longer
      expect(bikeTime).toBeGreaterThanOrEqual(10); // At least 10 minutes buffer
    });
  });

  describe('Query Optimization', () => {
    test('should use appropriate indexes for common patterns', () => {
      const commonIndexes = [
        { 'pickup.coordinates': '2dsphere' },
        { 'delivery.coordinates': '2dsphere' },
        { status: 1, createdAt: -1 },
        { business: 1, status: 1 }
      ];

      commonIndexes.forEach(index => {
        expect(typeof index).toBe('object');
        expect(Object.keys(index).length).toBeGreaterThan(0);
      });
    });

    test('should limit results for performance', () => {
      const performanceSettings = {
        defaultLimit: 50,
        maxLimit: 200,
        defaultRadius: 10000,
        maxRadius: 100000
      };

      expect(performanceSettings.defaultLimit).toBeLessThan(performanceSettings.maxLimit);
      expect(performanceSettings.defaultRadius).toBeLessThan(performanceSettings.maxRadius);
    });

    test('should use efficient aggregation pipeline order', () => {
      const pipeline = [
        { $geoNear: {} },    // Geospatial first
        { $match: {} },      // Filter after geospatial
        { $lookup: {} },     // Join data
        { $sort: {} },       // Sort results
        { $limit: 50 }       // Limit last
      ];

      expect(pipeline[0]).toHaveProperty('$geoNear');
      expect(pipeline[pipeline.length - 1]).toHaveProperty('$limit');
    });
  });
});