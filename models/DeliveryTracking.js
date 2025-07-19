const mongoose = require('mongoose');

/**
 * DeliveryTracking Schema - Tracks delivery progress and events for active deliveries
 * This complements LocationTracking by focusing on delivery-specific events and milestones
 */
const deliveryTrackingSchema = new mongoose.Schema({
  // Core delivery information
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
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
  
  // Delivery status and progress
  currentStatus: {
    type: String,
    enum: ['accepted', 'heading_to_pickup', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_delivery', 'delivered', 'completed', 'cancelled'],
    required: true,
    index: true
  },
  
  // Event log for delivery milestones
  events: [{
    eventType: {
      type: String,
      enum: [
        'delivery_accepted',
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
      ],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [lng, lat]
    },
    notes: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Timing information
  acceptedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  estimatedPickupTime: Date,
  actualPickupTime: Date,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  completedAt: Date,
  
  // Distance and route tracking
  estimatedDistance: {
    type: Number, // in meters
    min: 0
  },
  actualDistance: {
    type: Number, // in meters
    min: 0
  },
  routeOptimized: {
    type: Boolean,
    default: false
  },
  routeDeviations: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    },
    reason: String,
    distanceFromRoute: Number, // in meters
    duration: Number // in minutes
  }],
  
  // Delivery attempts and issues
  pickupAttempts: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    successful: {
      type: Boolean,
      required: true
    },
    notes: String,
    contactAttempts: [{
      method: {
        type: String,
        enum: ['phone', 'text', 'app_notification', 'doorbell']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      successful: Boolean,
      response: String
    }]
  }],
  
  deliveryAttempts: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    successful: {
      type: Boolean,
      required: true
    },
    notes: String,
    deliveryMethod: {
      type: String,
      enum: ['hand_to_customer', 'left_at_door', 'left_with_neighbor', 'returned_to_sender']
    },
    signatureRequired: Boolean,
    signatureObtained: Boolean,
    photoTaken: Boolean,
    contactAttempts: [{
      method: {
        type: String,
        enum: ['phone', 'text', 'app_notification', 'doorbell']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      successful: Boolean,
      response: String
    }]
  }],
  
  // Issues and delays
  issues: [{
    type: {
      type: String,
      enum: [
        'traffic_delay',
        'weather_delay',
        'vehicle_breakdown',
        'package_damaged',
        'wrong_address',
        'customer_unavailable',
        'access_denied',
        'safety_concern',
        'other'
      ],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolution: String,
    impactOnDelivery: {
      type: String,
      enum: ['none', 'minor_delay', 'major_delay', 'delivery_failed', 'delivery_cancelled']
    }
  }],
  
  // Customer communication
  customerCommunications: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'push_notification', 'phone_call', 'in_app_message']
    },
    content: String,
    sentAt: {
      type: Date,
      default: Date.now
    },
    delivered: Boolean,
    read: Boolean,
    responded: Boolean,
    response: String
  }],
  
  // Performance metrics
  metrics: {
    totalDuration: Number, // in minutes
    pickupDuration: Number, // time spent at pickup location
    transitDuration: Number, // time spent in transit
    deliveryDuration: Number, // time spent at delivery location
    averageSpeed: Number, // in km/h
    fuelEfficiency: Number, // if available
    customerSatisfactionScore: Number, // 1-5 rating
    onTimePerformance: Boolean
  },
  
  // Real-time tracking status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastLocationUpdate: Date,
  estimatedArrivalTime: Date,
  
  // Notifications sent
  notificationsSent: [{
    type: {
      type: String,
      enum: ['pickup_confirmed', 'in_transit', 'arriving_soon', 'delivered', 'delayed', 'issue_reported']
    },
    recipients: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      channel: {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app']
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      delivered: Boolean
    }],
    content: String,
    sentAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
deliveryTrackingSchema.index({ offer: 1 }, { unique: true }); // One tracking record per offer
deliveryTrackingSchema.index({ rider: 1, isActive: 1, createdAt: -1 });
deliveryTrackingSchema.index({ business: 1, currentStatus: 1 });
deliveryTrackingSchema.index({ currentStatus: 1, isActive: 1 });
deliveryTrackingSchema.index({ 'events.timestamp': -1 });

// Virtual for current progress percentage
deliveryTrackingSchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    'accepted': 10,
    'heading_to_pickup': 20,
    'arrived_at_pickup': 30,
    'picked_up': 50,
    'in_transit': 70,
    'arrived_at_delivery': 85,
    'delivered': 95,
    'completed': 100,
    'cancelled': 0
  };
  
  return statusProgress[this.currentStatus] || 0;
});

