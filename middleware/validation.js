const { body, param, query, validationResult } = require('express-validator');
const { createError } = require('./errorHandler');

/**
 * Validation middleware for handling express-validator results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const details = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    return next(createError.validation('Request validation failed', details));
  }
  
  next();
};

/**
 * Common validation rules
 */
const validationRules = {
  // User validation
  userRegistration: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('role')
      .isIn(['business', 'rider'])
      .withMessage('Role must be either business or rider')
  ],

  userLogin: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Business profile validation
  businessProfile: [
    body('profile.businessName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Business name must be between 2 and 100 characters'),
    
    body('profile.businessAddress.street')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Street address must be between 5 and 200 characters'),
    
    body('profile.businessAddress.city')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    
    body('profile.businessAddress.state')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('State must be between 2 and 50 characters'),
    
    body('profile.businessAddress.zipCode')
      .matches(/^\d{5}(-\d{4})?$/)
      .withMessage('Please provide a valid ZIP code'),
    
    body('profile.businessPhone')
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please provide a valid phone number')
  ],

  // Rider profile validation
  riderProfile: [
    body('profile.phone')
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please provide a valid phone number'),
    
    body('profile.vehicleType')
      .isIn(['bike', 'scooter', 'car', 'van'])
      .withMessage('Vehicle type must be bike, scooter, car, or van')
  ],

  // Offer validation
  offerCreation: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    
    body('pickup.address')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Pickup address must be between 10 and 200 characters'),
    
    body('pickup.coordinates')
      .isArray({ min: 2, max: 2 })
      .withMessage('Pickup coordinates must be an array of [longitude, latitude]'),
    
    body('pickup.coordinates.*')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Coordinates must be valid numbers'),
    
    body('pickup.contactName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Pickup contact name must be between 2 and 50 characters'),
    
    body('pickup.contactPhone')
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please provide a valid pickup contact phone'),
    
    body('delivery.address')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Delivery address must be between 10 and 200 characters'),
    
    body('delivery.coordinates')
      .isArray({ min: 2, max: 2 })
      .withMessage('Delivery coordinates must be an array of [longitude, latitude]'),
    
    body('delivery.coordinates.*')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Coordinates must be valid numbers'),
    
    body('delivery.contactName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Delivery contact name must be between 2 and 50 characters'),
    
    body('delivery.contactPhone')
      .matches(/^\+?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please provide a valid delivery contact phone'),
    
    body('payment.amount')
      .isFloat({ min: 1, max: 10000 })
      .withMessage('Payment amount must be between $1 and $10,000'),
    
    body('payment.currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
      .withMessage('Currency must be USD, EUR, GBP, CAD, or AUD'),
    
    body('payment.paymentMethod')
      .isIn(['cash', 'card', 'digital'])
      .withMessage('Payment method must be cash, card, or digital'),
    
    body('packageDetails.weight')
      .optional()
      .isFloat({ min: 0.1, max: 100 })
      .withMessage('Package weight must be between 0.1kg and 100kg'),
    
    body('packageDetails.fragile')
      .optional()
      .isBoolean()
      .withMessage('Fragile must be true or false')
  ],

  // Location validation
  locationUpdate: [
    body('coordinates')
      .isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of [longitude, latitude]'),
    
    body('coordinates.*')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Coordinates must be valid numbers'),
    
    body('accuracy')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Accuracy must be a positive number'),
    
    body('heading')
      .optional()
      .isFloat({ min: 0, max: 360 })
      .withMessage('Heading must be between 0 and 360 degrees'),
    
    body('speed')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Speed must be a positive number')
  ],

  // Payment validation
  paymentProcessing: [
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    
    body('currency')
      .optional()
      .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
      .withMessage('Invalid currency'),
    
    body('paymentMethod')
      .isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer', 'wallet'])
      .withMessage('Invalid payment method')
  ],

  // Delivery tracking validation
  deliveryEvent: [
    body('eventType')
      .isIn([
        'heading_to_pickup',
        'arrived_at_pickup',
        'pickup_attempted',
        'package_picked_up',
        'departure_from_pickup',
        'in_transit',
        'arrived_at_delivery',
        'delivery_attempted',
        'package_delivered',
        'delivery_completed',
        'delivery_cancelled',
        'issue_reported',
        'customer_contacted',
        'route_deviated',
        'delay_reported'
      ])
      .withMessage('Invalid event type'),
    
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('location.coordinates')
      .optional()
      .isArray({ min: 2, max: 2 })
      .withMessage('Location coordinates must be an array of [longitude, latitude]'),
    
    body('location.coordinates.*')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Coordinates must be valid numbers')
  ],

  // Issue reporting validation
  issueReport: [
    body('type')
      .isIn([
        'traffic_delay',
        'weather_delay',
        'vehicle_breakdown',
        'package_damaged',
        'wrong_address',
        'customer_unavailable',
        'access_denied',
        'safety_concern',
        'other'
      ])
      .withMessage('Invalid issue type'),
    
    body('description')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters'),
    
    body('impactOnDelivery')
      .optional()
      .isIn(['none', 'minor_delay', 'major_delay', 'delivery_failed', 'delivery_cancelled'])
      .withMessage('Invalid impact level')
  ],

  // Parameter validation
  mongoId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format'),
    param('offerId')
      .optional()
      .isMongoId()
      .withMessage('Invalid offer ID format'),
    param('userId')
      .optional()
      .isMongoId()
      .withMessage('Invalid user ID format')
  ],

  // Query validation
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    query('sortBy')
      .optional()
      .isAlpha()
      .withMessage('Sort field must contain only letters'),
    
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be asc or desc')
  ],

  // Date range validation
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO8601 format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO8601 format')
  ],

  // Geospatial query validation
  locationQuery: [
    query('lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    
    query('lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    
    query('radius')
      .optional()
      .isInt({ min: 100, max: 100000 })
      .withMessage('Radius must be between 100m and 100km'),
    
    query('maxDistance')
      .optional()
      .isInt({ min: 100, max: 100000 })
      .withMessage('Max distance must be between 100m and 100km')
  ]
};

/**
 * Sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Remove any potential XSS attempts
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * File upload validation
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return next(createError.validation('File is required'));
    }

    if (req.file) {
      // Check file size
      if (req.file.size > maxSize) {
        return next(createError.validation(`File size cannot exceed ${maxSize / (1024 * 1024)}MB`));
      }

      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(createError.validation(`File type must be one of: ${allowedTypes.join(', ')}`));
      }
    }

    next();
  };
};

/**
 * Custom validation helpers
 */
const customValidators = {
  // Check if coordinates are within valid bounds
  isValidCoordinates: (coordinates) => {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return false;
    }
    
    const [lng, lat] = coordinates;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  },

  // Check if phone number is valid
  isValidPhone: (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  },

  // Check if password meets complexity requirements
  isStrongPassword: (password) => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  },

  // Check if business hours are valid
  isValidBusinessHours: (hours) => {
    if (!hours || typeof hours !== 'object') return false;
    
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of validDays) {
      if (hours[day]) {
        const { open, close } = hours[day];
        if (!open || !close) return false;
        
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(open) || !timeRegex.test(close)) return false;
      }
    }
    
    return true;
  }
};

module.exports = {
  handleValidationErrors,
  validationRules,
  sanitizeInput,
  validateFileUpload,
  customValidators
};