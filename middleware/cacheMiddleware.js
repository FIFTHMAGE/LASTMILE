/**
 * Cache Middleware
 * Provides automatic caching and cache invalidation for API endpoints
 */

const { cacheStrategies } = require('../services/CacheStrategies');

/**
 * Cache response middleware
 * Automatically caches GET responses based on route patterns
 */
const cacheResponse = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator ? 
        keyGenerator(req) : 
        `route:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

      // Try to get from cache
      const cachedResponse = await cacheStrategies.cache.get(cacheKey);
      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        // Cache the response
        cacheStrategies.cache.set(cacheKey, data, ttl).catch(err => {
          console.error('Cache set error:', err);
        });

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Automatically invalidates related caches after data modifications
 */
const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to trigger cache invalidation
    const invalidateAfterResponse = async () => {
      try {
        for (const pattern of patterns) {
          if (typeof pattern === 'function') {
            await pattern(req, res);
          } else {
            await cacheStrategies.cache.clearPattern(pattern);
          }
        }
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    };

    res.json = function(data) {
      const result = originalJson.call(this, data);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateAfterResponse();
      }
      return result;
    };

    res.send = function(data) {
      const result = originalSend.call(this, data);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateAfterResponse();
      }
      return result;
    };

    next();
  };
};

/**
 * User-specific cache invalidation
 */
const invalidateUserCache = async (req, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  
  if (userId) {
    await cacheStrategies.invalidateUserData(userId, userRole);
  }
};

/**
 * Offer-specific cache invalidation
 */
const invalidateOfferCache = async (req, res) => {
  const userId = req.user?.id;
  const offerId = req.params?.id;
  
  if (userId) {
    // Invalidate user's offers
    if (req.user.role === 'business') {
      await cacheStrategies.invalidateBusinessOffers(userId);
    } else if (req.user.role === 'rider') {
      await cacheStrategies.invalidateRiderOffers(userId);
    }
    
    // Invalidate nearby offers
    await cacheStrategies.cache.clearPattern('offers:nearby:*');
    
    // Invalidate specific offer if ID is provided
    if (offerId) {
      await cacheStrategies.invalidateOffer(offerId, userId);
    }
  }
};

/**
 * Payment-specific cache invalidation
 */
const invalidatePaymentCache = async (req, res) => {
  const userId = req.user?.id;
  const paymentId = req.params?.id;
  
  if (userId) {
    // Invalidate earnings caches
    if (req.user.role === 'business') {
      await cacheStrategies.invalidateBusinessEarnings(userId);
    } else if (req.user.role === 'rider') {
      await cacheStrategies.invalidateRiderEarnings(userId);
    }
    
    // Invalidate specific payment if ID is provided
    if (paymentId) {
      await cacheStrategies.invalidatePayment(paymentId, userId);
    }
  }
};

/**
 * Notification-specific cache invalidation
 */
const invalidateNotificationCache = async (req, res) => {
  const userId = req.user?.id;
  
  if (userId) {
    await cacheStrategies.invalidateUserNotifications(userId);
  }
};

/**
 * Cache key generators for common patterns
 */
const cacheKeyGenerators = {
  userProfile: (req) => `user:profile:${req.user.id}`,
  
  userOffers: (req) => {
    const { status, page = 1 } = req.query;
    return `${req.user.role}:offers:${req.user.id}:${status || 'all'}:page:${page}`;
  },
  
  nearbyOffers: (req) => {
    const { lat, lng, maxDistance, ...filters } = req.query;
    const filterHash = cacheStrategies.hashFilters(filters);
    return `offers:nearby:${lat}:${lng}:${maxDistance}:${filterHash}`;
  },
  
  userEarnings: (req) => {
    const { period = 'all' } = req.query;
    return `${req.user.role}:earnings:${req.user.id}:${period}`;
  },
  
  userNotifications: (req) => {
    const { isRead, type } = req.query;
    const filterHash = cacheStrategies.hashFilters({ isRead, type });
    return `notifications:${req.user.id}:${filterHash}`;
  },
  
  analytics: (req) => {
    const { type, period = '24h' } = req.query;
    return `analytics:${type}:${period}`;
  }
};

/**
 * Pre-configured cache middleware for common use cases
 */
const cacheMiddleware = {
  // Cache user profile data for 30 minutes
  userProfile: cacheResponse(1800, cacheKeyGenerators.userProfile),
  
  // Cache user offers for 5 minutes
  userOffers: cacheResponse(300, cacheKeyGenerators.userOffers),
  
  // Cache nearby offers for 3 minutes
  nearbyOffers: cacheResponse(180, cacheKeyGenerators.nearbyOffers),
  
  // Cache earnings for 15 minutes
  earnings: cacheResponse(900, cacheKeyGenerators.userEarnings),
  
  // Cache notifications for 10 minutes
  notifications: cacheResponse(600, cacheKeyGenerators.userNotifications),
  
  // Cache analytics for 30 minutes
  analytics: cacheResponse(1800, cacheKeyGenerators.analytics),
  
  // Cache invalidation patterns
  invalidateUser: invalidateCache([invalidateUserCache]),
  invalidateOffers: invalidateCache([invalidateOfferCache]),
  invalidatePayments: invalidateCache([invalidatePaymentCache]),
  invalidateNotifications: invalidateCache([invalidateNotificationCache]),
  
  // Combined invalidation for complex operations
  invalidateUserAndOffers: invalidateCache([invalidateUserCache, invalidateOfferCache]),
  invalidateOffersAndPayments: invalidateCache([invalidateOfferCache, invalidatePaymentCache])
};

/**
 * Cache warming middleware
 * Pre-loads frequently accessed data into cache
 */
const warmCache = async (req, res, next) => {
  try {
    if (req.user?.id && req.user?.role) {
      // Warm up user cache in background
      cacheStrategies.warmUpCache(req.user.id, req.user.role).catch(err => {
        console.error('Cache warm-up error:', err);
      });
    }
    next();
  } catch (error) {
    console.error('Cache warming middleware error:', error);
    next();
  }
};

/**
 * Cache health check middleware
 */
const cacheHealthCheck = async (req, res, next) => {
  try {
    const health = await cacheStrategies.getCacheHealth();
    req.cacheHealth = health;
    next();
  } catch (error) {
    console.error('Cache health check error:', error);
    req.cacheHealth = { status: 'unhealthy', error: error.message };
    next();
  }
};

module.exports = {
  cacheResponse,
  invalidateCache,
  cacheKeyGenerators,
  cacheMiddleware,
  warmCache,
  cacheHealthCheck,
  invalidateUserCache,
  invalidateOfferCache,
  invalidatePaymentCache,
  invalidateNotificationCache
};