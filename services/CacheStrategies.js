/**
 * Cache Strategies
 * Implements specific caching strategies for different data types with intelligent invalidation
 */

const { cacheService } = require('./CacheService');

/**
 * Cache Strategies Manager
 * Provides high-level caching methods for specific data types
 */
class CacheStrategies {
  constructor() {
    this.cache = cacheService;
    
    // Cache TTL configurations (in seconds)
    this.ttl = {
      user: 1800,        // 30 minutes
      userProfile: 3600, // 1 hour
      offer: 300,        // 5 minutes
      nearbyOffers: 180, // 3 minutes
      payment: 1800,     // 30 minutes
      earnings: 900,     // 15 minutes
      notification: 600, // 10 minutes
      analytics: 1800,   // 30 minutes
      session: 86400,    // 24 hours
      rateLimit: 3600    // 1 hour
    };
  }

  /**
   * User Profile Caching
   */
  async getUserProfile(userId) {
    const key = `user:profile:${userId}`;
    return await this.cache.get(key);
  }

  async setUserProfile(userId, profile) {
    const key = `user:profile:${userId}`;
    return await this.cache.set(key, profile, this.ttl.userProfile);
  }

  async invalidateUserProfile(userId) {
    const keys = [
      `user:profile:${userId}`,
      `user:${userId}`,
      `user:auth:${userId}`
    ];
    return await this.cache.delMultiple(keys);
  }

  /**
   * User Authentication Caching
   */
  async getUserAuth(email) {
    const key = `user:auth:email:${email}`;
    return await this.cache.get(key);
  }

  async setUserAuth(email, userData) {
    const key = `user:auth:email:${email}`;
    return await this.cache.set(key, userData, this.ttl.user);
  }

  async invalidateUserAuth(email, userId = null) {
    const keys = [`user:auth:email:${email}`];
    if (userId) {
      keys.push(`user:auth:${userId}`);
    }
    return await this.cache.delMultiple(keys);
  }

  /**
   * Offer Caching
   */
  async getOffer(offerId) {
    const key = `offer:${offerId}`;
    return await this.cache.get(key);
  }

  async setOffer(offerId, offer) {
    const key = `offer:${offerId}`;
    return await this.cache.set(key, offer, this.ttl.offer);
  }

  async invalidateOffer(offerId, businessId = null, riderId = null) {
    const keys = [`offer:${offerId}`];
    
    // Invalidate related caches
    if (businessId) {
      keys.push(`business:offers:${businessId}`);
      keys.push(`business:stats:${businessId}`);
    }
    
    if (riderId) {
      keys.push(`rider:offers:${riderId}`);
      keys.push(`rider:stats:${riderId}`);
    }

    // Clear nearby offers cache (pattern-based)
    await this.cache.clearPattern('offers:nearby:*');
    
    return await this.cache.delMultiple(keys);
  }

  /**
   * Nearby Offers Caching
   */
  async getNearbyOffers(lat, lng, radius, filters = {}) {
    const filterHash = this.hashFilters(filters);
    const key = `offers:nearby:${lat}:${lng}:${radius}:${filterHash}`;
    return await this.cache.get(key);
  }

  async setNearbyOffers(lat, lng, radius, filters, offers) {
    const filterHash = this.hashFilters(filters);
    const key = `offers:nearby:${lat}:${lng}:${radius}:${filterHash}`;
    return await this.cache.set(key, offers, this.ttl.nearbyOffers);
  }

  /**
   * Business Offers Caching
   */
  async getBusinessOffers(businessId, status = null) {
    const key = status ? 
      `business:offers:${businessId}:${status}` : 
      `business:offers:${businessId}`;
    return await this.cache.get(key);
  }

  async setBusinessOffers(businessId, offers, status = null) {
    const key = status ? 
      `business:offers:${businessId}:${status}` : 
      `business:offers:${businessId}`;
    return await this.cache.set(key, offers, this.ttl.offer);
  }

  async invalidateBusinessOffers(businessId) {
    return await this.cache.clearPattern(`business:offers:${businessId}*`);
  }

  /**
   * Rider Offers Caching
   */
  async getRiderOffers(riderId, status = null) {
    const key = status ? 
      `rider:offers:${riderId}:${status}` : 
      `rider:offers:${riderId}`;
    return await this.cache.get(key);
  }

  async setRiderOffers(riderId, offers, status = null) {
    const key = status ? 
      `rider:offers:${riderId}:${status}` : 
      `rider:offers:${riderId}`;
    return await this.cache.set(key, offers, this.ttl.offer);
  }

  async invalidateRiderOffers(riderId) {
    return await this.cache.clearPattern(`rider:offers:${riderId}*`);
  }

  /**
   * Payment Caching
   */
  async getPayment(paymentId) {
    const key = `payment:${paymentId}`;
    return await this.cache.get(key);
  }

  async setPayment(paymentId, payment) {
    const key = `payment:${paymentId}`;
    return await this.cache.set(key, payment, this.ttl.payment);
  }

  async invalidatePayment(paymentId, businessId = null, riderId = null) {
    const keys = [`payment:${paymentId}`];
    
    if (businessId) {
      keys.push(`business:payments:${businessId}`);
      keys.push(`business:earnings:${businessId}`);
    }
    
    if (riderId) {
      keys.push(`rider:payments:${riderId}`);
      keys.push(`rider:earnings:${riderId}`);
    }

    return await this.cache.delMultiple(keys);
  }

  /**
   * Earnings Caching
   */
  async getRiderEarnings(riderId, period = 'all') {
    const key = `rider:earnings:${riderId}:${period}`;
    return await this.cache.get(key);
  }

