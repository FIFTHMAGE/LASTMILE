const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { createError } = require('./errorHandler');

/**
 * Rate limiting configurations for different endpoint types
 */
const rateLimitConfigs = {
  // General API rate limiting
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_ERROR',
        statusCode: 429,
        retryAfter: 15 * 60 // 15 minutes in seconds
      }
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next) => {
      next(createError.rateLimit('Too many requests from this IP, please try again later'));
    }
  },

  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later',
        code: 'AUTH_RATE_LIMIT_ERROR',
        statusCode: 429,
        retryAfter: 15 * 60
      }
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res, next) => {
      next(createError.rateLimit('Too many authentication attempts, please try again later'));
    }
  },

  // Password reset (very restrictive)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
      success: false,
      error: {
        message: 'Too many password reset attempts, please try again in an hour',
        code: 'PASSWORD_RESET_RATE_LIMIT_ERROR',
        statusCode: 429,
        retryAfter: 60 * 60
      }
    },
    handler: (req, res, next) => {
      next(createError.rateLimit('Too many password reset attempts, please try again in an hour'));
    }
  },

  // File upload endpoints
  upload: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 uploads per windowMs
    message: {
      success: false,
      error: {
        message: 'Too many file uploads, please try again later',
        code: 'UPLOAD_RATE_LIMIT_ERROR',
        statusCode: 429,
        retryAfter: 15 * 60
      }
    },
    handler: (req, res, next) => {
      next(createError.rateLimit('Too many file uploads, please try again later'));
    }
  },

  // API creation endpoints (offers, etc.)
  creation: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 creation requests per windowMs
    message: {
      success: false,
      error: {
        message: 'Too many creation requests, please try again later',
        code: 'CREATION_RATE_LIMIT_ERROR',
        statusCode: 429,
        retryAfter: 15 * 60
      }
    },
    handler: (req, res, next) => {
      next(createError.rateLimit('Too many creation requests, please try again later'));
    }
  },

  // Location updates (more permissive for real-time tracking)
  location: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 location updates per minute
    message: {
      success: false,
      error: {
        message: 'Too many location updates, please slow down',
        code: 'LOCATION_RATE_LIMIT_ERROR',
        statusCode: 429,
        retryAfter: 60
      }
    },
    handler: (req, res, next) => {
      next(createError.rateLimit('Too many location updates, please slow down'));
    }
  }
};

/**
 * Speed limiting configurations (progressive delays)
 */
const speedLimitConfigs = {
  // General API speed limiting
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per windowMs without delay
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 10000, // Maximum delay of 10 seconds
    skipFailedRequests: true, // Don't count failed requests
    skipSuccessfulRequests: false // Count successful requests
  },

  // Authentication speed limiting
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 5, // Allow 5 requests per windowMs without delay
    delayMs: 1000, // Add 1 second delay per request after delayAfter
    maxDelayMs: 30000, // Maximum delay of 30 seconds
    skipFailedRequests: false, // Count failed requests
    skipSuccessfulRequests: true // Don't count successful requests
  }
};

/**
 * Create rate limiter instances
 */
const rateLimiters = {
  general: rateLimit(rateLimitConfigs.general),
  auth: rateLimit(rateLimitConfigs.auth),
  passwordReset: rateLimit(rateLimitConfigs.passwordReset),
  upload: rateLimit(rateLimitConfigs.upload),
  creation: rateLimit(rateLimitConfigs.creation),
  location: rateLimit(rateLimitConfigs.location)
};

/**
 * Create speed limiter instances
 */
const speedLimiters = {
  general: slowDown(speedLimitConfigs.general),
  auth: slowDown(speedLimitConfigs.auth)
};

/**
 * User-specific rate limiting (requires authentication)
 */
const createUserRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 1000,
    keyGenerator = (req) => req.user?.id || req.ip,
    message = 'Too many requests from this user'
  } = options;

  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    message: {
      success: false,
      error: {
        message,
        code: 'USER_RATE_LIMIT_ERROR',
        statusCode: 429,
        retryAfter: Math.floor(windowMs / 1000)
      }
    },
    handler: (req, res, next) => {
      next(createError.rateLimit(message));
    }
  });
};

/**
 * Role-based rate limiting
 */
const createRoleBasedRateLimit = (roleConfigs) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'anonymous';
    const config = roleConfigs[userRole] || roleConfigs.default;
    
    if (!config) {
      return next();
    }

    const limiter = rateLimit({
      ...config,
      keyGenerator: (req) => `${userRole}:${req.user?.id || req.ip}`,
      handler: (req, res, next) => {
        next(createError.rateLimit(config.message || 'Rate limit exceeded for your role'));
      }
    });

    limiter(req, res, next);
  };
};

/**
 * Endpoint-specific rate limiting
 */
const endpointRateLimits = {
  // Authentication endpoints
  '/api/auth/login': rateLimiters.auth,
  '/api/auth/register': rateLimiters.auth,
  '/api/auth/forgot-password': rateLimiters.passwordReset,
  '/api/auth/reset-password': rateLimiters.passwordReset,

  // Creation endpoints
  '/api/offers': rateLimiters.creation,
  '/api/notifications': rateLimiters.creation,

  // Location endpoints
  '/api/location': rateLimiters.location,
  '/api/delivery/*/location-update': rateLimiters.location,

  // Upload endpoints
  '/api/upload': rateLimiters.upload,
  '/api/*/upload': rateLimiters.upload
};

