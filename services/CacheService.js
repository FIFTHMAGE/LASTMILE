/**
 * Redis Cache Service
 * Provides comprehensive caching functionality with intelligent invalidation strategies
 */

const Redis = require('ioredis');

/**
 * Cache Service for managing Redis operations
 */
class CacheService {
  constructor(options = {}) {
    this.redis = null;
    this.isConnected = false;
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour default
    this.keyPrefix = options.keyPrefix || 'lastmile:';
    
    // Use REDIS_URL if available (Heroku), otherwise use individual options
    if (process.env.REDIS_URL) {
      this.options = {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        // Handle SSL for Heroku Redis
        tls: process.env.REDIS_URL.startsWith('rediss://') ? {
          rejectUnauthorized: false
        } : undefined,
        ...options
      };
      this.redisUrl = process.env.REDIS_URL;
    } else {
      this.options = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        ...options
      };
      this.redisUrl = null;
    }
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      if (this.isConnected) {
        return this.redis;
      }

      // Use Redis URL if available (Heroku), otherwise use options
      if (this.redisUrl) {
        this.redis = new Redis(this.redisUrl, this.options);
      } else {
        this.redis = new Redis(this.options);
      }

      // Handle connection events
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('📡 Redis connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.redis.ping();
      this.isConnected = true;

      return this.redis;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.redis) {
      await this.redis.quit();
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with prefix
   */
  generateKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Set cache value with TTL
   */
  async set(key, value, ttl = null) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      const serializedValue = JSON.stringify(value);
      const cacheTTL = ttl || this.defaultTTL;

      await this.redis.setex(cacheKey, cacheTTL, serializedValue);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue === null) {
        return null;
      }

      return JSON.parse(cachedValue);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      const result = await this.redis.del(cacheKey);
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple cache keys
   */
  async delMultiple(keys) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKeys = keys.map(key => this.generateKey(key));
      const result = await this.redis.del(...cacheKeys);
      return result;
    } catch (error) {
      console.error('Cache delete multiple error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key, ttl) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      const result = await this.redis.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      console.error(`Cache TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment counter
   */
  async incr(key, amount = 1) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      return await this.redis.incrby(cacheKey, amount);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const searchPattern = this.generateKey(pattern);
      return await this.redis.keys(searchPattern);
    } catch (error) {
      console.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * Clear all cache keys matching pattern
   */
  async clearPattern(pattern) {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        // Remove prefix from keys for deletion
        const keysToDelete = keys.map(key => key.replace(this.keyPrefix, ''));
        return await this.delMultiple(keysToDelete);
      }
      return 0;
    } catch (error) {
      console.error(`Cache clear pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        connected: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Parse Redis INFO command output
   */
  parseRedisInfo(info) {
    const result = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(value) ? value : Number(value);
      }
    }
    
    return result;
  }

  /**
   * Cache with fallback function
   */
  async getOrSet(key, fallbackFn, ttl = null) {
    try {
      // Try to get from cache first
      const cachedValue = await this.get(key);
      if (cachedValue !== null) {
        return cachedValue;
      }

      // If not in cache, execute fallback function
      const value = await fallbackFn();
      
      // Cache the result
      await this.set(key, value, ttl);
      
      return value;
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error);
      // If caching fails, still return the fallback result
      return await fallbackFn();
    }
  }

  /**
   * Batch get multiple keys
   */
  async mget(keys) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKeys = keys.map(key => this.generateKey(key));
      const values = await this.redis.mget(...cacheKeys);
      
      const result = {};
      keys.forEach((key, index) => {
        const value = values[index];
        result[key] = value ? JSON.parse(value) : null;
      });

      return result;
    } catch (error) {
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset(keyValuePairs, ttl = null) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const pipeline = this.redis.pipeline();
      const cacheTTL = ttl || this.defaultTTL;

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const cacheKey = this.generateKey(key);
        const serializedValue = JSON.stringify(value);
        pipeline.setex(cacheKey, cacheTTL, serializedValue);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  /**
   * Add to set
   */
  async sadd(key, ...members) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      return await this.redis.sadd(cacheKey, ...members);
    } catch (error) {
      console.error(`Cache sadd error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get set members
   */
  async smembers(key) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      return await this.redis.smembers(cacheKey);
    } catch (error) {
      console.error(`Cache smembers error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove from set
   */
  async srem(key, ...members) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const cacheKey = this.generateKey(key);
      return await this.redis.srem(cacheKey, ...members);
    } catch (error) {
      console.error(`Cache srem error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        connected: true,
        latency: `${latency}ms`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = {
  CacheService,
  cacheService
};