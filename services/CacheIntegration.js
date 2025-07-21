/**
 * Cache Integration Service
 * Provides enhanced caching integration for frequently accessed data
 */

const { cacheStrategies } = require('./CacheStrategies');
const { cacheService } = require('./CacheService');

/**
 * Cache Integration Manager
 * Provides high-level caching integration for the delivery platform
 */
class CacheIntegration {
  constructor() {
    this.cache = cacheService;
    this.strategies = cacheStrategies;
    
    // Performance tracking
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0
    };
  }

  /**
   * Batch cache warming for frequently accessed data
   */
  async warmUpFrequentData() {
    try {
      console.log('Starting cache warm-up...');
      
      // Check if database is connected first
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.log('Database not connected, skipping cache warm-up');
        return;
      }

      // Warm up active users (with error handling)
      try {
        const User = require('../models/User');
        const activeUsers = await User.find({ 
          $or: [
            { 'profile.isAvailable': true },
            { updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
          ]
        }).limit(10); // Reduced limit for initial warm-up
        
        for (const user of activeUsers) {
          try {
            const profile = user.getProfileData ? user.getProfileData() : user.toObject();
            await this.strategies.setUserProfile(user._id.toString(), profile);
          } catch (userError) {
            console.warn('User profile cache error:', userError.message);
          }
        }
        
        console.log(`Cache warm-up completed: ${activeUsers.length} users cached`);
      } catch (userError) {
        console.warn('User warm-up failed:', userError.message);
      }

      // Warm up recent offers (with error handling)
      try {
        const Offer = require('../models/Offer');
        const recentOffers = await Offer.find({ 
          status: 'open',
          createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
        }).limit(10); // Reduced limit
        
        for (const offer of recentOffers) {
          try {
            await this.strategies.setOffer(offer._id.toString(), offer.toObject());
          } catch (offerError) {
            console.warn('Offer cache error:', offerError.message);
          }
        }
        
        console.log(`Cache warm-up completed: ${recentOffers.length} offers cached`);
      } catch (offerError) {
        console.warn('Offer warm-up failed:', offerError.message);
      }
      
    } catch (error) {
      console.error('Cache warm-up error:', error.message);
    }
  }

  /**
   * Cache performance monitoring
   */
  getPerformanceStats() {
    const hitRate = this.stats.totalRequests > 0 ? 
      (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      errorRate: this.stats.totalRequests > 0 ? 
        (this.stats.errors / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Health check for cache integration
   */
  async healthCheck() {
    try {
      const cacheHealth = await this.cache.healthCheck();
      const stats = this.getPerformanceStats();
      
      return {
        status: cacheHealth.status,
        cache: cacheHealth,
        performance: stats,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Create singleton instance
const cacheIntegration = new CacheIntegration();

module.exports = {
  CacheIntegration,
  cacheIntegration
};