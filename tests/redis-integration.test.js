/**
 * Redis Caching Integration Tests
 * Tests Redis caching functionality with actual API endpoints
 */

const request = require('supertest');
const express = require('express');
const { CacheService } = require('../services/CacheService');
const { CacheStrategies } = require('../services/CacheStrategies');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const TestFactories = global.testUtils.TestFactories;
const TestHelpers = global.testUtils.TestHelpers;

describe('Redis Caching Integration Tests', () => {
  let app;
  let cacheService;
  let cacheStrategies;
  let businessUser;
  let riderUser;
  let businessToken;
  let riderToken;

  beforeAll(async () => {
    // Initialize test cache service
    cacheService = new CacheService({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: 2, // Use different DB for integration testing
      keyPrefix: 'integration:test:'
    });

    cacheStrategies = new CacheStrategies();
    cacheStrategies.cache = cacheService;

    // Connect to Redis
    await cacheService.connect();

    // Create test app
    app = express();
    app.use(express.json());

    // Create test users
    businessUser = await TestFactories.createBusinessUser();
    riderUser = await TestFactories.createRiderUser();
    businessToken = TestHelpers.generateToken(businessUser);
    riderToken = TestHelpers.generateToken(riderUser);
  });

  beforeEach(async () => {
    // Clear test cache before each test
    await cacheService.redis.flushdb();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await cacheService.redis.flushdb();
    await cacheService.disconnect();
  });

  describe('Cache Middleware Integration', () => {
    beforeEach(() => {
      // Setup test routes with caching middleware
      app.get('/test/cached-route', 
        (req, res, next) => {
          req.user = { id: businessUser._id.toString(), role: 'business' };
          next();
        },
        cacheMiddleware.userOffers,
        (req, res) => {
          res.json({ 
            data: 'test response', 
            timestamp: Date.now(),
            userId: req.user.id 
          });
        }
      );

      app.get('/test/nearby-offers',
        (req, res, next) => {
          req.user = { id: riderUser._id.toString(), role: 'rider' };
          next();
        },
        cacheMiddleware.nearbyOffers,
        (req, res) => {
          res.json({
            offers: [
              { id: 1, title: 'Test Offer 1', distance: 1.5 },
              { id: 2, title: 'Test Offer 2', distance: 2.3 }
            ],
            location: { lat: req.query.lat, lng: req.query.lng },
            timestamp: Date.now()
          });
        }
      );

      app.post('/test/invalidate-offers',
        (req, res, next) => {
          req.user = { id: businessUser._id.toString(), role: 'business' };
          next();
        },
        cacheMiddleware.invalidateOffers,
        (req, res) => {
          res.json({ message: 'Offer created', id: 123 });
        }
      );
    });

    test('should cache GET responses and serve from cache on subsequent requests', async () => {
      // First request - should hit the route and cache the response
      const response1 = await request(app)
        .get('/test/cached-route?status=active&page=1')
        .expect(200);

      expect(response1.body.data).toBe('test response');
      expect(response1.body.userId).toBe(businessUser._id.toString());
      const firstTimestamp = response1.body.timestamp;

      // Wait a bit to ensure timestamp would be different
      await TestHelpers.wait(10);

      // Second request - should serve from cache (same timestamp)
      const response2 = await request(app)
        .get('/test/cached-route?status=active&page=1')
        .expect(200);

      expect(response2.body.data).toBe('test response');
      expect(response2.body.timestamp).toBe(firstTimestamp); // Same timestamp = cached
    });

    test('should cache nearby offers with location and filters', async () => {
      const lat = 37.7749;
      const lng = -122.4194;
      const maxDistance = 5000;

      // First request
      const response1 = await request(app)
        .get(`/test/nearby-offers?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}&minPayment=20`)
        .expect(200);

      expect(response1.body.offers).toHaveLength(2);
      expect(response1.body.location.lat).toBe(lat.toString());
      const firstTimestamp = response1.body.timestamp;

      // Second request with same parameters - should be cached
      const response2 = await request(app)
        .get(`/test/nearby-offers?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}&minPayment=20`)
        .expect(200);

      expect(response2.body.timestamp).toBe(firstTimestamp);

      // Third request with different parameters - should not be cached
      const response3 = await request(app)
        .get(`/test/nearby-offers?lat=${lat}&lng=${lng}&maxDistance=${maxDistance}&minPayment=30`)
        .expect(200);

      expect(response3.body.timestamp).not.toBe(firstTimestamp);
    });

    test('should invalidate cache after POST operations', async () => {
      // First, cache a GET response
      const getResponse1 = await request(app)
        .get('/test/cached-route?status=active')
        .expect(200);

      const firstTimestamp = getResponse1.body.timestamp;

      // Verify it's cached
      const getResponse2 = await request(app)
        .get('/test/cached-route?status=active')
        .expect(200);

      expect(getResponse2.body.timestamp).toBe(firstTimestamp);

      // Make a POST request that should invalidate cache
      await request(app)
        .post('/test/invalidate-offers')
        .send({ title: 'New Offer' })
        .expect(200);

      // Wait for cache invalidation to complete
      await TestHelpers.wait(100);

      // GET request should now return fresh data (different timestamp)
      const getResponse3 = await request(app)
        .get('/test/cached-route?status=active')
        .expect(200);

      expect(getResponse3.body.timestamp).not.toBe(firstTimestamp);
    });
  });

  describe('Cache Strategies Integration', () => {
    let testOffer;
    let testPayment;

    beforeEach(async () => {
      testOffer = await TestFactories.createOffer(businessUser._id);
      testPayment = await TestFactories.createPayment(businessUser._id, riderUser._id);
    });

    test('should cache and retrieve user profiles', async () => {
      const userId = businessUser._id.toString();
      const profile = businessUser.getProfileData();

      // Cache user profile
      await cacheStrategies.setUserProfile(userId, profile);

      // Retrieve from cache
      const cachedProfile = await cacheStrategies.getUserProfile(userId);
      expect(cachedProfile).toEqual(profile);
      expect(cachedProfile.businessName).toBe(profile.businessName);
    });

    test('should cache and retrieve offers with geospatial data', async () => {
      const offerId = testOffer._id.toString();
      const offerData = testOffer.toObject();

      // Cache offer
      await cacheStrategies.setOffer(offerId, offerData);

      // Retrieve from cache
      const cachedOffer = await cacheStrategies.getOffer(offerId);
      expect(cachedOffer._id).toBe(offerData._id);
      expect(cachedOffer.pickup.coordinates).toEqual(offerData.pickup.coordinates);
      expect(cachedOffer.delivery.coordinates).toEqual(offerData.delivery.coordinates);
    });

    test('should cache nearby offers with complex filters', async () => {
      const lat = 37.7749;
      const lng = -122.4194;
      const radius = 10000;
      const filters = {
        minPayment: 20,
        maxPayment: 100,
        packageType: 'document',
        vehicleType: 'bike',
        sortBy: 'distance'
      };

      const offers = [testOffer.toObject()];

      // Cache nearby offers
      await cacheStrategies.setNearbyOffers(lat, lng, radius, filters, offers);

      // Retrieve from cache
      const cachedOffers = await cacheStrategies.getNearbyOffers(lat, lng, radius, filters);
      expect(cachedOffers).toHaveLength(1);
      expect(cachedOffers[0]._id).toBe(testOffer._id);
    });

    test('should cache business and rider offers separately', async () => {
      const businessId = businessUser._id.toString();
      const riderId = riderUser._id.toString();
      const businessOffers = [testOffer.toObject()];
      const riderOffers = [testOffer.toObject()];

      // Cache business offers
      await cacheStrategies.setBusinessOffers(businessId, businessOffers);

      // Cache rider offers
      await cacheStrategies.setRiderOffers(riderId, riderOffers, 'accepted');

      // Retrieve business offers
      const cachedBusinessOffers = await cacheStrategies.getBusinessOffers(businessId);
      expect(cachedBusinessOffers).toHaveLength(1);

      // Retrieve rider offers
      const cachedRiderOffers = await cacheStrategies.getRiderOffers(riderId, 'accepted');
      expect(cachedRiderOffers).toHaveLength(1);
    });

    test('should cache payment and earnings data', async () => {
      const paymentId = testPayment._id.toString();
      const riderId = riderUser._id.toString();
      const paymentData = testPayment.toObject();

      // Cache payment
      await cacheStrategies.setPayment(paymentId, paymentData);

      // Cache rider earnings
      const earningsData = {
        totalEarnings: 250.00,
        totalPayments: 10,
        averagePayment: 25.00,
        period: 'month'
      };
      await cacheStrategies.setRiderEarnings(riderId, earningsData, 'month');

      // Retrieve payment
      const cachedPayment = await cacheStrategies.getPayment(paymentId);
      expect(cachedPayment._id).toBe(paymentData._id);
      expect(cachedPayment.amount).toBe(paymentData.amount);

      // Retrieve earnings
      const cachedEarnings = await cacheStrategies.getRiderEarnings(riderId, 'month');
      expect(cachedEarnings.totalEarnings).toBe(250.00);
      expect(cachedEarnings.period).toBe('month');
    });

    test('should handle cache invalidation cascades', async () => {
      const businessId = businessUser._id.toString();
      const riderId = riderUser._id.toString();
      const offerId = testOffer._id.toString();

      // Set up multiple related caches
      await cacheStrategies.setOffer(offerId, testOffer.toObject());
      await cacheStrategies.setBusinessOffers(businessId, [testOffer.toObject()]);
      await cacheStrategies.setNearbyOffers(37.7749, -122.4194, 10000, {}, [testOffer.toObject()]);

      // Verify caches exist
      expect(await cacheStrategies.getOffer(offerId)).not.toBeNull();
      expect(await cacheStrategies.getBusinessOffers(businessId)).not.toBeNull();
      expect(await cacheStrategies.getNearbyOffers(37.7749, -122.4194, 10000, {})).not.toBeNull();

      // Invalidate offer (should cascade to related caches)
      await cacheStrategies.invalidateOffer(offerId, businessId, riderId);

      // Verify caches are cleared
      expect(await cacheStrategies.getOffer(offerId)).toBeNull();
      expect(await cacheStrategies.getBusinessOffers(businessId)).toBeNull();
      expect(await cacheStrategies.getNearbyOffers(37.7749, -122.4194, 10000, {})).toBeNull();
    });
  });

  describe('Cache Performance and Reliability', () => {
    test('should handle high-volume concurrent cache operations', async () => {
      const operations = [];
      const numOperations = 200;

      // Create concurrent cache operations
      for (let i = 0; i < numOperations; i++) {
        const operation = async () => {
          const key = `perf:test:${i}`;
          const value = { 
            id: i, 
            data: `test data ${i}`,
            timestamp: Date.now(),
            businessId: businessUser._id.toString()
          };

          await cacheService.set(key, value, 300);
          const retrieved = await cacheService.get(key);
          expect(retrieved).toEqual(value);
        };

        operations.push(operation());
      }

      // Execute all operations concurrently
      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Completed ${numOperations} concurrent cache operations in ${executionTime}ms`);
    });

    test('should gracefully handle cache failures', async () => {
      // Temporarily disconnect from Redis to simulate failure
      await cacheService.disconnect();

      // Cache operations should not throw errors
      const setResult = await cacheService.set('test:failure', 'test value');
      expect(setResult).toBe(false);

      const getValue = await cacheService.get('test:failure');
      expect(getValue).toBeNull();

      // Reconnect for other tests
      await cacheService.connect();
    });

    test('should handle cache expiration correctly', async () => {
      const key = 'test:expiration';
      const value = 'expires quickly';

      // Set with 1 second TTL
      await cacheService.set(key, value, 1);

      // Should exist immediately
      const immediateValue = await cacheService.get(key);
      expect(immediateValue).toBe(value);

      // Wait for expiration
      await TestHelpers.wait(1100);

      // Should be expired
      const expiredValue = await cacheService.get(key);
      expect(expiredValue).toBeNull();
    });

    test('should handle large data objects efficiently', async () => {
      const largeData = {
        offers: Array(1000).fill().map((_, i) => ({
          id: i,
          title: `Offer ${i}`,
          description: 'A'.repeat(100), // 100 character description
          pickup: {
            address: `${i} Main Street, City, State`,
            coordinates: [-122.4194 + (i * 0.001), 37.7749 + (i * 0.001)]
          },
          delivery: {
            address: `${i + 1000} Oak Avenue, City, State`,
            coordinates: [-122.4194 + ((i + 1000) * 0.001), 37.7749 + ((i + 1000) * 0.001)]
          },
          payment: {
            amount: 20 + (i % 50),
            currency: 'USD'
          }
        })),
        metadata: {
          totalCount: 1000,
          generatedAt: new Date(),
          filters: { minPayment: 20, maxPayment: 70 }
        }
      };

      const startTime = Date.now();
      
      // Cache large data
      const setResult = await cacheService.set('test:large:data', largeData, 300);
      expect(setResult).toBe(true);

      // Retrieve large data
      const retrievedData = await cacheService.get('test:large:data');
      
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(retrievedData).toEqual(largeData);
      expect(retrievedData.offers).toHaveLength(1000);
      expect(operationTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`Large data cache operation completed in ${operationTime}ms`);
    });
  });

  describe('Cache Analytics and Monitoring', () => {
    test('should provide cache health information', async () => {
      const health = await cacheStrategies.getCacheHealth();

      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.latency).toBeDefined();
      expect(health.strategies).toBeDefined();
      expect(health.strategies.totalStrategies).toBeGreaterThan(0);
    });

    test('should provide cache statistics', async () => {
      // Set some test data to generate statistics
      await cacheService.set('stats:test1', 'value1', 300);
      await cacheService.set('stats:test2', 'value2', 300);
      await cacheService.set('stats:test3', 'value3', 300);

      const stats = await cacheService.getStats();

      expect(stats.connected).toBe(true);
      expect(stats.memory).toBeDefined();
      expect(stats.keyspace).toBeDefined();
      expect(stats.timestamp).toBeDefined();
    });

    test('should track cache hit/miss ratios', async () => {
      const testKeys = ['hit:test1', 'hit:test2', 'hit:test3'];
      const testValues = ['value1', 'value2', 'value3'];

      // Set some values
      for (let i = 0; i < testKeys.length; i++) {
        await cacheService.set(testKeys[i], testValues[i], 300);
      }

      let hits = 0;
      let misses = 0;

      // Test cache hits
      for (const key of testKeys) {
        const value = await cacheService.get(key);
        if (value !== null) {
          hits++;
        } else {
          misses++;
        }
      }

      // Test cache misses
      const nonExistentKeys = ['miss:test1', 'miss:test2'];
      for (const key of nonExistentKeys) {
        const value = await cacheService.get(key);
        if (value !== null) {
          hits++;
        } else {
          misses++;
        }
      }

      expect(hits).toBe(3); // All set keys should be hits
      expect(misses).toBe(2); // Non-existent keys should be misses

      const hitRatio = hits / (hits + misses);
      expect(hitRatio).toBe(0.6); // 3 hits out of 5 total requests
    });
  });

  describe('Cache Warm-up and Preloading', () => {
    test('should warm up user cache on login', async () => {
      const userId = businessUser._id.toString();
      const userRole = businessUser.role;

      // Warm up cache
      await cacheStrategies.warmUpCache(userId, userRole);

      // Verify cache is populated
      const cachedProfile = await cacheStrategies.getUserProfile(userId);
      const cachedAuth = await cacheStrategies.getUserAuth(businessUser.email);

      expect(cachedProfile).not.toBeNull();
      expect(cachedProfile.businessName).toBe(businessUser.profile.businessName);

      expect(cachedAuth).not.toBeNull();
      expect(cachedAuth.email).toBe(businessUser.email);
      expect(cachedAuth.role).toBe(businessUser.role);
    });

    test('should preload frequently accessed data', async () => {
      const businessId = businessUser._id.toString();
      const riderId = riderUser._id.toString();

      // Simulate preloading frequently accessed data
      const preloadOperations = [
        cacheStrategies.setUserProfile(businessId, businessUser.getProfileData()),
        cacheStrategies.setUserProfile(riderId, riderUser.getProfileData()),
        cacheStrategies.setBusinessOffers(businessId, []),
        cacheStrategies.setRiderOffers(riderId, [], 'available'),
        cacheStrategies.setRiderEarnings(riderId, { totalEarnings: 0, totalPayments: 0 })
      ];

      const startTime = Date.now();
      await Promise.all(preloadOperations);
      const endTime = Date.now();

      const preloadTime = endTime - startTime;
      expect(preloadTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify all data is cached
      expect(await cacheStrategies.getUserProfile(businessId)).not.toBeNull();
      expect(await cacheStrategies.getUserProfile(riderId)).not.toBeNull();
      expect(await cacheStrategies.getBusinessOffers(businessId)).not.toBeNull();
      expect(await cacheStrategies.getRiderOffers(riderId, 'available')).not.toBeNull();
      expect(await cacheStrategies.getRiderEarnings(riderId)).not.toBeNull();

      console.log(`Cache preloading completed in ${preloadTime}ms`);
    });
  });
});