// Virtual for estimated time remaining
deliveryTrackingSchema.virtual('estimatedTimeRemaining').get(function() {
  if (!this.estimatedDeliveryTime) return null;
  
  const now = new Date();
  const remaining = this.estimatedDeliveryTime.getTime() - now.getTime();
  
  return remaining > 0 ? Math.round(remaining / (1000 * 60)) : 0; // in minutes
});

// Virtual for delivery duration
deliveryTrackingSchema.virtual('totalDeliveryDuration').get(function() {
  if (!this.completedAt) return null;
  
  const duration = this.completedAt.getTime() - this.acceptedAt.getTime();
  return Math.round(duration / (1000 * 60)); // in minutes
});

// Instance Methods

/**
 * Add a new event to the delivery tracking
 * @param {String} eventType - Type of event
 * @param {Object} eventData - Event data
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.addEvent = async function(eventType, eventData = {}) {
  const {
    location,
    notes,
    metadata = {},
    reportedBy
  } = eventData;
  
  const event = {
    eventType,
    timestamp: new Date(),
    notes,
    metadata,
    reportedBy
  };
  
  if (location && location.coordinates) {
    event.location = {
      type: 'Point',
      coordinates: location.coordinates
    };
  }
  
  this.events.push(event);
  
  // Update status based on event type
  this.updateStatusFromEvent(eventType);
  
  await this.save();
  return this;
};

/**
 * Update delivery status based on event type
 * @param {String} eventType - Event type
 */
deliveryTrackingSchema.methods.updateStatusFromEvent = function(eventType) {
  const statusMapping = {
    'delivery_accepted': 'accepted',
    'heading_to_pickup': 'heading_to_pickup',
    'arrived_at_pickup': 'arrived_at_pickup',
    'package_picked_up': 'picked_up',
    'in_transit': 'in_transit',
    'arrived_at_delivery': 'arrived_at_delivery',
    'package_delivered': 'delivered',
    'delivery_completed': 'completed',
    'delivery_cancelled': 'cancelled'
  };
  
  if (statusMapping[eventType]) {
    this.currentStatus = statusMapping[eventType];
    
    // Update timing fields
    const now = new Date();
    switch (eventType) {
      case 'package_picked_up':
        this.actualPickupTime = now;
        break;
      case 'package_delivered':
        this.actualDeliveryTime = now;
        break;
      case 'delivery_completed':
        this.completedAt = now;
        this.isActive = false;
        break;
      case 'delivery_cancelled':
        this.completedAt = now;
        this.isActive = false;
        break;
    }
  }
};

