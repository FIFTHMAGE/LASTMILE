const helmet = require('helmet');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const validator = require('validator');
const { createError } = require('./errorHandler');

/**
 * Security Configuration
 */
const securityConfig = {
  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    },
    reportOnly: process.env.NODE_ENV === 'development'
  },

  // CORS Configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Client-Version'
    ],
    credentials: true,
    maxAge: 86400 // 24 hours
  },

  // Rate limiting for security events
  securityRateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 security violations per window
    message: 'Too many security violations detected'
  }
};

/**
 * Basic security headers middleware using Helmet
 */
const basicSecurity = helmet({
  contentSecurityPolicy: securityConfig.csp,
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

/**
 * MongoDB injection protection
 */
const mongoSanitization = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`MongoDB injection attempt detected: ${key} from IP: ${req.ip}`);
  }
});

/**
 * HTTP Parameter Pollution protection
 */
const parameterPollutionProtection = hpp({
  whitelist: ['tags', 'coordinates', 'categories'] // Allow arrays for these parameters
});

/**
 * Advanced XSS Protection
 */
const advancedXSSProtection = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Use xss library for comprehensive XSS protection
      return xss(value, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
      });
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

/**
 * Input validation and sanitization
 */
const inputValidation = (req, res, next) => {
  const errors = [];

  // Validate common fields
  const validateField = (value, fieldName, validations) => {
    if (value === undefined || value === null) return;

    for (const validation of validations) {
      const { type, options = {}, message } = validation;
      
      try {
        switch (type) {
          case 'length':
            if (typeof value === 'string' && 
                (value.length < (options.min || 0) || 
                 value.length > (options.max || Infinity))) {
              errors.push({ field: fieldName, message: message || `${fieldName} length is invalid` });
            }
            break;
            
          case 'email':
            if (typeof value === 'string' && !validator.isEmail(value)) {
              errors.push({ field: fieldName, message: message || `${fieldName} must be a valid email` });
            }
            break;
            
          case 'url':
            if (typeof value === 'string' && !validator.isURL(value, options)) {
              errors.push({ field: fieldName, message: message || `${fieldName} must be a valid URL` });
            }
            break;
            
          case 'alphanumeric':
            if (typeof value === 'string' && !validator.isAlphanumeric(value)) {
              errors.push({ field: fieldName, message: message || `${fieldName} must be alphanumeric` });
            }
            break;
            
          case 'numeric':
            if (typeof value === 'string' && !validator.isNumeric(value)) {
              errors.push({ field: fieldName, message: message || `${fieldName} must be numeric` });
            }
            break;
            
          case 'mongoId':
            if (typeof value === 'string' && !validator.isMongoId(value)) {
              errors.push({ field: fieldName, message: message || `${fieldName} must be a valid ID` });
            }
            break;
        }
      } catch (error) {
        console.warn(`Validation error for ${fieldName}:`, error.message);
      }
    }
  };

  // Common validation rules
  const commonValidations = {
    email: [{ type: 'email' }],
    id: [{ type: 'mongoId' }],
    name: [{ type: 'length', options: { min: 1, max: 100 } }],
    description: [{ type: 'length', options: { max: 1000 } }],
    phone: [{ type: 'length', options: { min: 10, max: 15 } }],
    url: [{ type: 'url' }]
  };

  // Apply validations to request data
  const validateObject = (obj, prefix = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      
      if (commonValidations[key]) {
        validateField(value, fieldName, commonValidations[key]);
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        validateObject(value, fieldName);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    validateObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    validateObject(req.query, 'query');
  }

  if (errors.length > 0) {
    return next(createError.validation('Input validation failed', errors));
  }

  next();
};

/**
 * Request size limiting
 */
const requestSizeLimit = (options = {}) => {
  const {
    maxBodySize = '10mb',
    maxParamLength = 1000,
    maxHeaderSize = 8192
  } = options;

  return (req, res, next) => {
    // Check parameter length
    for (const [key, value] of Object.entries(req.params || {})) {
      if (typeof value === 'string' && value.length > maxParamLength) {
        return next(createError.validation(`Parameter ${key} is too long`));
      }
    }

    // Check header size
    const headerSize = JSON.stringify(req.headers).length;
    if (headerSize > maxHeaderSize) {
      return next(createError.validation('Request headers are too large'));
    }

    next();
  };
};

/**
 * Suspicious activity detection
 */
const suspiciousActivityDetection = () => {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    // Script injection patterns
    /<script[^>]*>.*?<\/script>/gi,
    // Path traversal patterns
    /\.\.[\/\\]/,
    // Command injection patterns
    /[;&|`$(){}[\]]/,
    // LDAP injection patterns
    /[()=*!&|]/
  ];

  const ipViolations = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const violations = ipViolations.get(ip) || { count: 0, lastViolation: 0 };

    // Check for suspicious patterns in various parts of the request
    const checkForPatterns = (data, source) => {
      if (typeof data === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(data)) {
            console.warn(`Suspicious activity detected from ${ip} in ${source}: ${pattern}`);
            violations.count++;
            violations.lastViolation = Date.now();
            ipViolations.set(ip, violations);
            return true;
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        for (const value of Object.values(data)) {
          if (checkForPatterns(value, source)) {
            return true;
          }
        }
      }
      return false;
    };

    // Check various request parts
    let suspicious = false;
    suspicious = checkForPatterns(req.url, 'URL') || suspicious;
    suspicious = checkForPatterns(req.body, 'body') || suspicious;
    suspicious = checkForPatterns(req.query, 'query') || suspicious;
    suspicious = checkForPatterns(userAgent, 'User-Agent') || suspicious;

    // Check for bot-like behavior
    const botPatterns = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|java|go-http/i
    ];

    for (const pattern of botPatterns) {
      if (pattern.test(userAgent)) {
        console.warn(`Bot-like activity detected from ${ip}: ${userAgent}`);
        violations.count++;
        violations.lastViolation = Date.now();
        ipViolations.set(ip, violations);
        break;
      }
    }

    // Block IPs with too many violations
    if (violations.count > 10 && Date.now() - violations.lastViolation < 60 * 60 * 1000) {
      return next(createError.authorization('Access denied due to suspicious activity'));
    }

    // Clean old violations (older than 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [ip, data] of ipViolations.entries()) {
      if (data.lastViolation < oneDayAgo) {
        ipViolations.delete(ip);
      }
    }

    next();
  };
};

/**
 * API key validation
 */
const apiKeyValidation = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return next(); // API key is optional for most endpoints
  }

  // Validate API key format
  if (!/^[a-zA-Z0-9]{32,64}$/.test(apiKey)) {
    return next(createError.authentication('Invalid API key format'));
  }

  // In a real implementation, you would validate against a database
  // For now, we'll just attach it to the request
  req.apiKey = apiKey;
  next();
};

/**
 * Request fingerprinting for security analysis
 */
const requestFingerprinting = (req, res, next) => {
  const fingerprint = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    acceptLanguage: req.get('Accept-Language'),
    acceptEncoding: req.get('Accept-Encoding'),
    timestamp: Date.now(),
    method: req.method,
    path: req.path
  };

  // Create a hash of the fingerprint for tracking
  const crypto = require('crypto');
  const fingerprintHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(fingerprint))
    .digest('hex');

  req.fingerprint = fingerprintHash;
  req.securityContext = fingerprint;

  next();
};

/**
 * Content type validation
 */
const contentTypeValidation = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      
      if (!contentType) {
        return next(createError.validation('Content-Type header is required'));
      }

      const isAllowed = allowedTypes.some(type => 
        contentType.toLowerCase().includes(type.toLowerCase())
      );

      if (!isAllowed) {
        return next(createError.validation(
          `Content-Type must be one of: ${allowedTypes.join(', ')}`
        ));
      }
    }

    next();
  };
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // API-specific headers
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  res.setHeader('X-Rate-Limit-Policy', 'standard');

  next();
};

/**
 * Security middleware composition
 */
const createSecurityMiddleware = (options = {}) => {
  const middlewares = [];

  // Basic security headers
  middlewares.push(basicSecurity);
  middlewares.push(securityHeaders);

  // Request fingerprinting
  if (options.enableFingerprinting !== false) {
    middlewares.push(requestFingerprinting);
  }

  // MongoDB sanitization
  middlewares.push(mongoSanitization);

  // Parameter pollution protection
  middlewares.push(parameterPollutionProtection);

  // XSS protection
  if (options.enableXSSProtection !== false) {
    middlewares.push(advancedXSSProtection);
  }

  // Input validation
  if (options.enableInputValidation !== false) {
    middlewares.push(inputValidation);
  }

  // Request size limiting
  if (options.enableSizeLimit !== false) {
    middlewares.push(requestSizeLimit(options.sizeLimit));
  }

  // Suspicious activity detection
  if (options.enableSuspiciousActivityDetection !== false) {
    middlewares.push(suspiciousActivityDetection());
  }

  // API key validation
  if (options.enableApiKeyValidation) {
    middlewares.push(apiKeyValidation);
  }

  // Content type validation
  if (options.allowedContentTypes) {
    middlewares.push(contentTypeValidation(options.allowedContentTypes));
  }

  return middlewares;
};

/**
 * Security metrics and monitoring
 */
const securityMetrics = {
  violations: new Map(),
  blocked: new Map(),
  
  recordViolation: (type, ip, details = {}) => {
    const key = `${type}:${ip}`;
    const current = securityMetrics.violations.get(key) || { count: 0, details: [] };
    current.count++;
    current.details.push({ timestamp: Date.now(), ...details });
    
    // Keep only last 10 details
    if (current.details.length > 10) {
      current.details = current.details.slice(-10);
    }
    
    securityMetrics.violations.set(key, current);
  },
  
  recordBlocked: (ip, reason) => {
    const current = securityMetrics.blocked.get(ip) || { count: 0, reasons: [] };
    current.count++;
    current.reasons.push({ timestamp: Date.now(), reason });
    
    // Keep only last 5 reasons
    if (current.reasons.length > 5) {
      current.reasons = current.reasons.slice(-5);
    }
    
    securityMetrics.blocked.set(ip, current);
  },
  
  getStats: () => {
    return {
      totalViolations: Array.from(securityMetrics.violations.values())
        .reduce((sum, v) => sum + v.count, 0),
      totalBlocked: Array.from(securityMetrics.blocked.values())
        .reduce((sum, b) => sum + b.count, 0),
      uniqueViolators: securityMetrics.violations.size,
      uniqueBlocked: securityMetrics.blocked.size,
      violations: Object.fromEntries(securityMetrics.violations),
      blocked: Object.fromEntries(securityMetrics.blocked)
    };
  }
};

module.exports = {
  basicSecurity,
  mongoSanitization,
  parameterPollutionProtection,
  advancedXSSProtection,
  inputValidation,
  requestSizeLimit,
  suspiciousActivityDetection,
  apiKeyValidation,
  requestFingerprinting,
  contentTypeValidation,
  securityHeaders,
  createSecurityMiddleware,
  securityConfig,
  securityMetrics
};