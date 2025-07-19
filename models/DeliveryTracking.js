const mongoose = require('mongoose');

/**
 * DeliveryTracking Schema - Tracks delivery progress and events
 */
const deliveryTrackingSchema = new mongoose.Schema({
  // Core tracking information
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
    unique: true,
    index: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Current delivery status
  currentStatus: {
    type: String,
    required: true,
    enum: ['accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled', 'failed'],
    default: 'accepted',
    index: true
  },

  // Status timestamps
  statusTimestamps: {
    accepted: {
      type: Date,
      default: Date.now
    },
    picked_up: Date,
    in_transit: Date,
    delivered: Date,
    completed: Date,
    cancelled: Date,
    failed: Date
  },

  // Current location tracking
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    address: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Location history for route tracking
  locationHistory: [{
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    accuracy: Number, // GPS accuracy in meters
    speed: Number, // Speed in km/h
    heading: Number // Direction in degrees
  }],

  // Delivery events log
  events: [{
    type: {
      type: String,
      required: true,
      enum: [
        'offer_accepted',
        'rider_assigned',
        'pickup_started',
        'package_picked_up',
        'in_transit_started',
        'location_updated',
        'delivery_started',
        'package_delivered',
        'delivery_completed',
        'issue_reported',
        'delivery_cancelled',
        'delivery_failed'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      coordinates: [Number], // [longitude, latitude]
      address: String
    },
    description: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Estimated delivery information
  estimatedDelivery: {
    estimatedTime: Date,
    estimatedDuration: Number, // in minutes
    distance: Number, // in kilometers
    calculatedAt: Date,
    factors: {
      traffic: String, // 'light', 'moderate', 'heavy'
      weather: String,
      timeOfDay: String
    }
  },

  // Delivery confirmation details
  deliveryConfirmation: {
    confirmedAt: Date,
    confirmationType: {
      type: String,
      enum: ['photo', 'signature', 'code', 'contact_confirmation', 'left_at_door']
    },
    confirmationData: {
      photoUrl: String,
      signatureUrl: String,
      confirmationCode: String,
      recipientName: String,
      notes: String
    },
    deliveryLocation: {
      coordinates: [Number],
      address: String,
      instructions: String
    }
  },

  // Issue tracking
  issues: [{
    type: {
      type: String,
      enum: [
        'package_damaged',
        'wrong_address',
        'recipient_unavailable',
        'access_denied',
        'vehicle_breakdown',
        'weather_delay',
        'traffic_delay',
        'other'
      ]
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    location: {
      coordinates: [Number],
      address: String
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolution: String,
    photos: [String] // URLs to issue photos
  }],

  // Performance metrics
  metrics: {
    totalDistance: {
      type: Number,
      default: 0 // in kilometers
    },
    totalDuration: {
      type: Number,
      default: 0 // in minutes
    },
    pickupDuration: Number, // time from accepted to picked up
    transitDuration: Number, // time from picked up to delivered
    deliveryDuration: Number, // time from delivered to completed
    averageSpeed: Number, // in km/h
    routeEfficiency: Number, // percentage (actual vs optimal route)
    onTimeDelivery: Boolean // delivered within estimated time
  },

  // Additional metadata
  metadata: {
    source: {
      type: String,
      default: 'mobile_app',
      enum: ['mobile_app', 'web_app', 'api', 'system']
    },
    deviceInfo: {
      platform: String, // 'ios', 'android', 'web'
      version: String,
      userAgent: String
    },
    networkInfo: {
      connectionType: String, // 'wifi', 'cellular', 'offline'
      signalStrength: Number
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
deliveryTrackingSchema.index({ offer: 1, currentStatus: 1 });
deliveryTrackingSchema.index({ rider: 1, currentStatus: 1 });
deliveryTrackingSchema.index({ business: 1, currentStatus: 1 });
deliveryTrackingSchema.index({ 'currentLocation.coordinates': '2dsphere' });
deliveryTrackingSchema.index({ 'events.timestamp': -1 });
deliveryTrackingSchema.index({ 'statusTimestamps.accepted': -1 });
deliveryTrackingSchema.index({ 'estimatedDelivery.estimatedTime': 1 });

// Virtual for delivery duration
deliveryTrackingSchema.virtual('totalDeliveryTime').get(function() {
  if (this.statusTimestamps.completed && this.statusTimestamps.accepted) {
    return Math.round((this.statusTimestamps.completed - this.statusTimestamps.accepted) / (1000 * 60)); // minutes
  }
  return null;
});

// Virtual for current delivery phase
deliveryTrackingSchema.virtual('currentPhase').get(function() {
  const status = this.currentStatus;
  switch (status) {
    case 'accepted':
      return 'awaiting_pickup';
    case 'picked_up':
      return 'pickup_completed';
    case 'in_transit':
      return 'en_route';
    case 'delivered':
      return 'awaiting_confirmation';
    case 'completed':
      return 'delivery_complete';
    case 'cancelled':
    case 'failed':
      return 'delivery_ended';
    default:
      return 'unknown';
  }
});

// Virtual for delivery progress percentage
deliveryTrackingSchema.virtual('progressPercentage').get(function() {
  const statusOrder = ['accepted', 'picked_up', 'in_transit', 'delivered', 'completed'];
  const currentIndex = statusOrder.indexOf(this.currentStatus);
  
  if (currentIndex === -1) return 0;
  if (this.currentStatus === 'completed') return 100;
  
  return Math.round((currentIndex / (statusOrder.length - 1)) * 100);
});

// Virtual for estimated time remaining
deliveryTrackingSchema.virtual('estimatedTimeRemaining').get(function() {
  if (!this.estimatedDelivery.estimatedTime) return null;
  
  const now = new Date();
  const estimated = new Date(this.estimatedDelivery.estimatedTime);
  const remaining = Math.round((estimated - now) / (1000 * 60)); // minutes
  
  return remaining > 0 ? remaining : 0;
});

// Pre-save middleware to update metrics
deliveryTrackingSchema.pre('save', function(next) {
  // Calculate total distance from location history
  if (this.locationHistory && this.locationHistory.length > 1) {
    let totalDistance = 0;
    for (let i = 1; i < this.locationHistory.length; i++) {
      const prev = this.locationHistory[i - 1];
      const curr = this.locationHistory[i];
      totalDistance += this._calculateDistance(prev.coordinates, curr.coordinates);
    }
    this.metrics.totalDistance = totalDistance;
  }

  // Calculate phase durations
  if (this.statusTimestamps.picked_up && this.statusTimestamps.accepted) {
    this.metrics.pickupDuration = Math.round(
      (this.statusTimestamps.picked_up - this.statusTimestamps.accepted) / (1000 * 60)
    );
  }

  if (this.statusTimestamps.delivered && this.statusTimestamps.picked_up) {
    this.metrics.transitDuration = Math.round(
      (this.statusTimestamps.delivered - this.statusTimestamps.picked_up) / (1000 * 60)
    );
  }

  if (this.statusTimestamps.completed && this.statusTimestamps.delivered) {
    this.metrics.deliveryDuration = Math.round(
      (this.statusTimestamps.completed - this.statusTimestamps.delivered) / (1000 * 60)
    );
  }

  // Calculate total duration
  if (this.statusTimestamps.completed && this.statusTimestamps.accepted) {
    this.metrics.totalDuration = Math.round(
      (this.statusTimestamps.completed - this.statusTimestamps.accepted) / (1000 * 60)
    );
  }

  // Calculate average speed
  if (this.metrics.totalDistance > 0 && this.metrics.totalDuration > 0) {
    this.metrics.averageSpeed = Math.round(
      (this.metrics.totalDistance / (this.metrics.totalDuration / 60)) * 100
    ) / 100;
  }

  next();
});

// Instance Methods

/**
 * Update delivery status with event logging
 * @param {String} newStatus - New delivery status
 * @param {Object} options - Additional options
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.updateStatus = async function(newStatus, options = {}) {
  const { location, description, reportedBy, metadata = {} } = options;

  // Validate status transition
  if (!this._isValidStatusTransition(this.currentStatus, newStatus)) {
    throw new Error(`Invalid status transition from ${this.currentStatus} to ${newStatus}`);
  }

  // Update current status and timestamp
  this.currentStatus = newStatus;
  this.statusTimestamps[newStatus] = new Date();

  // Add event to log
  const event = {
    type: this._getEventTypeForStatus(newStatus),
    timestamp: new Date(),
    description: description || `Status updated to ${newStatus}`,
    reportedBy,
    metadata
  };

  if (location) {
    event.location = location;
  }

  this.events.push(event);

  return await this.save();
};

/**
 * Update current location
 * @param {Array} coordinates - [longitude, latitude]
 * @param {Object} options - Additional location data
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.updateLocation = async function(coordinates, options = {}) {
  const { address, accuracy, speed, heading } = options;

  // Update current location
  this.currentLocation = {
    type: 'Point',
    coordinates,
    address,
    lastUpdated: new Date()
  };

  // Add to location history
  const locationEntry = {
    coordinates,
    timestamp: new Date(),
    accuracy,
    speed,
    heading
  };

  this.locationHistory.push(locationEntry);

  // Add location update event
  this.events.push({
    type: 'location_updated',
    timestamp: new Date(),
    location: {
      coordinates,
      address
    },
    metadata: { accuracy, speed, heading }
  });

  // Keep location history manageable (last 1000 points)
  if (this.locationHistory.length > 1000) {
    this.locationHistory = this.locationHistory.slice(-1000);
  }

  return await this.save();
};

/**
 * Report an issue during delivery
 * @param {Object} issueData - Issue information
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.reportIssue = async function(issueData) {
  const {
    type,
    description,
    reportedBy,
    location,
    severity = 'medium',
    photos = []
  } = issueData;

  const issue = {
    type,
    description,
    reportedAt: new Date(),
    reportedBy,
    location,
    severity,
    photos
  };

  this.issues.push(issue);

  // Add event to log
  this.events.push({
    type: 'issue_reported',
    timestamp: new Date(),
    description: `Issue reported: ${type}`,
    location,
    reportedBy,
    metadata: { issueType: type, severity }
  });

  return await this.save();
};

/**
 * Confirm delivery with details
 * @param {Object} confirmationData - Delivery confirmation details
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.confirmDelivery = async function(confirmationData) {
  const {
    confirmationType,
    confirmationData: confData,
    deliveryLocation,
    notes
  } = confirmationData;

  this.deliveryConfirmation = {
    confirmedAt: new Date(),
    confirmationType,
    confirmationData: confData,
    deliveryLocation,
    notes
  };

  // Update status to delivered if not already
  if (this.currentStatus !== 'delivered' && this.currentStatus !== 'completed') {
    // Only update to delivered if we're in a valid state (in_transit)
    if (this.currentStatus === 'in_transit') {
      await this.updateStatus('delivered', {
        description: 'Package delivered and confirmed',
        metadata: { confirmationType }
      });
    }
  }

  return await this.save();
};

/**
 * Calculate estimated delivery time
 * @param {Object} factors - Factors affecting delivery time
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.updateEstimatedDelivery = async function(factors = {}) {
  const { distance, traffic = 'moderate', weather = 'clear', timeOfDay = 'normal' } = factors;

  // Base calculation: distance and average speed
  const baseSpeed = 30; // km/h base speed
  let adjustedSpeed = baseSpeed;

  // Adjust for traffic
  switch (traffic) {
    case 'light':
      adjustedSpeed *= 1.2;
      break;
    case 'heavy':
      adjustedSpeed *= 0.7;
      break;
    case 'moderate':
    default:
      adjustedSpeed *= 1.0;
      break;
  }

  // Adjust for weather
  if (weather === 'rain' || weather === 'snow') {
    adjustedSpeed *= 0.8;
  }

  // Adjust for time of day
  if (timeOfDay === 'rush_hour') {
    adjustedSpeed *= 0.6;
  }

  const estimatedDuration = Math.round((distance / adjustedSpeed) * 60); // minutes
  const estimatedTime = new Date(Date.now() + estimatedDuration * 60 * 1000);

  this.estimatedDelivery = {
    estimatedTime,
    estimatedDuration,
    distance,
    calculatedAt: new Date(),
    factors: { traffic, weather, timeOfDay }
  };

  return await this.save();
};

/**
 * Get delivery summary for API responses
 * @returns {Object} Delivery summary
 */
deliveryTrackingSchema.methods.getSummary = function() {
  return {
    id: this._id,
    offerId: this.offer,
    currentStatus: this.currentStatus,
    currentPhase: this.currentPhase,
    progressPercentage: this.progressPercentage,
    estimatedTimeRemaining: this.estimatedTimeRemaining,
    currentLocation: this.currentLocation,
    statusTimestamps: this.statusTimestamps,
    totalDeliveryTime: this.totalDeliveryTime,
    metrics: this.metrics,
    issueCount: this.issues.length,
    hasActiveIssues: this.issues.some(issue => !issue.resolved),
    lastUpdated: this.updatedAt
  };
};

/**
 * Get detailed tracking information
 * @returns {Object} Detailed tracking data
 */
deliveryTrackingSchema.methods.getDetailedTracking = function() {
  return {
    ...this.getSummary(),
    events: this.events.slice(-20), // Last 20 events
    locationHistory: this.locationHistory.slice(-50), // Last 50 locations
    estimatedDelivery: this.estimatedDelivery,
    deliveryConfirmation: this.deliveryConfirmation,
    issues: this.issues.filter(issue => !issue.resolved || 
      (new Date() - issue.resolvedAt) < 24 * 60 * 60 * 1000) // Recent resolved issues
  };
};

// Private helper methods

/**
 * Validate status transition
 * @param {String} currentStatus - Current status
 * @param {String} newStatus - New status
 * @returns {Boolean} Is valid transition
 * @private
 */
deliveryTrackingSchema.methods._isValidStatusTransition = function(currentStatus, newStatus) {
  const validTransitions = {
    accepted: ['picked_up', 'cancelled', 'failed'],
    picked_up: ['in_transit', 'cancelled', 'failed'],
    in_transit: ['delivered', 'cancelled', 'failed'],
    delivered: ['completed', 'failed'],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
    failed: [] // Terminal state
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Get event type for status change
 * @param {String} status - Delivery status
 * @returns {String} Event type
 * @private
 */
deliveryTrackingSchema.methods._getEventTypeForStatus = function(status) {
  const eventMap = {
    accepted: 'offer_accepted',
    picked_up: 'package_picked_up',
    in_transit: 'in_transit_started',
    delivered: 'package_delivered',
    completed: 'delivery_completed',
    cancelled: 'delivery_cancelled',
    failed: 'delivery_failed'
  };

  return eventMap[status] || 'status_updated';
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {Number} Distance in kilometers
 * @private
 */
deliveryTrackingSchema.methods._calculateDistance = function(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = this._toRadians(coord2[1] - coord1[1]);
  const dLon = this._toRadians(coord2[0] - coord1[0]);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(this._toRadians(coord1[1])) * Math.cos(this._toRadians(coord2[1])) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {Number} degrees - Degrees
 * @returns {Number} Radians
 * @private
 */
deliveryTrackingSchema.methods._toRadians = function(degrees) {
  return degrees * (Math.PI / 180);
};

// Static Methods

/**
 * Create new delivery tracking for an offer
 * @param {String} offerId - Offer ID
 * @param {String} riderId - Rider ID
 * @param {String} businessId - Business ID
 * @param {Object} options - Additional options
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.statics.createForOffer = async function(offerId, riderId, businessId, options = {}) {
  const { initialLocation, metadata = {} } = options;

  const tracking = new this({
    offer: offerId,
    rider: riderId,
    business: businessId,
    currentStatus: 'accepted',
    metadata
  });

  // Add initial event
  tracking.events.push({
    type: 'offer_accepted',
    timestamp: new Date(),
    description: 'Delivery tracking started - offer accepted by rider',
    reportedBy: riderId
  });

  // Set initial location if provided
  if (initialLocation) {
    tracking.currentLocation = {
      type: 'Point',
      coordinates: initialLocation.coordinates,
      address: initialLocation.address,
      lastUpdated: new Date()
    };

    tracking.locationHistory.push({
      coordinates: initialLocation.coordinates,
      timestamp: new Date()
    });
  }

  return await tracking.save();
};

/**
 * Get active deliveries for a rider
 * @param {String} riderId - Rider ID
 * @returns {Promise<Array>} Active deliveries
 */
deliveryTrackingSchema.statics.getActiveDeliveries = function(riderId) {
  return this.find({
    rider: riderId,
    currentStatus: { $in: ['accepted', 'picked_up', 'in_transit', 'delivered'] }
  })
  .populate('offer', 'title pickup delivery payment')
  .populate('business', 'businessName email profile.phone')
  .sort({ updatedAt: -1 });
};

/**
 * Get deliveries being tracked by a business
 * @param {String} businessId - Business ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Business deliveries
 */
deliveryTrackingSchema.statics.getBusinessDeliveries = function(businessId, options = {}) {
  const { status, limit = 50, skip = 0 } = options;
  
  const query = { business: businessId };
  if (status) {
    query.currentStatus = status;
  }

  return this.find(query)
    .populate('offer', 'title pickup delivery payment')
    .populate('rider', 'name email profile.phone')
    .sort({ updatedAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get delivery tracking by offer ID
 * @param {String} offerId - Offer ID
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.statics.getByOfferId = function(offerId) {
  return this.findOne({ offer: offerId })
    .populate('offer', 'title pickup delivery payment')
    .populate('rider', 'name email profile.phone')
    .populate('business', 'businessName email profile.phone');
};

/**
 * Get delivery statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Delivery statistics
 */
deliveryTrackingSchema.statics.getDeliveryStats = async function(filters = {}) {
  const { riderId, businessId, startDate, endDate } = filters;

  const matchQuery = {};
  if (riderId) matchQuery.rider = riderId;
  if (businessId) matchQuery.business = businessId;
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$currentStatus',
        count: { $sum: 1 },
        avgDuration: { $avg: '$metrics.totalDuration' },
        avgDistance: { $avg: '$metrics.totalDistance' }
      }
    }
  ]);

  const result = {
    totalDeliveries: 0,
    statusBreakdown: {},
    averageDuration: 0,
    averageDistance: 0,
    completionRate: 0
  };

  let totalCompleted = 0;
  let totalDuration = 0;
  let totalDistance = 0;
  let durationCount = 0;
  let distanceCount = 0;

  stats.forEach(stat => {
    result.totalDeliveries += stat.count;
    result.statusBreakdown[stat._id] = stat.count;

    if (stat._id === 'completed') {
      totalCompleted = stat.count;
    }

    if (stat.avgDuration) {
      totalDuration += stat.avgDuration * stat.count;
      durationCount += stat.count;
    }

    if (stat.avgDistance) {
      totalDistance += stat.avgDistance * stat.count;
      distanceCount += stat.count;
    }
  });

  result.completionRate = result.totalDeliveries > 0 ? 
    Math.round((totalCompleted / result.totalDeliveries) * 10000) / 100 : 0;
  result.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
  result.averageDistance = distanceCount > 0 ? totalDistance / distanceCount : 0;

  return result;
};

module.exports = mongoose.model('DeliveryTracking', deliveryTrackingSchema);