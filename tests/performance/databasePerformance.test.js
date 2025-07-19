/**
 * Database Performance Tests
 * Tests for critical database operations and query optimization
 */

const mongoose = require('mongoose');
const DatabaseOptimization = require('../../utils/databaseOptimization');
const TestFactories = global.testUtils.TestFactories;
const TestHelpers = global.testUtils.TestHelpers;

describe('Database Performance Tests', () => {
  let dbOptimizer;
  let testUsers = [];
  let testOffers = [];

  beforeAll(async () => {
    dbOptimizer = new DatabaseOptimization();
    
    // Create optimized indexes
    await dbOptimizer.createOptimizedIndexes();
    
    // Create test data for performance testing
    await createPerformanceTestData();
  }, 60000); // 60 second timeout for setup

  beforeEach(async () => {
    // Clean performance metrics before each test
    dbOptimizer.performanceMetrics = {};
  });

  afterAll(async () => {
    // Clean up test data
    await TestFactories.cleanup();
  });

  /**
   * Create test data for performance testing
   */
  async function createPerformanceTestData() {
    console.log('Creating performance test data...');
    
    // Create businesses and riders
    const businesses = await TestFactories.createUsers(20, 'business');
    const riders = await TestFactories.createUsers(15, 'rider');
    testUsers = [...businesses, ...riders];

    // Create offers with varied locations and characteristics
    const offerPromises = [];
    for (let i = 0; i < 100; i++) {
      const business = businesses[i % businesses.length];
      const offerData = {
        status: i % 5 === 0 ? 'accepted' : 'open',
        riderId: i % 5 === 0 ? riders[i % riders.length]._id : undefined,
        payment: { amount: 15 + (i % 50) },
        packageDetails: {
          weight: 0.5 + (i % 10),
          fragile: i % 3 === 0
        },
        pickup: {
          coordinates: TestHelpers.generateRandomCoordinates(37.7749, -122.4194, 25)
        },
        delivery: {
          coordinates: TestHelpers.generateRandomCoordinates(37.7749, -122.4194, 25)
        }
      };
      
      offerPromises.push(TestFactories.createOffer(business._id, offerData));
    }

    testOffers = await Promise.all(offerPromises);
    console.log(`Created ${testOffers.length} test offers`);

    // Create payments
    const paymentPromises = [];
    for (let i = 0; i < 50; i++) {
      const business = businesses[i % businesses.length];
      const rider = riders[i % riders.length];
      paymentPromises.push(TestFactories.createPayment(business._id, rider._id, {
        amount: 20 + (i % 30),
        status: i % 4 === 0 ? 'completed' : 'pending'
      }));
    }

    await Promise.all(paymentPromises);
    console.log('Performance test data created successfully');
  }

  describe('Index Performance Tests', () => {
    test('should efficiently query users by role', async () => {
      const User = require('../../models/User');
      
      const result = await dbOptimizer.monitorQueryPerformance(
        'users_by_role',
        () => User.find({ role: 'rider' }).limit(10)
      );

      expect(result.length).toBeGreaterThan(0);
      
      const metrics = dbOptimizer.getPerformanceMetrics()['users_by_role'];
      expect(metrics.averageTime).toBeLessThan(100); // Should be under 100ms
    });

    test('should efficiently query available riders', async () => {
      const User = require('../../models/User');
      
      const result = await dbOptimizer.monitorQueryPerformance(
        'available_riders',
        () => User.find({ 
          role: 'rider', 
          'profile.isAvailable': true,
          isVerified: true 
        }).limit(10)
      );

      expect(result.length).toBeGreaterThan(0);
      
      const metrics = dbOptimizer.getPerformanceMetrics()['available_riders'];
      expect(metrics.averageTime).toBeLessThan(150);
    });

    test('should efficiently query offers by status', async () => {
      const Offer = require('../../models/Offer');
      
      const result = await dbOptimizer.monitorQueryPerformance(
        'offers_by_status',
        () => Offer.find({ status: 'open' }).limit(20)
      );

      expect(result.length).toBeGreaterThan(0);
      
      const metrics = dbOptimizer.getPerformanceMetrics()['offers_by_status'];
      expect(metrics.averageTime).toBeLessThan(100);
    });

    test('should efficiently query business offers', async () => {
      const Offer = require('../../models/Offer');
      const business = testUsers.find(u => u.role === 'business');
      
      const result = await dbOptimizer.monitorQueryPerformance(
        'business_offers',
        () => Offer.find({ 
          business: business._id,
          status: { $in: ['open', 'accepted', 'in_transit'] }
        }).sort({ createdAt: -1 }).limit(10)
      );

      expect(result.length).toBeGreaterThan(0);
      
      const metrics = dbOptimizer.getPerformanceMetrics()['business_offers'];
      expect(metrics.averageTime).toBeLessThan(150);
    });
  });

  describe('Geospatial Query Performance Tests', () => {
    test('should efficiently find nearby offers using $near', async () => {
      const Offer = require('../../models/Offer');
      const riderLocation = [-122.4194, 37.7749];
      
      const result = await dbOptimizer.monitorQueryPerformance(
        'nearby_offers_near',
        () => Offer.find({
          status: 'open',
          'pickup.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: riderLocation
              },
              $maxDistance: 10000 // 10km
            }
          }
        }).limit(10)
      );

      expect(result.length).toBeGreaterThan(0);
      
      const metrics = dbOptimizer.getPerformanceMetrics()['nearby_offers_near'];
      expect(metrics.averageTime).toBeLessThan(200);
    });

    test('should efficiently find nearby offers using $geoNear aggregation', async () => {
      const Offer = require('../../models/Offer');
      const riderLocation = [-122.4194, 37.7749];
      
      const pipeline = DatabaseOptimization.createNearbyOffersAggregation(
        riderLocation,
        15000, // 15km
        {
          paymentRange: { min: 20, max: 100 },
          sortBy: 'distance',
          limit: 15
        }
      );

      const result = await dbOptimizer.monitorQueryPerformance(
        'nearby_offers_aggregation',
        () => Offer.aggregate(pipeline)
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('distanceFromRider');
      
      const metrics = dbOptimizer.getPerformanceMetrics()['nearby_offers_aggregation'];
      expect(metrics.averageTime).toBeLessThan(300);
    });

    test('should efficiently find riders within delivery area', async () => {
      const User = require('../../models/User');
      const deliveryLocation = [-122.4094, 37.7849];
      
      const result = await dbOptimizer.monitorQueryPerformance(
        'nearby_riders',
        () => User.find({
          role: 'rider',
          'profile.isAvailable': true,
          'profile.currentLocation.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: deliveryLocation
              },
              $maxDistance: 5000 // 5km
            }
          }
        }).limit(10)
      );

      const metrics = dbOptimizer.getPerformanceMetrics()['nearby_riders'];
      expect(metrics.averageTime).toBeLessThan(200);
    });
  });

  describe('Complex Query Performance Tests', () => {
    test('should efficiently calculate rider earnings', async () => {
      const Payment = require('../../models/Payment');
      const rider = testUsers.find(u => u.role === 'rider');
      
      const pipeline = DatabaseOptimization.createEarningsAggregation(
        rider._id,
        {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        }
      );

      const result = await dbOptimizer.monitorQueryPerformance(
        'rider_earnings_calculation',
        () => Payment.aggregate(pipeline)
      );

      expect(result.length).toBeGreaterThanOrEqual(0);
      
      const metrics = dbOptimizer.getPerformanceMetrics()['rider_earnings_calculation'];
      expect(metrics.averageTime).toBeLessThan(250);
    });

    test('should efficiently get user notification counts', async () => {
      const Notification = require('../../models/Notification');
      const user = testUsers[0];
      
      // Create some test notifications
      await TestFactories.createNotification(user._id, { isRead: false });
      await TestFactories.createNotification(user._id, { isRead: true });
      
      const result = await dbOptimizer.monitorQueryPerformance(
        'user_notification_counts',
        () => Notification.aggregate([
          { $match: { userId: user._id } },
          {
            $group: {
              _id: '$isRead',
              count: { $sum: 1 }
            }
          }
        ])
      );

      expect(result.length).toBeGreaterThan(0);
      
      const metrics = dbOptimizer.getPerformanceMetrics()['user_notification_counts'];
      expect(metrics.averageTime).toBeLessThan(100);
    });

    test('should efficiently get platform analytics', async () => {
      const User = require('../../models/User');
      const Offer = require('../../models/Offer');
      const Payment = require('../../models/Payment');
      
      const analyticsQuery = async () => {
        const [userStats, offerStats, paymentStats] = await Promise.all([
          User.aggregate([
            {
              $group: {
                _id: '$role',
                count: { $sum: 1 },
                verified: {
                  $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                }
              }
            }
          ]),
          Offer.aggregate([
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgAmount: { $avg: '$payment.amount' }
              }
            }
          ]),
          Payment.aggregate([
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
              }
            }
          ])
        ]);

        return { userStats, offerStats, paymentStats };
      };

      const result = await dbOptimizer.monitorQueryPerformance(
        'platform_analytics',
        analyticsQuery
      );

      expect(result.userStats).toBeDefined();
      expect(result.offerStats).toBeDefined();
      expect(result.paymentStats).toBeDefined();
      
      const metrics = dbOptimizer.getPerformanceMetrics()['platform_analytics'];
      expect(metrics.averageTime).toBeLessThan(500);
    });
  });

  describe('Load Testing', () => {
    test('should handle concurrent user lookups', async () => {
      const User = require('../../models/User');
      
      const lookupUser = () => {
        const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
        return User.findById(randomUser._id);
      };

      const results = await TestHelpers.loadTest(lookupUser, 10, 50);
      
      expect(results.successfulRequests).toBe(50);
      expect(results.failedRequests).toBe(0);
      expect(results.averageTime).toBeLessThan(100);
    });

    test('should handle concurrent offer searches', async () => {
      const Offer = require('../../models/Offer');
      
      const searchOffers = () => {
        const randomLocation = TestHelpers.generateRandomCoordinates();
        return Offer.find({
          status: 'open',
          'pickup.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: randomLocation
              },
              $maxDistance: 20000
            }
          }
        }).limit(5);
      };

      const results = await TestHelpers.loadTest(searchOffers, 8, 40);
      
      expect(results.successfulRequests).toBe(40);
      expect(results.failedRequests).toBe(0);
      expect(results.averageTime).toBeLessThan(300);
    });

    test('should handle concurrent payment queries', async () => {
      const Payment = require('../../models/Payment');
      
      const queryPayments = () => {
        const randomUser = testUsers[Math.floor(Math.random() * testUsers.length)];
        return Payment.find({
          $or: [
            { businessId: randomUser._id },
            { riderId: randomUser._id }
          ]
        }).sort({ createdAt: -1 }).limit(10);
      };

      const results = await TestHelpers.loadTest(queryPayments, 6, 30);
      
      expect(results.successfulRequests).toBe(30);
      expect(results.failedRequests).toBe(0);
      expect(results.averageTime).toBeLessThan(200);
    });
  });

  describe('Query Optimization Analysis', () => {
    test('should provide query performance analysis', async () => {
      // Run several queries to generate metrics
      const User = require('../../models/User');
      const Offer = require('../../models/Offer');
      
      // Run some test queries
      await dbOptimizer.monitorQueryPerformance('test_user_query', () => 
        User.find({ role: 'rider' }).limit(5)
      );
      
      await dbOptimizer.monitorQueryPerformance('test_offer_query', () => 
        Offer.find({ status: 'open' }).limit(5)
      );

      const suggestions = await dbOptimizer.analyzeQueryPerformance();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should explain query execution plans', async () => {
      const User = require('../../models/User');
      
      const explanation = await dbOptimizer.explainQuery(
        User,
        { role: 'rider', 'profile.isAvailable': true }
      );

      expect(explanation).toHaveProperty('queryPlanner');
      expect(explanation).toHaveProperty('executionStats');
      expect(explanation).toHaveProperty('indexUsed');
      expect(explanation).toHaveProperty('documentsExamined');
      expect(explanation).toHaveProperty('documentsReturned');
      expect(explanation).toHaveProperty('executionTime');
    });
  });

  describe('Database Statistics', () => {
    test('should provide database statistics', async () => {
      const stats = await dbOptimizer.getDatabaseStats();
      
      expect(stats).toHaveProperty('collections');
      expect(stats).toHaveProperty('documents');
      expect(stats).toHaveProperty('dataSize');
      expect(stats).toHaveProperty('storageSize');
      expect(stats).toHaveProperty('indexes');
      expect(stats).toHaveProperty('indexSize');
      
      expect(stats.collections).toBeGreaterThan(0);
      expect(stats.documents).toBeGreaterThan(0);
    });

    test('should provide collection-specific statistics', async () => {
      const userStats = await dbOptimizer.getCollectionStats('users');
      
      expect(userStats).toHaveProperty('name', 'users');
      expect(userStats).toHaveProperty('count');
      expect(userStats).toHaveProperty('size');
      expect(userStats).toHaveProperty('storageSize');
      expect(userStats).toHaveProperty('totalIndexSize');
      expect(userStats).toHaveProperty('indexSizes');
      
      expect(userStats.count).toBeGreaterThan(0);
    });
  });

  describe('Index Creation Results', () => {
    test('should have created all required indexes', () => {
      const results = dbOptimizer.indexCreationResults;
      
      expect(results.length).toBeGreaterThan(0);
      
      // Check that indexes were created for all models
      const models = ['User', 'Offer', 'Payment', 'Notification'];
      models.forEach(model => {
        const modelIndexes = results.filter(r => r.model === model);
        expect(modelIndexes.length).toBeGreaterThan(0);
      });
      
      // Check that most indexes were created successfully
      const successfulIndexes = results.filter(r => r.status === 'created' || r.status === 'exists');
      const failedIndexes = results.filter(r => r.status === 'error');
      
      expect(successfulIndexes.length).toBeGreaterThan(failedIndexes.length);
      
      if (failedIndexes.length > 0) {
        console.warn('Some indexes failed to create:', failedIndexes);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    test('should meet performance benchmarks for critical queries', async () => {
      const benchmarks = [
        {
          name: 'User authentication lookup',
          query: () => {
            const User = require('../../models/User');
            return User.findOne({ email: testUsers[0].email });
          },
          maxTime: 50
        },
        {
          name: 'Nearby offers search',
          query: () => {
            const Offer = require('../../models/Offer');
            return Offer.find({
              status: 'open',
              'pickup.coordinates': {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [-122.4194, 37.7749]
                  },
                  $maxDistance: 10000
                }
              }
            }).limit(10);
          },
          maxTime: 200
        },
        {
          name: 'User payment history',
          query: () => {
            const Payment = require('../../models/Payment');
            return Payment.find({ 
              businessId: testUsers[0]._id 
            }).sort({ createdAt: -1 }).limit(20);
          },
          maxTime: 100
        }
      ];

      for (const benchmark of benchmarks) {
        const result = await dbOptimizer.monitorQueryPerformance(
          benchmark.name,
          benchmark.query
        );
        
        const metrics = dbOptimizer.getPerformanceMetrics()[benchmark.name];
        expect(metrics.averageTime).toBeLessThan(benchmark.maxTime);
        
        console.log(`✓ ${benchmark.name}: ${metrics.averageTime.toFixed(2)}ms (max: ${benchmark.maxTime}ms)`);
      }
    });
  });
});