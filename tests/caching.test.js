/**
 * Caching Tests
 * Comprehensive tests for Redis caching functionality and strategies
 */

const { CacheService } = require('../services/CacheService');
const { CacheStrategies } = require('../services/CacheStrategies');
const TestFactories = global.testUtils.TestFactories;
const TestHelpers = global.testUtils.TestHelpers;

describe('Caching System Tests', () => {
  let cacheService;
  let cacheStrategies;
  let testUser;

  beforeAll(async () => {
    // Initialize cache services
    cacheService = new CacheService({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: 1, // Use different DB for testing
      keyPrefix: 'test:lastmile:'
    });

    cacheStrategies = new CacheStrategies();
    cacheStrategies.cache = cacheService; // Use test cache service

    // Connect to Redis
    await cacheService.connect();
  });

  beforeEach(async () => {
    // Clear test cache before each test
    await cacheService.redis.flushdb();
    
    // Create test user
    testUser = await TestFactories.createBusinessUser();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await cacheService.redis.flushdb();
    await cacheService.disconnect();
  });

  describe('CacheService Basic Operations', () => {
    test('should connect to Redis successfully', async () => {
      expect(cacheService.isConnected).toBe(true);
      
      const health = await cacheService.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
    });

    test('should set and get cache values', async () => {
      const key = 'test:key';
      const value = { name: 'Test Value', number: 42 };

      // Set value
      const setResult = await cacheService.set(key, value, 300);
      expect(setResult).toBe(true);

      // Get value
      const cachedValue = await cacheService.get(key);
      expect(cachedValue).toEqual(value);
    });

    test('should handle cache expiration', async () => {
      const key = 'test:expiry';
      const value = 'expires soon';

      // Set with 1 second TTL
      await cacheService.set(key, value, 1);
      
      // Should exist immediately
      const exists = await cacheService.exists(key);
      expect(exists).toBe(true);

      // Wait for expiration
      await TestHelpers.wait(1100);

      // Should be expired
      const expiredValue = await cacheService.get(key);
      expect(expiredValue).toBeNull();
    });

    test('should delete cache keys', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';

      await cacheService.set(key, value);
      
      // Verify it exists
      const cachedValue = await cacheService.get(key);
      expect(cachedValue).toBe(value);

      // Delete it
      const deleteResult = await cacheService.del(key);
      expect(deleteResult).toBe(true);

      // Verify it's gone
      const deletedValue = await cacheService.get(key);
      expect(deletedValue).toBeNull();
    });

    test('should handle multiple key operations', async () => {
      const keyValuePairs = {
        'test:multi1': { id: 1, name: 'First' },
        'test:multi2': { id: 2, name: 'Second' },
        'test:multi3': { id: 3, name: 'Third' }
      };

      // Set multiple keys
      const msetResult = await cacheService.mset(keyValuePairs, 300);
      expect(msetResult).toBe(true);

      // Get multiple keys
      const keys = Object.keys(keyValuePairs);
      const mgetResult = await cacheService.mget(keys);
      
      expect(mgetResult['test:multi1']).toEqual(keyValuePairs['test:multi1']);
      expect(mgetResult['test:multi2']).toEqual(keyValuePairs['test:multi2']);
      expect(mgetResult['test:multi3']).toEqual(keyValuePairs['test:multi3']);

      // Delete multiple keys
      const delResult = await cacheService.delMultiple(keys);
      expect(delResult).toBe(3);
    });

    test('should handle cache with fallback function', async () => {
      const key = 'test:fallback';
      let fallbackCalled = false;

      const fallbackFn = async () => {
        fallbackCalled = true;
        return { computed: 'value', timestamp: Date.now() };
      };

      // First call should execute fallback
      const result1 = await cacheService.getOrSet(key, fallbackFn, 300);
      expect(fallbackCalled).toBe(true);
      expect(result1.computed).toBe('value');

      // Reset flag
      fallbackCalled = false;

      // Second call should use cache
      const result2 = await cacheService.getOrSet(key, fallbackFn, 300);
      expect(fallbackCalled).toBe(false);
      expect(result2.computed).toBe('value');
      expect(result2.timestamp).toBe(result1.timestamp);
    });

    test('should handle set operations', async () => {
      const key = 'test:set';
      const members = ['member1', 'member2', 'member3'];

      // Add members to set
      const addResult = await cacheService.sadd(key, ...members);
      expect(addResult).toBe(3);

      // Get set members
      const setMembers = await cacheService.smembers(key);
      expect(setMembers.sort()).toEqual(members.sort());

      // Remove member
      const remResult = await cacheService.srem(key, 'member2');
      expect(remResult).toBe(1);

      // Verify removal
      const remainingMembers = await cacheService.smembers(key);
      expect(remainingMembers).toContain('member1');
      expect(remainingMembers).toContain('member3');
      expect(remainingMembers).not.toContain('member2');
    });

    test('should handle counter operations', async () => {
      const key = 'test:counter';

      // Increment by 1
      const count1 = await cacheService.incr(key);
      expect(count1).toBe(1);

      // Increment by 5
      const count2 = await cacheService.incr(key, 5);
      expect(count2).toBe(6);

      // Increment by 1 again
      const count3 = await cacheService.incr(key);
      expect(count3).toBe(7);
    });
  });

  describe('CacheStrategies User Operations', () => {
    test('should cache and retrieve user profiles', async () => {
      const userId = testUser._id.toString();
      const profile = testUser.getProfileData();

      // Set user profile
      const setResult = await cacheStrategies.setUserProfile(userId, profile);
      expect(setResult).toBe(true);

      // Get user profile
      const cachedProfile = await cacheStrategies.getUserProfile(userId);
      expect(cachedProfile).toEqual(profile);
      expect(cachedProfile.businessName).toBe(profile.businessName);
    });

    test('should cache user authentication data', async () => {
      const email = testUser.email;
      const authData = {
        _id: testUser._id,
        email: testUser.email,
        role: testUser.role,
        isVerified: testUser.isVerified
      };

      // Set auth data
      await cacheStrategies.setUserAuth(email, authData);

      // Get auth data
      const cachedAuth = await cacheStrategies.getUserAuth(email);
      expect(cachedAuth.email).toBe(email);
      expect(cachedAuth.role).toBe(testUser.role);
    });

    test('should invalidate user-related caches', async () => {
      const userId = testUser._id.toString();
      const email = testUser.email;
      const profile = testUser.getProfileData();

      // Set multiple user caches
      await cacheStrategies.setUserProfile(userId, profile);
      await cacheStrategies.setUserAuth(email, { email, role: testUser.role });

      // Verify caches exist
      expect(await cacheStrategies.getUserProfile(userId)).not.toBeNull();
      expect(await cacheStrategies.getUserAuth(email)).not.toBeNull();

      // Invalidate user profile
      await cacheStrategies.invalidateUserProfile(userId);

      // Verify profile cache is cleared
      expect(await cacheStrategies.getUserProfile(userId)).toBeNull();

      // Invalidate auth cache
      await cacheStrategies.invalidateUserAuth(email);

      // Verify auth cache is cleared
      expect(await cacheStrategies.getUserAuth(email)).toBeNull();
    });
  });

  describe('CacheStrategies Offer Operations', () => {
    let testOffer;

    beforeEach(async () => {
      testOffer = await TestFactories.createOffer(testUser._id);
    });

    test('should cache and retrieve offers', async () => {
      const offerId = testOffer._id.toString();

      // Set offer
      await cacheStrategies.setOffer(offerId, testOffer);

      // Get offer
      const cachedOffer = await cacheStrategies.getOffer(offerId);
      expect(cachedOffer._id).toBe(testOffer._id);
      expect(cachedOffer.status).toBe(testOffer.status);
    });

    test('should cache nearby offers with filters', async () => {
      const lat = 37.7749;
      const lng = -122.4194;
      const radius = 10000;
      const filters = { minPayment: 20, maxPayment: 50 };
      const offers = [testOffer];

      // Set nearby offers
      await cacheStrategies.setNearbyOffers(lat, lng, radius, filters, offers);

      // Get nearby offers
      const cachedOffers = await cacheStrategies.getNearbyOffers(lat, lng, radius, filters);
      expect(cachedOffers).toHaveLength(1);
      expect(cachedOffers[0]._id).toBe(testOffer._id);
    });

    test('should cache business offers', async () => {
      const businessId = testUser._id.toString();
      const offers = [testOffer];

      // Set business offers
      await cacheStrategies.setBusinessOffers(businessId, offers);

      // Get business offers
      const cachedOffers = await cacheStrategies.getBusinessOffers(businessId);
      expect(cachedOffers).toHaveLength(1);
      expect(cachedOffers[0]._id).toBe(testOffer._id);
    });

    test('should invalidate offer-related caches', async () => {
      const offerId = testOffer._id.toString();
      const businessId = testUser._id.toString();

      // Set offer and business offers
      await cacheStrategies.setOffer(offerId, testOffer);
      await cacheStrategies.setBusinessOffers(businessId, [testOffer]);

      // Verify caches exist
      expect(await cacheStrategies.getOffer(offerId)).not.toBeNull();
      expect(await cacheStrategies.getBusinessOffers(businessId)).not.toBeNull();

      // Invalidate offer
      await cacheStrategies.invalidateOffer(offerId, businessId);

      // Verify caches are cleared
      expect(await cacheStrategies.getOffer(offerId)).toBeNull();
      expect(await cacheStrategies.getBusinessOffers(businessId)).toBeNull();
    });
  });

  describe('CacheStrategies Payment and Earnings', () => {
    let testPayment;

    beforeEach(async () => {
      const rider = await TestFactories.createRiderUser();
      testPayment = await TestFactories.createPayment(testUser._id, rider._id);
    });

    test('should cache payment data', async () => {
      const paymentId = testPayment._id.toString();

      // Set payment
      await cacheStrategies.setPayment(paymentId, testPayment);

      // Get payment
      const cachedPayment = await cacheStrategies.getPayment(paymentId);
      expect(cachedPayment._id).toBe(testPayment._id);
      expect(cachedPayment.amount).toBe(testPayment.amount);
    });

    test('should cache rider earnings', async () => {
      const riderId = testPayment.riderId.toString();
      const earnings = {
        totalEarnings: 150.00,
        totalPayments: 6,
        averagePayment: 25.00
      };

      // Set earnings
      await cacheStrategies.setRiderEarnings(riderId, earnings);

      // Get earnings
      const cachedEarnings = await cacheStrategies.getRiderEarnings(riderId);
      expect(cachedEarnings.totalEarnings).toBe(150.00);
      expect(cachedEarnings.totalPayments).toBe(6);
    });

    test('should cache earnings by period', async () => {
      const riderId = testPayment.riderId.toString();
      const weeklyEarnings = { totalEarnings: 100.00, period: 'week' };
      const monthlyEarnings = { totalEarnings: 400.00, period: 'month' };

      // Set earnings for different periods
      await cacheStrategies.setRiderEarnings(riderId, weeklyEarnings, 'week');
      await cacheStrategies.setRiderEarnings(riderId, monthlyEarnings, 'month');

      // Get earnings by period
      const cachedWeekly = await cacheStrategies.getRiderEarnings(riderId, 'week');
      const cachedMonthly = await cacheStrategies.getRiderEarnings(riderId, 'month');

      expect(cachedWeekly.totalEarnings).toBe(100.00);
      expect(cachedMonthly.totalEarnings).toBe(400.00);
    });
  });

  describe('CacheStrategies Notifications', () => {
    let testNotification;

    beforeEach(async () => {
      testNotification = await TestFactories.createNotification(testUser._id);
    });

    test('should cache user notifications', async () => {
      const userId = testUser._id.toString();
      const notifications = [testNotification];
      const filters = { isRead: false };

      // Set notifications
      await cacheStrategies.setUserNotifications(userId, notifications, filters);

      // Get notifications
      const cachedNotifications = await cacheStrategies.getUserNotifications(userId, filters);
      expect(cachedNotifications).toHaveLength(1);
      expect(cachedNotifications[0]._id).toBe(testNotification._id);
    });

    test('should cache unread notification count', async () => {
      const userId = testUser._id.toString();
      const count = 5;

      // Set count
      await cacheStrategies.setUnreadNotificationCount(userId, count);

      // Get count
      const cachedCount = await cacheStrategies.getUnreadNotificationCount(userId);
      expect(cachedCount).toBe(5);
    });

    test('should invalidate user notifications', async () => {
      const userId = testUser._id.toString();
      const notifications = [testNotification];

      // Set notifications and count
      await cacheStrategies.setUserNotifications(userId, notifications);
      await cacheStrategies.setUnreadNotificationCount(userId, 1);

      // Verify caches exist
      expect(await cacheStrategies.getUserNotifications(userId)).not.toBeNull();
      expect(await cacheStrategies.getUnreadNotificationCount(userId)).not.toBeNull();

      // Invalidate notifications
      await cacheStrategies.invalidateUserNotifications(userId);

      // Verify caches are cleared
      expect(await cacheStrategies.getUserNotifications(userId)).toBeNull();
      expect(await cacheStrategies.getUnreadNotificationCount(userId)).toBeNull();
    });
  });

  describe('CacheStrategies Rate Limiting', () => {
    test('should implement rate limiting', async () => {
      const identifier = 'user:123';
      const window = 'hour';
      const limit = 5;
      const ttl = 3600;

      // First request
      const result1 = await cacheStrategies.incrementRateLimit(identifier, window, limit, ttl);
      expect(result1.current).toBe(1);
      expect(result1.remaining).toBe(4);

      // Second request
      const result2 = await cacheStrategies.incrementRateLimit(identifier, window, limit, ttl);
      expect(result2.current).toBe(2);
      expect(result2.remaining).toBe(3);

      // Multiple requests to reach limit
      await cacheStrategies.incrementRateLimit(identifier, window, limit, ttl);
      await cacheStrategies.incrementRateLimit(identifier, window, limit, ttl);
      const result5 = await cacheStrategies.incrementRateLimit(identifier, window, limit, ttl);
      
      expect(result5.current).toBe(5);
      expect(result5.remaining).toBe(0);

      // Exceed limit
      const result6 = await cacheStrategies.incrementRateLimit(identifier, window, limit, ttl);
      expect(result6.current).toBe(6);
      expect(result6.remaining).toBe(0);
    });
  });

  describe('CacheStrategies Analytics', () => {
    test('should cache analytics data', async () => {
      const type = 'platform';
      const period = '24h';
      const analyticsData = {
        totalUsers: 100,
        totalOffers: 50,
        totalPayments: 25,
        generatedAt: new Date()
      };

      // Set analytics
      await cacheStrategies.setAnalytics(type, analyticsData, period);

      // Get analytics
      const cachedAnalytics = await cacheStrategies.getAnalytics(type, period);
      expect(cachedAnalytics.totalUsers).toBe(100);
      expect(cachedAnalytics.totalOffers).toBe(50);
    });

    test('should invalidate analytics by type', async () => {
      const type = 'platform';
      const data = { value: 'test' };

      // Set analytics for different periods
      await cacheStrategies.setAnalytics(type, data, '24h');
      await cacheStrategies.setAnalytics(type, data, '7d');
      await cacheStrategies.setAnalytics('other', data, '24h');

      // Verify caches exist
      expect(await cacheStrategies.getAnalytics(type, '24h')).not.toBeNull();
      expect(await cacheStrategies.getAnalytics(type, '7d')).not.toBeNull();
      expect(await cacheStrategies.getAnalytics('other', '24h')).not.toBeNull();

      // Invalidate specific type
      await cacheStrategies.invalidateAnalytics(type);

      // Verify type-specific caches are cleared
      expect(await cacheStrategies.getAnalytics(type, '24h')).toBeNull();
      expect(await cacheStrategies.getAnalytics(type, '7d')).toBeNull();
      
      // Other type should remain
      expect(await cacheStrategies.getAnalytics('other', '24h')).not.toBeNull();
    });
  });

  describe('Cache Performance Tests', () => {
    test('should handle high-volume cache operations', async () => {
      const operations = [];
      const numOperations = 100;

      // Create many cache operations
      for (let i = 0; i < numOperations; i++) {
        operations.push(
          cacheService.set(`perf:test:${i}`, { id: i, data: `test data ${i}` }, 300)
        );
      }

      // Execute all operations concurrently
      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      // All operations should succeed
      expect(results.every(result => result === true)).toBe(true);
      
      // Should complete within reasonable time (adjust based on your requirements)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // 5 seconds

      console.log(`Completed ${numOperations} cache operations in ${executionTime}ms`);
    });

    test('should handle concurrent cache access', async () => {
      const key = 'concurrent:test';
      const value = { shared: 'data' };

      // Set initial value
      await cacheService.set(key, value, 300);

      // Create concurrent read operations
      const readOperations = Array(50).fill().map(() => cacheService.get(key));

      const startTime = Date.now();
      const results = await Promise.all(readOperations);
      const endTime = Date.now();

      // All reads should return the same value
      results.forEach(result => {
        expect(result).toEqual(value);
      });

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // 1 second

      console.log(`Completed 50 concurrent reads in ${executionTime}ms`);
    });
  });

  describe('Cache Health and Statistics', () => {
    test('should provide cache health information', async () => {
      const health = await cacheStrategies.getCacheHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.connected).toBe(true);
      expect(health.latency).toBeDefined();
      expect(health.strategies).toBeDefined();
      expect(health.strategies.totalStrategies).toBeGreaterThan(0);
    });

    test('should provide cache statistics', async () => {
      // Set some test data
      await cacheService.set('stats:test1', 'value1', 300);
      await cacheService.set('stats:test2', 'value2', 300);

      const stats = await cacheService.getStats();
      
      expect(stats.connected).toBe(true);
      expect(stats.memory).toBeDefined();
      expect(stats.keyspace).toBeDefined();
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('Cache Warm-up', () => {
    test('should warm up user cache', async () => {
      const userId = testUser._id.toString();
      const role = testUser.role;

      // Warm up cache
      await cacheStrategies.warmUpCache(userId, role);

      // Verify cache is populated
      const cachedProfile = await cacheStrategies.getUserProfile(userId);
      const cachedAuth = await cacheStrategies.getUserAuth(testUser.email);

      expect(cachedProfile).not.toBeNull();
      expect(cachedProfile.businessName).toBe(testUser.profile.businessName);
      
      expect(cachedAuth).not.toBeNull();
      expect(cachedAuth.email).toBe(testUser.email);
    });
  });

  describe('Bulk Cache Operations', () => {
    test('should handle bulk user data invalidation', async () => {
      const userId = testUser._id.toString();
      const role = testUser.role;

      // Set various user-related caches
      await cacheStrategies.setUserProfile(userId, testUser.getProfileData());
      await cacheStrategies.setUserAuth(testUser.email, { email: testUser.email });
      await cacheStrategies.setUserStats(userId, 'deliveries', { count: 10 });

      // Verify caches exist
      expect(await cacheStrategies.getUserProfile(userId)).not.toBeNull();
      expect(await cacheStrategies.getUserAuth(testUser.email)).not.toBeNull();
      expect(await cacheStrategies.getUserStats(userId, 'deliveries')).not.toBeNull();

      // Bulk invalidate user data
      const deletedCount = await cacheStrategies.invalidateUserData(userId, role);
      expect(deletedCount).toBeGreaterThan(0);

      // Verify caches are cleared
      expect(await cacheStrategies.getUserProfile(userId)).toBeNull();
      expect(await cacheStrategies.getUserStats(userId, 'deliveries')).toBeNull();
    });
  });
});