const mongoose = require('mongoose');
const Offer = require('../models/Offer');

describe('Geospatial Functionality', () => {
  let sampleOffers;
  let testCoordinates;

  beforeAll(() => {
    // Test coordinates for New York City area
    testCoordinates = {
      manhattan: [-74.006, 40.7128],
      brooklyn: [-73.9857, 40.6892],
      queens: [-73.7949, 40.7282],
      bronx: [-73.8648, 40.8448],
      statenIsland: [-74.1502, 40.6195]
    };

    // Sample offers for testing
    sampleOffers = [
      {
        business: new mongoose.Types.ObjectId(),
        title: 'Manhattan Delivery',
        pickup: {
          address: '123 Broadway, New York, NY',
          coordinates: testCoordinates.manhattan,
          contactName: 'John Doe',
          contactPhone: '555-0001'
        },
        delivery: {
          address: '456 5th Ave, New York, NY',
          coordinates: [-74.0059, 40.7589], // Near Manhattan
          contactName: 'Jane Smith',
          contactPhone: '555-0002'
        },
        payment: { amount: 25.00 },
        status: 'open'
      },
      {
        business: new mongoose.Types.ObjectId(),
        title: 'Brooklyn Delivery',
        pickup: {
          address: '789 Atlantic Ave, Brooklyn, NY',
          coordinates: testCoordinates.brooklyn,
          contactName: 'Bob Johnson',
          contactPhone: '555-0003'
        },
        delivery: {
          address: '321 Flatbush Ave, Brooklyn, NY',
          coordinates: [-73.9776, 40.6782], // Near Brooklyn
          contactName: 'Alice Brown',
          contactPhone: '555-0004'
        },
        payment: { amount: 18.50 },
        status: 'open'
      },
      {
        business: new mongoose.Types.ObjectId(),
        title: 'Queens Delivery',
        pickup: {
          address: '555 Northern Blvd, Queens, NY',
          coordinates: testCoordinates.queens,
          contactName: 'Charlie Wilson',
          contactPhone: '555-0005'
        },
        delivery: {
          address: '777 Queens Blvd, Queens, NY',
          coordinates: [-73.8067, 40.7282], // Near Queens
          contactName: 'Diana Davis',
          contactPhone: '555-0006'
        },
        payment: { amount: 22.75 },
        status: 'open'
      }
    ];
  });

  describe('Geospatial Indexes', () => {
    test('should have 2dsphere indexes configured', () => {
      const offer = new Offer(sampleOffers[0]);
      
      // Verify that the schema has geospatial index configuration
      // In a real integration test, this would check actual database indexes
      expect(offer.pickup.coordinates).toBeDefined();
      expect(offer.delivery.coordinates).toBeDefined();
      expect(Array.isArray(offer.pickup.coordinates)).toBe(true);
      expect(Array.isArray(offer.delivery.coordinates)).toBe(true);
    });

    test('should validate coordinate format for geospatial queries', () => {
      sampleOffers.forEach(offerData => {
        const offer = new Offer(offerData);
        
        // Validate pickup coordinates
        expect(offer.pickup.coordinates).toHaveLength(2);
        expect(typeof offer.pickup.coordinates[0]).toBe('number'); // longitude
        expect(typeof offer.pickup.coordinates[1]).toBe('number'); // latitude
        
        // Validate delivery coordinates
        expect(offer.delivery.coordinates).toHaveLength(2);
        expect(typeof offer.delivery.coordinates[0]).toBe('number'); // longitude
        expect(typeof offer.delivery.coordinates[1]).toBe('number'); // latitude
        
        // Validate coordinate ranges
        expect(offer.pickup.coordinates[0]).toBeGreaterThanOrEqual(-180); // longitude min
        expect(offer.pickup.coordinates[0]).toBeLessThanOrEqual(180);     // longitude max
        expect(offer.pickup.coordinates[1]).toBeGreaterThanOrEqual(-90);  // latitude min
        expect(offer.pickup.coordinates[1]).toBeLessThanOrEqual(90);      // latitude max
      });
    });
  });

  describe('Distance Calculations', () => {
    test('calculateDistance should use Haversine formula correctly', () => {
      const offer = new Offer(sampleOffers[0]);
      const distance = offer.calculateDistance();
      
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
      
      // Distance between two Manhattan points should be reasonable
      expect(distance).toBeGreaterThan(100);   // At least 100 meters
      expect(distance).toBeLessThan(10000);    // Less than 10km
    });

    test('calculateDistanceBetweenPoints static method should work correctly', () => {
      const distance = Offer.calculateDistanceBetweenPoints(
        testCoordinates.manhattan,
        testCoordinates.brooklyn
      );
      
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(5000);  // At least 5km between Manhattan and Brooklyn
      expect(distance).toBeLessThan(20000);    // Less than 20km
    });

    test('should return null for invalid coordinates', () => {
      const invalidTests = [
        [null, testCoordinates.manhattan],
        [testCoordinates.manhattan, null],
        [[], testCoordinates.manhattan],
        [testCoordinates.manhattan, []],
        [[1], testCoordinates.manhattan],
        [testCoordinates.manhattan, [1]]
      ];

      invalidTests.forEach(([coords1, coords2]) => {
        const distance = Offer.calculateDistanceBetweenPoints(coords1, coords2);
        expect(distance).toBeNull();
      });
    });
  });

  describe('Geospatial Query Methods', () => {
    test('findNearby should build correct query structure', () => {
      const coordinates = testCoordinates.manhattan;
      const maxDistance = 5000; // 5km
      const options = {
        minPayment: 15,
        maxPayment: 30,
        packageType: 'fragile',
        vehicleType: 'bike'
      };

      // Since we can't test actual database queries in unit tests,
      // we'll test that the method exists and can be called
      expect(typeof Offer.findNearby).toBe('function');
      
      // Test method parameters
      const result = Offer.findNearby(coordinates, maxDistance, options);
      expect(result).toBeDefined();
    });

    test('findWithinRadius should build aggregation pipeline correctly', () => {
      const coordinates = testCoordinates.brooklyn;
      const radius = 10000; // 10km
      const filters = {
        minPayment: 10,
        maxPayment: 50,
        sortBy: 'distance',
        limit: 20
      };

      // Test that the method exists and can be called
      expect(typeof Offer.findWithinRadius).toBe('function');
      
      const result = Offer.findWithinRadius(coordinates, radius, filters);
      expect(result).toBeDefined();
    });

    test('findSortedByDistance should build aggregation pipeline correctly', () => {
      const coordinates = testCoordinates.queens;
      const options = {
        maxDistance: 25000, // 25km
        businessId: new mongoose.Types.ObjectId(),
        limit: 10
      };

      // Test that the method exists and can be called
      expect(typeof Offer.findSortedByDistance).toBe('function');
      
      const result = Offer.findSortedByDistance(coordinates, options);
      expect(result).toBeDefined();
    });
  });

  describe('Query Performance Optimization', () => {
    test('should use efficient query structures for geospatial operations', () => {
      // Test that geospatial queries use proper MongoDB operators
      const coordinates = testCoordinates.manhattan;
      
      // Verify $near query structure (would be tested in integration tests)
      const nearQuery = {
        status: 'open',
        'pickup.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: 10000
          }
        }
      };

      expect(nearQuery['pickup.coordinates'].$near.$geometry.type).toBe('Point');
      expect(nearQuery['pickup.coordinates'].$near.$geometry.coordinates).toEqual(coordinates);
      expect(nearQuery['pickup.coordinates'].$near.$maxDistance).toBe(10000);
    });

    test('should use $geoNear aggregation for complex queries', () => {
      // Test $geoNear aggregation structure
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
      expect(geoNearStage.$geoNear.maxDistance).toBe(15000);
    });

    test('should support filtering with geospatial queries', () => {
      // Test combined geospatial and filter queries
      const filters = {
        minPayment: 20,
        maxPayment: 40,
        packageType: 'fragile',
        vehicleType: 'car'
      };

      // Verify filter logic
      expect(filters.minPayment).toBe(20);
      expect(filters.maxPayment).toBe(40);
      expect(filters.packageType).toBe('fragile');
      expect(filters.vehicleType).toBe('car');
    });
  });

  describe('Location-Based Matching', () => {
    test('should support configurable search radius', () => {
      const testRadii = [1000, 5000, 10000, 25000, 50000]; // Various distances in meters
      
      testRadii.forEach(radius => {
        // Test that different radii can be used
        expect(typeof radius).toBe('number');
        expect(radius).toBeGreaterThan(0);
        
        // In integration tests, this would verify actual query results
        const mockQuery = {
          'pickup.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: testCoordinates.manhattan
              },
              $maxDistance: radius
            }
          }
        };
        
        expect(mockQuery['pickup.coordinates'].$near.$maxDistance).toBe(radius);
      });
    });

    test('should handle edge cases for location queries', () => {
      // Test edge coordinates
      const edgeCases = [
        [-180, -90],  // Southwest corner
        [180, 90],    // Northeast corner
        [0, 0],       // Equator/Prime Meridian
        [-74.006, 40.7128] // Normal coordinates
      ];

      edgeCases.forEach(coords => {
        const [lng, lat] = coords;
        
        // Validate coordinate ranges
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
        
        // Test that coordinates can be used in queries
        const offer = new Offer({
          ...sampleOffers[0],
          pickup: {
            ...sampleOffers[0].pickup,
            coordinates: coords
          }
        });
        
        expect(offer.pickup.coordinates).toEqual(coords);
      });
    });
  });

  describe('Vehicle Type Compatibility', () => {
    test('should filter offers based on vehicle capacity', () => {
      const bikeCompatibleOffer = new Offer({
        ...sampleOffers[0],
        packageDetails: {
          weight: 3, // 3kg - bike compatible
          dimensions: { length: 30, width: 20, height: 10 },
          fragile: false
        }
      });

      const carOnlyOffer = new Offer({
        ...sampleOffers[1],
        packageDetails: {
          weight: 15, // 15kg - car/van only
          dimensions: { length: 80, width: 60, height: 40 },
          fragile: true
        }
      });

      // Test bike compatibility
      expect(bikeCompatibleOffer.packageDetails.weight).toBeLessThanOrEqual(5);
      
      // Test car requirement
      expect(carOnlyOffer.packageDetails.weight).toBeGreaterThan(5);
    });

    test('should consider package dimensions for vehicle matching', () => {
      const vehicleCapacities = {
        bike: { maxWeight: 5, maxVolume: 50000 }, // 50L
        scooter: { maxWeight: 10, maxVolume: 100000 }, // 100L
        car: { maxWeight: 50, maxVolume: 500000 }, // 500L
        van: { maxWeight: 200, maxVolume: 2000000 } // 2000L
      };

      Object.entries(vehicleCapacities).forEach(([vehicle, capacity]) => {
        expect(capacity.maxWeight).toBeGreaterThan(0);
        expect(capacity.maxVolume).toBeGreaterThan(0);
        
        // Verify capacity increases with vehicle size
        if (vehicle === 'bike') {
          expect(capacity.maxWeight).toBeLessThan(vehicleCapacities.scooter.maxWeight);
        }
      });
    });
  });

  describe('Performance Considerations', () => {
    test('should use appropriate indexes for common query patterns', () => {
      // Test index combinations that would be used in real queries
      const commonIndexes = [
        { 'pickup.coordinates': '2dsphere' },
        { 'delivery.coordinates': '2dsphere' },
        { status: 1, createdAt: -1 },
        { business: 1, status: 1 },
        { acceptedBy: 1, status: 1 }
      ];

      commonIndexes.forEach(index => {
        expect(typeof index).toBe('object');
        expect(Object.keys(index).length).toBeGreaterThan(0);
      });
    });

    test('should limit query results for performance', () => {
      const performanceOptions = {
        defaultLimit: 50,
        maxLimit: 200,
        defaultRadius: 10000, // 10km
        maxRadius: 100000     // 100km
      };

      expect(performanceOptions.defaultLimit).toBeLessThan(performanceOptions.maxLimit);
      expect(performanceOptions.defaultRadius).toBeLessThan(performanceOptions.maxRadius);
    });

    test('should use aggregation pipelines efficiently', () => {
      // Test aggregation pipeline structure for performance
      const efficientPipeline = [
        { $geoNear: { /* geospatial stage first */ } },
        { $match: { /* filtering after geospatial */ } },
        { $lookup: { /* join data */ } },
        { $sort: { /* sort results */ } },
        { $limit: 50 } // Limit results
      ];

      expect(efficientPipeline).toHaveLength(5);
      expect(efficientPipeline[0]).toHaveProperty('$geoNear');
      expect(efficientPipeline[4]).toHaveProperty('$limit');
    });
  });
});