/**
 * Add pickup attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.addPickupAttempt = async function(attemptData) {
  const {
    successful,
    notes,
    contactAttempts = []
  } = attemptData;
  
  this.pickupAttempts.push({
    timestamp: new Date(),
    successful,
    notes,
    contactAttempts
  });
  
  if (successful) {
    await this.addEvent('package_picked_up', { notes });
  } else {
    await this.addEvent('pickup_attempted', { notes });
  }
  
  return this;
};

/**
 * Add delivery attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.addDeliveryAttempt = async function(attemptData) {
  const {
    successful,
    notes,
    deliveryMethod,
    signatureRequired = false,
    signatureObtained = false,
    photoTaken = false,
    contactAttempts = []
  } = attemptData;
  
  this.deliveryAttempts.push({
    timestamp: new Date(),
    successful,
    notes,
    deliveryMethod,
    signatureRequired,
    signatureObtained,
    photoTaken,
    contactAttempts
  });
  
  if (successful) {
    await this.addEvent('package_delivered', { 
      notes,
      metadata: { deliveryMethod, signatureObtained, photoTaken }
    });
  } else {
    await this.addEvent('delivery_attempted', { notes });
  }
  
  return this;
};

/**
 * Report an issue
 * @param {Object} issueData - Issue data
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.reportIssue = async function(issueData) {
  const {
    type,
    description,
    reportedBy,
    impactOnDelivery = 'minor_delay'
  } = issueData;
  
  this.issues.push({
    type,
    description,
    reportedAt: new Date(),
    reportedBy,
    impactOnDelivery
  });
  
  await this.addEvent('issue_reported', {
    notes: description,
    metadata: { issueType: type, impact: impactOnDelivery },
    reportedBy
  });
  
  return this;
};

/**
 * Update estimated arrival time
 * @param {Date} newETA - New estimated arrival time
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.methods.updateETA = async function(newETA) {
  this.estimatedArrivalTime = newETA;
  this.lastLocationUpdate = new Date();
  
  await this.save();
  return this;
};

/**
 * Calculate performance metrics
 * @returns {Object}
 */
deliveryTrackingSchema.methods.calculateMetrics = function() {
  const metrics = {};
  
  if (this.completedAt) {
    metrics.totalDuration = Math.round((this.completedAt - this.acceptedAt) / (1000 * 60));
  }
  
  if (this.actualPickupTime && this.acceptedAt) {
    metrics.timeToPickup = Math.round((this.actualPickupTime - this.acceptedAt) / (1000 * 60));
  }
  
  if (this.actualDeliveryTime && this.actualPickupTime) {
    metrics.transitDuration = Math.round((this.actualDeliveryTime - this.actualPickupTime) / (1000 * 60));
  }
  
  if (this.actualDistance && metrics.transitDuration) {
    metrics.averageSpeed = (this.actualDistance / 1000) / (metrics.transitDuration / 60); // km/h
  }
  
  // On-time performance
  if (this.estimatedDeliveryTime && this.actualDeliveryTime) {
    const delay = this.actualDeliveryTime - this.estimatedDeliveryTime;
    metrics.onTimePerformance = delay <= 0;
    metrics.delayMinutes = Math.max(0, Math.round(delay / (1000 * 60)));
  }
  
  return metrics;
};

/**
 * Get formatted tracking data for API response
 * @returns {Object}
 */
deliveryTrackingSchema.methods.getTrackingData = function() {
  return {
    id: this._id,
    offer: this.offer,
    rider: this.rider,
    business: this.business,
    currentStatus: this.currentStatus,
    progressPercentage: this.progressPercentage,
    estimatedTimeRemaining: this.estimatedTimeRemaining,
    estimatedArrivalTime: this.estimatedArrivalTime,
    acceptedAt: this.acceptedAt,
    actualPickupTime: this.actualPickupTime,
    actualDeliveryTime: this.actualDeliveryTime,
    completedAt: this.completedAt,
    isActive: this.isActive,
    events: this.events.slice(-10), // Last 10 events
    issues: this.issues.filter(issue => !issue.resolved),
    metrics: this.calculateMetrics(),
    lastLocationUpdate: this.lastLocationUpdate
  };
};

// Static Methods