/**
 * Dynamic rate limiting based on request patterns
 */
const adaptiveRateLimit = () => {
  const requestCounts = new Map();
  const suspiciousIPs = new Set();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window

    // Clean old entries
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.timestamp > windowMs) {
        requestCounts.delete(key);
      }
    }

    // Track requests
    const key = `${ip}:${Math.floor(now / windowMs)}`;
    const current = requestCounts.get(key) || { count: 0, timestamp: now };
    current.count++;
    requestCounts.set(key, current);

    // Detect suspicious patterns
    if (current.count > 200) { // More than 200 requests per minute
      suspiciousIPs.add(ip);
      return next(createError.rateLimit('Suspicious activity detected, access temporarily restricted'));
    }

    // Apply stricter limits to suspicious IPs
    if (suspiciousIPs.has(ip) && current.count > 10) {
      return next(createError.rateLimit('Access restricted due to previous suspicious activity'));
    }

    next();
  };
};

/**
 * Rate limiting bypass for trusted sources
 */
const createTrustedSourceBypass = (trustedIPs = [], trustedUserIds = []) => {
  return (req, res, next) => {
    // Check if IP is trusted
    if (trustedIPs.includes(req.ip)) {
      return next();
    }

    // Check if user is trusted
    if (req.user && trustedUserIds.includes(req.user.id)) {
      return next();
    }

    // Check for admin role
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // Apply rate limiting
    rateLimiters.general(req, res, next);
  };
};

/**
 * Rate limiting with custom store (for Redis integration)
 */
const createRedisRateLimit = (redisClient) => {
  if (!redisClient) {
    console.warn('Redis client not provided, falling back to memory store');
    return rateLimiters.general;
  }

  const RedisStore = require('rate-limit-redis');
  
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:', // Rate limit prefix
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_ERROR',
        statusCode: 429
      }
    },
    handler: (req, res, next) => {
      next(createError.rateLimit('Too many requests, please try again later'));
    }
  });
};

/**
 * Rate limiting metrics and monitoring
 */
const rateLimitMetrics = {
  requests: new Map(),
  blocked: new Map(),
  
  track: (req, blocked = false) => {
    const key = `${req.method}:${req.route?.path || req.path}`;
    const now = Date.now();
    const minute = Math.floor(now / (60 * 1000));
    
    const requestKey = `${key}:${minute}`;
    const blockedKey = `blocked:${key}:${minute}`;
    
    // Track total requests
    const current = rateLimitMetrics.requests.get(requestKey) || 0;
    rateLimitMetrics.requests.set(requestKey, current + 1);
    
    // Track blocked requests
    if (blocked) {
      const blockedCurrent = rateLimitMetrics.blocked.get(blockedKey) || 0;
      rateLimitMetrics.blocked.set(blockedKey, blockedCurrent + 1);
    }
    
    // Clean old metrics (keep last hour)
    const oneHourAgo = minute - 60;
    for (const [key] of rateLimitMetrics.requests.entries()) {
      const keyMinute = parseInt(key.split(':').pop());
      if (keyMinute < oneHourAgo) {
        rateLimitMetrics.requests.delete(key);
      }
    }
    
    for (const [key] of rateLimitMetrics.blocked.entries()) {
      const keyMinute = parseInt(key.split(':').pop());
      if (keyMinute < oneHourAgo) {
        rateLimitMetrics.blocked.delete(key);
      }
    }
  },
  
  getStats: () => {
    const stats = {
      totalRequests: 0,
      totalBlocked: 0,
      endpoints: {}
    };
    
    for (const [key, count] of rateLimitMetrics.requests.entries()) {
      stats.totalRequests += count;
      const endpoint = key.split(':').slice(0, -1).join(':');
      if (!stats.endpoints[endpoint]) {
        stats.endpoints[endpoint] = { requests: 0, blocked: 0 };
      }
      stats.endpoints[endpoint].requests += count;
    }
    
    for (const [key, count] of rateLimitMetrics.blocked.entries()) {
      stats.totalBlocked += count;
      const endpoint = key.split(':').slice(1, -1).join(':');
      if (stats.endpoints[endpoint]) {
        stats.endpoints[endpoint].blocked += count;
      }
    }
    
    return stats;
  }
};

/**
 * Middleware to track rate limiting metrics
 */
const trackRateLimitMetrics = (req, res, next) => {
  rateLimitMetrics.track(req, false);
  
  // Override the rate limit handler to track blocked requests
  const originalHandler = res.locals.rateLimitHandler;
  res.locals.rateLimitHandler = (...args) => {
    rateLimitMetrics.track(req, true);
    if (originalHandler) {
      return originalHandler(...args);
    }
  };
  
  next();
};

module.exports = {
  rateLimiters,
  speedLimiters,
  rateLimitConfigs,
  speedLimitConfigs,
  createUserRateLimit,
  createRoleBasedRateLimit,
  endpointRateLimits,
  adaptiveRateLimit,
  createTrustedSourceBypass,
  createRedisRateLimit,
  rateLimitMetrics,
  trackRateLimitMetrics
};