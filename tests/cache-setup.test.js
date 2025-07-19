/**
 * Cache Setup Tests
 * Tests that verify caching infrastructure is properly configured
 * These tests don't require Redis to be running
 */

const { CacheService } = require('../services/CacheService');
const { CacheStrategies } = require('../services/CacheStrategies');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

describe('Cache Setup Tests', () => {
  describe('Cache Service Configuration', () => {
    test('should create CacheService with default configuration', () => {
      const cacheService = new CacheService();
      
      expect(cacheService).toBeDefined();
      expect(cacheService.defaultTTL).toBe(3600);
      expect(cacheService.keyPrefix).toBe('lastmile:');
      expect(cacheService.options.host).toBe('localhost');
      expect(cacheService.options.port).toBe(6379);
    });

    test('should create CacheService with custom configuration', () => {
      const customOptions = {
        defaultTTL: 1800,
        keyPrefix: 'test:',
        host: 'redis.example.com',
        port: 6380
      };

      const cacheService = new CacheService(customOptions);
      
      expect(cacheService.defaultTTL).toBe(1800);
      expect(cacheService.keyPrefix).toBe('test:');
      expect(cacheService.options.host).toBe('redis.example.com');
      expect(cacheService.options.port).toBe(6380);
    });

    test('should generate cache keys with prefix', () => {
      const cacheService = new CacheService({ keyPrefix: 'test:' });
      
      const key = cacheService.generateKey('user:123');
      expect(key).toBe('test:user:123');
    });
  });

  describe('Cache Strategies Configuration', () => {
    test('should create CacheStrategies with TTL configuration', () => {
      const cacheStrategies = new CacheStrategies();
      
      expect(cacheStrategies).toBeDefined();
      expect(cacheStrategies.ttl).toBeDefined();
      expect(cacheStrategies.ttl.user).toBe(1800);
      expect(cacheStrategies.ttl.offer).toBe(300);
      expect(cacheStrategies.ttl.nearbyOffers).toBe(180);
      expect(cacheStrategies.ttl.payment).toBe(1800);
      expect(cacheStrategies.ttl.earnings).toBe(900);
    });

    test('should have hash filters utility', () => {
      const cacheStrategies = new CacheStrategies();
      
      // Test with empty filters
      const emptyHash = cacheStrategies.hashFilters({});
      expect(emptyHash).toBe('default');
      
      // Test with filters
      const filters = { minPayment: 20, maxPayment: 50, packageType: 'document' };
      const hash = cacheStrategies.hashFilters(filters);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      
      // Same filters should produce same hash
      const hash2 = cacheStrategies.hashFilters(filters);
      expect(hash).toBe(hash2);
      
      // Different filters should produce different hash
      const differentFilters = { vehicleType: 'car', sortBy: 'payment' };
      const differentHash = cacheStrategies.hashFilters(differentFilters);
      expect(differentHash).not.toBe(hash);
    });
  });

  describe('Cache Middleware Configuration', () => {
    test('should have cache middleware functions', () => {
      expect(cacheMiddleware).toBeDefined();
      expect(typeof cacheMiddleware.userProfile).toBe('function');
      expect(typeof cacheMiddleware.userOffers).toBe('function');
      expect(typeof cacheMiddleware.nearbyOffers).toBe('function');
      expect(typeof cacheMiddleware.earnings).toBe('function');
      expect(typeof cacheMiddleware.notifications).toBe('function');
      expect(typeof cacheMiddleware.analytics).toBe('function');
    });

    test('should have cache invalidation middleware', () => {
      expect(typeof cacheMiddleware.invalidateUser).toBe('function');
      expect(typeof cacheMiddleware.invalidateOffers).toBe('function');
      expect(typeof cacheMiddleware.invalidatePayments).toBe('function');
      expect(typeof cacheMiddleware.invalidateNotifications).toBe('function');
      expect(typeof cacheMiddleware.invalidateUserAndOffers).toBe('function');
      expect(typeof cacheMiddleware.invalidateOffersAndPayments).toBe('function');
    });

    test('should have cache key generators', () => {
      const { cacheKeyGenerators } = require('../middleware/cacheMiddleware');
      
      expect(cacheKeyGenerators).toBeDefined();
      expect(typeof cacheKeyGenerators.userProfile).toBe('function');
      expect(typeof cacheKeyGenerators.userOffers).toBe('function');
      expect(typeof cacheKeyGenerators.nearbyOffers).toBe('function');
      expect(typeof cacheKeyGenerators.userEarnings).toBe('function');
      expect(typeof cacheKeyGenerators.userNotifications).toBe('function');
      expect(typeof cacheKeyGenerators.analytics).toBe('function');
    });

    test('should generate correct cache keys', () => {
      const { cacheKeyGenerators } = require('../middleware/cacheMiddleware');
      
      // Test user profile key
      const userReq = { user: { id: 'user123' } };
      const userKey = cacheKeyGenerators.userProfile(userReq);
      expect(userKey).toBe('user:profile:user123');
      
      // Test user offers key
      const offersReq = { 
        user: { id: 'user123', role: 'business' },
        query: { status: 'active', page: '2' }
      };
      const offersKey = cacheKeyGenerators.userOffers(offersReq);
      expect(offersKey).toBe('business:offers:user123:active:page:2');
      
      // Test nearby offers key
      const nearbyReq = {
        query: { 
          lat: '37.7749', 
          lng: '-122.4194', 
          maxDistance: '5000',
          minPayment: '20'
        }
      };
      const nearbyKey = cacheKeyGenerators.nearbyOffers(nearbyReq);
      expect(nearbyKey).toContain('offers:nearby:37.7749:-122.4194:5000:');
      
      // Test earnings key
      const earningsReq = {
        user: { id: 'rider123', role: 'rider' },
        query: { period: 'month' }
      };
      const earningsKey = cacheKeyGenerators.userEarnings(earningsReq);
      expect(earningsKey).toBe('rider:earnings:rider123:month');
    });
  });

  describe('Cache Integration Points', () => {
    test('should have cache service integrated in server setup', () => {
      // Check that cache service is imported in server.js
      const fs = require('fs');
      const serverContent = fs.readFileSync('server.js', 'utf8');
      
      expect(serverContent).toContain('cacheStrategies');
      expect(serverContent).toContain('warmCache');
    });

    test('should have cache middleware integrated in routes', () => {
      const fs = require('fs');
      
      // Check offer routes
      const offerRoutes = fs.readFileSync('routes/offer.js', 'utf8');
      expect(offerRoutes).toContain('cacheStrategies');
      expect(offerRoutes).toContain('cacheMiddleware');
      
      // Check earnings routes
      const earningsRoutes = fs.readFileSync('routes/earnings.js', 'utf8');
      expect(earningsRoutes).toContain('cacheMiddleware');
      
      // Check auth routes
      const authRoutes = fs.readFileSync('routes/auth.js', 'utf8');
      expect(authRoutes).toContain('cacheStrategies');
    });

    test('should have environment variables for Redis configuration', () => {
      // These would be set in production
      const expectedEnvVars = [
        'REDIS_HOST',
        'REDIS_PORT', 
        'REDIS_PASSWORD',
        'REDIS_DB'
      ];
      
      // In test environment, these might not be set, but the code should handle defaults
      const cacheService = new CacheService();
      expect(cacheService.options.host).toBeDefined();
      expect(cacheService.options.port).toBeDefined();
    });
  });

  describe('Cache Error Handling', () => {
    test('should handle cache service errors gracefully', async () => {
      const cacheService = new CacheService();
      
      // These operations should not throw errors even when Redis is not available
      const setResult = await cacheService.set('test:key', 'test value');
      expect(typeof setResult).toBe('boolean');
      
      const getValue = await cacheService.get('test:key');
      expect(getValue === null || typeof getValue === 'string').toBe(true);
      
      const delResult = await cacheService.del('test:key');
      expect(typeof delResult).toBe('boolean');
    });

    test('should handle cache strategies errors gracefully', async () => {
      const cacheStrategies = new CacheStrategies();
      
      // These operations should not throw errors even when Redis is not available
      const userProfile = await cacheStrategies.getUserProfile('user123');
      expect(userProfile === null || typeof userProfile === 'object').toBe(true);
      
      const setResult = await cacheStrategies.setUserProfile('user123', { name: 'Test' });
      expect(typeof setResult).toBe('boolean');
      
      const invalidateResult = await cacheStrategies.invalidateUserProfile('user123');
      expect(typeof invalidateResult).toBe('number');
    });
  });

  describe('Cache Performance Configuration', () => {
    test('should have appropriate TTL values for different data types', () => {
      const cacheStrategies = new CacheStrategies();
      
      // Fast-changing data should have shorter TTL
      expect(cacheStrategies.ttl.nearbyOffers).toBeLessThan(cacheStrategies.ttl.user);
      expect(cacheStrategies.ttl.offer).toBeLessThan(cacheStrategies.ttl.userProfile);
      
      // User data can be cached longer
      expect(cacheStrategies.ttl.userProfile).toBeGreaterThan(cacheStrategies.ttl.offer);
      
      // Session data should have longest TTL
      expect(cacheStrategies.ttl.session).toBeGreaterThan(cacheStrategies.ttl.userProfile);
    });

    test('should have Redis connection options optimized for performance', () => {
      const cacheService = new CacheService();
      
      expect(cacheService.options.retryDelayOnFailover).toBe(100);
      expect(cacheService.options.maxRetriesPerRequest).toBe(3);
      expect(cacheService.options.lazyConnect).toBe(true);
    });
  });
});