  async setRiderEarnings(riderId, earnings, period = 'all') {
    const key = `rider:earnings:${riderId}:${period}`;
    return await this.cache.set(key, earnings, this.ttl.earnings);
  }

  async invalidateRiderEarnings(riderId) {
    return await this.cache.clearPattern(`rider:earnings:${riderId}*`);
  }

  /**
   * Business Earnings Caching
   */
  async getBusinessEarnings(businessId, period = 'all') {
    const key = `business:earnings:${businessId}:${period}`;
    return await this.cache.get(key);
  }

  async setBusinessEarnings(businessId, earnings, period = 'all') {
    const key = `business:earnings:${businessId}:${period}`;
    return await this.cache.set(key, earnings, this.ttl.earnings);
  }

  async invalidateBusinessEarnings(businessId) {
    return await this.cache.clearPattern(`business:earnings:${businessId}*`);
  }

  /**
   * Notification Caching
   */
  async getUserNotifications(userId, filters = {}) {
    const filterHash = this.hashFilters(filters);
    const key = `notifications:${userId}:${filterHash}`;
    return await this.cache.get(key);
  }

  async setUserNotifications(userId, notifications, filters = {}) {
    const filterHash = this.hashFilters(filters);
    const key = `notifications:${userId}:${filterHash}`;
    return await this.cache.set(key, notifications, this.ttl.notification);
  }

  async getUnreadNotificationCount(userId) {
    const key = `notifications:unread:${userId}`;
    return await this.cache.get(key);
  }

  async setUnreadNotificationCount(userId, count) {
    const key = `notifications:unread:${userId}`;
    return await this.cache.set(key, count, this.ttl.notification);
  }

  async invalidateUserNotifications(userId) {
    return await this.cache.clearPattern(`notifications:*:${userId}*`);
  }

  /**
   * Analytics Caching
   */
  async getAnalytics(type, period = '24h') {
    const key = `analytics:${type}:${period}`;
    return await this.cache.get(key);
  }

  async setAnalytics(type, data, period = '24h') {
    const key = `analytics:${type}:${period}`;
    return await this.cache.set(key, data, this.ttl.analytics);
  }

  async invalidateAnalytics(type = null) {
    const pattern = type ? `analytics:${type}:*` : 'analytics:*';
    return await this.cache.clearPattern(pattern);
  }

  /**
   * Session Caching
   */
  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.cache.get(key);
  }

  async setSession(sessionId, sessionData) {
    const key = `session:${sessionId}`;
    return await this.cache.set(key, sessionData, this.ttl.session);
  }

  async invalidateSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.cache.del(key);
  }

  /**
   * Rate Limiting
   */
  async getRateLimit(identifier, window) {
    const key = `ratelimit:${identifier}:${window}`;
    return await this.cache.get(key);
  }

  async incrementRateLimit(identifier, window, limit, ttl) {
    const key = `ratelimit:${identifier}:${window}`;
    const current = await this.cache.incr(key);
    
    if (current === 1) {
      // Set TTL on first increment
      await this.cache.expire(key, ttl);
    }
    
    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      resetTime: Date.now() + (ttl * 1000)
    };
  }

  /**
   * Available Riders Caching
   */
  async getAvailableRiders(lat, lng, radius) {
    const key = `riders:available:${lat}:${lng}:${radius}`;
    return await this.cache.get(key);
  }

  async setAvailableRiders(lat, lng, radius, riders) {
    const key = `riders:available:${lat}:${lng}:${radius}`;
    return await this.cache.set(key, riders, 300); // 5 minutes TTL
  }

  async invalidateAvailableRiders() {
    return await this.cache.clearPattern('riders:available:*');
  }

  /**
   * User Statistics Caching
   */
  async getUserStats(userId, type) {
    const key = `stats:${type}:${userId}`;
    return await this.cache.get(key);
  }

  async setUserStats(userId, type, stats) {
    const key = `stats:${type}:${userId}`;
    return await this.cache.set(key, stats, this.ttl.analytics);
  }

  async invalidateUserStats(userId, type = null) {
    const pattern = type ? `stats:${type}:${userId}` : `stats:*:${userId}`;
    return await this.cache.clearPattern(pattern);
  }

  /**
   * Utility Methods
   */
  hashFilters(filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return 'default';
    }
    
    // Create a consistent hash from filters
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key];
        return result;
      }, {});
    
    return Buffer.from(JSON.stringify(sortedFilters)).toString('base64').slice(0, 16);
  }

  /**
   * Bulk invalidation for user-related data
   */
  async invalidateUserData(userId, role) {
    const patterns = [
      `user:*:${userId}*`,
      `${role}:*:${userId}*`,
      `stats:*:${userId}*`,
      `notifications:*:${userId}*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.cache.clearPattern(pattern);
    }

    return totalDeleted;
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(userId, role) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (user) {
        // Cache user profile
        await this.setUserProfile(userId, user.getProfileData());
        
        // Cache user authentication data
        await this.setUserAuth(user.email, {
          _id: user._id,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        });

        console.log(`Cache warmed up for ${role} user: ${userId}`);
      }
    } catch (error) {
      console.error('Cache warm-up error:', error);
    }
  }

  /**
   * Get cache health and statistics
   */
  async getCacheHealth() {
    const health = await this.cache.healthCheck();
    const stats = await this.cache.getStats();
    
    return {
      ...health,
      stats,
      strategies: {
        ttlConfig: this.ttl,
        totalStrategies: Object.keys(this.ttl).length
      }
    };
  }
}

// Create singleton instance
const cacheStrategies = new CacheStrategies();

module.exports = {
  CacheStrategies,
  cacheStrategies
};