/**
 * Create delivery tracking for an accepted offer
 * @param {Object} offer - Offer object
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.statics.createForOffer = async function(offer) {
  if (!offer.acceptedBy) {
    throw new Error('Offer must be accepted by a rider');
  }
  
  // Check if tracking already exists
  const existingTracking = await this.findOne({ offer: offer._id });
  if (existingTracking) {
    return existingTracking;
  }
  
  const tracking = new this({
    offer: offer._id,
    rider: offer.acceptedBy,
    business: offer.business,
    currentStatus: 'accepted',
    acceptedAt: offer.acceptedAt || new Date(),
    estimatedDistance: offer.estimatedDistance,
    estimatedPickupTime: offer.pickup.availableFrom,
    estimatedDeliveryTime: offer.delivery.deliverBy
  });
  
  // Add initial event
  await tracking.addEvent('delivery_accepted', {
    notes: 'Delivery accepted by rider'
  });
  
  return tracking;
};

/**
 * Get active deliveries for a rider
 * @param {String} riderId - Rider ID
 * @returns {Promise<Array>}
 */
deliveryTrackingSchema.statics.getActiveDeliveriesForRider = function(riderId) {
  return this.find({
    rider: riderId,
    isActive: true
  })
    .populate('offer', 'title pickup delivery payment')
    .populate('business', 'name profile.businessName profile.businessPhone')
    .sort({ acceptedAt: -1 });
};

/**
 * Get delivery tracking by offer ID
 * @param {String} offerId - Offer ID
 * @returns {Promise<DeliveryTracking>}
 */
deliveryTrackingSchema.statics.getByOfferId = function(offerId) {
  return this.findOne({ offer: offerId })
    .populate('offer', 'title pickup delivery payment status')
    .populate('rider', 'name profile.phone profile.vehicleType')
    .populate('business', 'name profile.businessName profile.businessPhone');
};

/**
 * Get deliveries by status
 * @param {String} status - Delivery status
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
deliveryTrackingSchema.statics.getByStatus = function(status, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ currentStatus: status, isActive: true })
    .populate('offer', 'title pickup delivery')
    .populate('rider', 'name profile.phone')
    .populate('business', 'name profile.businessName')
    .sort({ acceptedAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Get delivery statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>}
 */
deliveryTrackingSchema.statics.getDeliveryStats = async function(filters = {}) {
  const { startDate, endDate, riderId, businessId } = filters;
  
  const match = { isActive: false }; // Only completed deliveries
  
  if (startDate || endDate) {
    match.completedAt = {};
    if (startDate) match.completedAt.$gte = new Date(startDate);
    if (endDate) match.completedAt.$lte = new Date(endDate);
  }
  
  if (riderId) match.rider = new mongoose.Types.ObjectId(riderId);
  if (businessId) match.business = new mongoose.Types.ObjectId(businessId);
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalDeliveries: { $sum: 1 },
        completedDeliveries: {
          $sum: { $cond: [{ $eq: ['$currentStatus', 'completed'] }, 1, 0] }
        },
        cancelledDeliveries: {
          $sum: { $cond: [{ $eq: ['$currentStatus', 'cancelled'] }, 1, 0] }
        },
        averageDuration: {
          $avg: {
            $divide: [
              { $subtract: ['$completedAt', '$acceptedAt'] },
              1000 * 60 // Convert to minutes
            ]
          }
        },
        totalIssues: { $sum: { $size: '$issues' } },
        onTimeDeliveries: {
          $sum: {
            $cond: [
              { $lte: ['$actualDeliveryTime', '$estimatedDeliveryTime'] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalDeliveries: 1,
        completedDeliveries: 1,
        cancelledDeliveries: 1,
        averageDuration: { $round: ['$averageDuration', 2] },
        totalIssues: 1,
        onTimeDeliveries: 1,
        completionRate: {
          $round: [
            { $multiply: [{ $divide: ['$completedDeliveries', '$totalDeliveries'] }, 100] },
            2
          ]
        },
        onTimeRate: {
          $round: [
            { $multiply: [{ $divide: ['$onTimeDeliveries', '$completedDeliveries'] }, 100] },
            2
          ]
        }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : {
    totalDeliveries: 0,
    completedDeliveries: 0,
    cancelledDeliveries: 0,
    averageDuration: 0,
    totalIssues: 0,
    onTimeDeliveries: 0,
    completionRate: 0,
    onTimeRate: 0
  };
};

module.exports = mongoose.model('DeliveryTracking', deliveryTrackingSchema);