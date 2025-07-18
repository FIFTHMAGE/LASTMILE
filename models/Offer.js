const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  
  // Enhanced package details
  packageDetails: {
    weight: { type: Number }, // in kg
    dimensions: {
      length: { type: Number }, // in cm
      width: { type: Number },  // in cm
      height: { type: Number }  // in cm
    },
    fragile: { type: Boolean, default: false },
    specialInstructions: { type: String }
  },
  
  // Detailed pickup information
  pickup: {
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    availableFrom: { type: Date },
    availableUntil: { type: Date },
    instructions: { type: String }
  },
  
  // Detailed delivery information
  delivery: {
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    deliverBy: { type: Date },
    instructions: { type: String }
  },
  
  // Enhanced payment information
  payment: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paymentMethod: { type: String, enum: ['cash', 'card', 'digital'], default: 'digital' }
  },
  
  // Enhanced status tracking
  status: { 
    type: String, 
    enum: ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'], 
    default: 'open' 
  },
  
  // Status history tracking
  statusHistory: [{
    status: {
      type: String,
      enum: ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number] // [lng, lat]
    }
  }],
  
  // Rider assignment and timing
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAt: { type: Date },
  pickedUpAt: { type: Date },
  inTransitAt: { type: Date },
  deliveredAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  
  // Distance and time estimates
  estimatedDistance: { type: Number }, // in meters
  estimatedDuration: { type: Number }, // in minutes
  actualDistance: { type: Number },    // in meters
  actualDuration: { type: Number },    // in minutes
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create geospatial indexes for both pickup and delivery locations
offerSchema.index({ 'pickup.coordinates': '2dsphere' });
offerSchema.index({ 'delivery.coordinates': '2dsphere' });

// Index for efficient queries
offerSchema.index({ status: 1, createdAt: -1 });
offerSchema.index({ business: 1, status: 1 });
offerSchema.index({ acceptedBy: 1, status: 1 });

// Update the updatedAt field before saving
offerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate distance between pickup and delivery
offerSchema.methods.calculateDistance = function() {
  if (!this.pickup.coordinates || !this.delivery.coordinates) {
    return null;
  }
  
  const [lng1, lat1] = this.pickup.coordinates;
  const [lng2, lat2] = this.delivery.coordinates;
  
  // Haversine formula for calculating distance
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return Math.round(R * c); // Distance in meters
};

// Method to estimate delivery time based on distance and vehicle type
offerSchema.methods.estimateDeliveryTime = function(vehicleType = 'bike') {
  const distance = this.estimatedDistance || this.calculateDistance();
  if (!distance) return null;
  
  // Average speeds in km/h for different vehicle types
  const speeds = {
    bike: 15,
    scooter: 25,
    car: 30,
    van: 25
  };
  
  const speed = speeds[vehicleType] || speeds.bike;
  const timeInHours = (distance / 1000) / speed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  // Add buffer time for pickup/delivery (10-20 minutes)
  const bufferTime = Math.max(10, Math.min(20, timeInMinutes * 0.3));
  
  return Math.round(timeInMinutes + bufferTime);
};

// Method to validate offer data
offerSchema.methods.validateOffer = function() {
  const errors = [];
  
  if (!this.title) errors.push('Title is required');
  if (!this.pickup.address) errors.push('Pickup address is required');
  if (!this.pickup.contactName) errors.push('Pickup contact name is required');
  if (!this.pickup.contactPhone) errors.push('Pickup contact phone is required');
  if (!this.delivery.address) errors.push('Delivery address is required');
  if (!this.delivery.contactName) errors.push('Delivery contact name is required');
  if (!this.delivery.contactPhone) errors.push('Delivery contact phone is required');
  if (!this.payment.amount || this.payment.amount <= 0) errors.push('Valid payment amount is required');
  
  // Validate coordinates
  if (!this.pickup.coordinates || this.pickup.coordinates.length !== 2) {
    errors.push('Valid pickup coordinates are required');
  }
  if (!this.delivery.coordinates || this.delivery.coordinates.length !== 2) {
    errors.push('Valid delivery coordinates are required');
  }
  
  // Validate dates
  if (this.pickup.availableFrom && this.pickup.availableUntil) {
    if (this.pickup.availableFrom >= this.pickup.availableUntil) {
      errors.push('Pickup available until time must be after available from time');
    }
  }
  
  if (this.delivery.deliverBy && this.delivery.deliverBy <= new Date()) {
    errors.push('Delivery deadline must be in the future');
  }
  
  return errors;
};

// Method to get offer summary for API responses
offerSchema.methods.getSummary = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    pickup: {
      address: this.pickup.address,
      coordinates: this.pickup.coordinates,
      availableFrom: this.pickup.availableFrom,
      availableUntil: this.pickup.availableUntil
    },
    delivery: {
      address: this.delivery.address,
      coordinates: this.delivery.coordinates,
      deliverBy: this.delivery.deliverBy
    },
    payment: this.payment,
    status: this.status,
    estimatedDistance: this.estimatedDistance,
    estimatedDuration: this.estimatedDuration,
    createdAt: this.createdAt,
    acceptedBy: this.acceptedBy,
    acceptedAt: this.acceptedAt
  };
};

// Static method to find offers near a location
offerSchema.statics.findNearby = function(coordinates, maxDistance = 10000, options = {}) {
  const query = {
    status: 'open',
    'pickup.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates // [lng, lat]
        },
        $maxDistance: maxDistance // in meters
      }
    }
  };

  // Add optional filters
  if (options.minPayment) {
    query['payment.amount'] = { $gte: options.minPayment };
  }
  if (options.maxPayment) {
    query['payment.amount'] = { ...query['payment.amount'], $lte: options.maxPayment };
  }
  if (options.packageType) {
    query['packageDetails.fragile'] = options.packageType === 'fragile';
  }
  if (options.vehicleType) {
    // Filter based on package size for vehicle compatibility
    if (options.vehicleType === 'bike') {
      query['packageDetails.weight'] = { $lte: 5 }; // Max 5kg for bikes
    }
  }

  return this.find(query)
    .populate('business', 'name profile.businessName profile.businessPhone')
    .sort({ createdAt: -1 });
};

// Static method to find offers within a radius using aggregation
offerSchema.statics.findWithinRadius = function(coordinates, radiusInMeters, filters = {}) {
  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: coordinates
        },
        distanceField: 'distanceFromRider',
        maxDistance: radiusInMeters,
        spherical: true,
        query: { status: 'open' }
      }
    }
  ];

  // Add filtering stages
  if (filters.minPayment || filters.maxPayment) {
    const paymentMatch = {};
    if (filters.minPayment) paymentMatch['payment.amount'] = { $gte: filters.minPayment };
    if (filters.maxPayment) paymentMatch['payment.amount'] = { ...paymentMatch['payment.amount'], $lte: filters.maxPayment };
    pipeline.push({ $match: paymentMatch });
  }

  // Add sorting
  if (filters.sortBy) {
    const sortStage = {};
    switch (filters.sortBy) {
      case 'distance':
        sortStage.distanceFromRider = 1;
        break;
      case 'payment':
        sortStage['payment.amount'] = -1;
        break;
      case 'created':
        sortStage.createdAt = -1;
        break;
      default:
        sortStage.distanceFromRider = 1;
    }
    pipeline.push({ $sort: sortStage });
  }

  // Add pagination
  if (filters.limit) {
    pipeline.push({ $limit: filters.limit });
  }

  return this.aggregate(pipeline);
};

// Static method to calculate distance between two coordinate points
offerSchema.statics.calculateDistanceBetweenPoints = function(coords1, coords2) {
  if (!coords1 || !coords2 || coords1.length !== 2 || coords2.length !== 2) {
    return null;
  }
  
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  
  // Haversine formula
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return Math.round(R * c);
};

// Static method to get offers sorted by distance from a point
offerSchema.statics.findSortedByDistance = function(coordinates, options = {}) {
  const maxDistance = options.maxDistance || 50000; // Default 50km
  
  return this.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: coordinates
        },
        distanceField: 'distanceFromLocation',
        maxDistance: maxDistance,
        spherical: true,
        query: { 
          status: 'open',
          ...(options.businessId && { business: options.businessId })
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'business',
        foreignField: '_id',
        as: 'businessInfo'
      }
    },
    {
      $addFields: {
        estimatedDistance: {
          $cond: {
            if: { $eq: ['$estimatedDistance', null] },
            then: '$distanceFromLocation',
            else: '$estimatedDistance'
          }
        }
      }
    },
    {
      $sort: { distanceFromLocation: 1 }
    },
    ...(options.limit ? [{ $limit: options.limit }] : [])
  ]);
};

// Method to update estimated distance and duration
offerSchema.methods.updateEstimates = function(vehicleType = 'bike') {
  this.estimatedDistance = this.calculateDistance();
  this.estimatedDuration = this.estimateDeliveryTime(vehicleType);
  return this;
};

// Status workflow validation methods
offerSchema.methods.validateStatusTransition = function(newStatus, userId) {
  const currentStatus = this.status;
  const validTransitions = this.getValidStatusTransitions();
  
  if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
    return {
      isValid: false,
      error: `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      validTransitions: validTransitions[currentStatus] || []
    };
  }

  // Additional business logic validation
  const businessLogicValidation = this.validateBusinessLogic(newStatus, userId);
  if (!businessLogicValidation.isValid) {
    return businessLogicValidation;
  }

  return { isValid: true };
};

offerSchema.methods.getValidStatusTransitions = function() {
  return {
    'open': ['accepted', 'cancelled'],
    'accepted': ['picked_up', 'cancelled'],
    'picked_up': ['in_transit', 'cancelled'],
    'in_transit': ['delivered', 'cancelled'],
    'delivered': ['completed'],
    'completed': [], // Terminal state
    'cancelled': []  // Terminal state
  };
};

offerSchema.methods.validateBusinessLogic = function(newStatus, userId) {
  // Role-based validation
  switch (newStatus) {
    case 'accepted':
      // For acceptance, we need to check if user is business owner (not allowed) or rider (allowed)
      if (this.business.toString() === userId.toString()) {
        return { isValid: false, error: 'Only riders can accept offers' };
      }
      if (this.acceptedBy && this.acceptedBy.toString() !== userId.toString()) {
        return { isValid: false, error: 'Offer already accepted by another rider' };
      }
      break;
      
    case 'picked_up':
    case 'in_transit':
    case 'delivered':
      if (!this.acceptedBy || this.acceptedBy.toString() !== userId.toString()) {
        return { isValid: false, error: 'Only the assigned rider can update this status' };
      }
      break;
      
    case 'completed':
      const isBusinessOwner = this.business.toString() === userId.toString();
      const isAssignedRider = this.acceptedBy && this.acceptedBy.toString() === userId.toString();
      
      if (!isBusinessOwner && !isAssignedRider) {
        return { isValid: false, error: 'Only business owners or assigned riders can complete offers' };
      }
      break;
      
    case 'cancelled':
      const isBusinessOwnerForCancel = this.business.toString() === userId.toString();
      const isAssignedRiderForCancel = this.acceptedBy && this.acceptedBy.toString() === userId.toString();
      
      if (!isBusinessOwnerForCancel && !isAssignedRiderForCancel) {
        return { isValid: false, error: 'Only the business owner or assigned rider can cancel this offer' };
      }
      break;
  }

  return { isValid: true };
};

offerSchema.methods.getUserRole = function(userId) {
  if (this.business.toString() === userId.toString()) {
    return 'business';
  }
  if (this.acceptedBy && this.acceptedBy.toString() === userId.toString()) {
    return 'rider';
  }
  return 'unknown';
};

offerSchema.methods.updateStatus = function(newStatus, userId, options = {}) {
  const validation = this.validateStatusTransition(newStatus, userId);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const previousStatus = this.status;
  this.status = newStatus;

  // Update timestamp fields
  const now = new Date();
  switch (newStatus) {
    case 'accepted':
      this.acceptedAt = now;
      this.acceptedBy = userId;
      break;
    case 'picked_up':
      this.pickedUpAt = now;
      break;
    case 'in_transit':
      this.inTransitAt = now;
      break;
    case 'delivered':
      this.deliveredAt = now;
      break;
    case 'completed':
      this.completedAt = now;
      break;
    case 'cancelled':
      this.cancelledAt = now;
      break;
  }

  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: now,
    updatedBy: userId,
    notes: options.notes,
    location: options.location
  });

  return {
    previousStatus,
    newStatus,
    timestamp: now,
    updatedBy: userId
  };
};

offerSchema.methods.getStatusHistory = function() {
  return this.statusHistory.map(entry => ({
    status: entry.status,
    timestamp: entry.timestamp,
    updatedBy: entry.updatedBy,
    notes: entry.notes,
    location: entry.location
  }));
};

offerSchema.methods.getCurrentStatusInfo = function() {
  const statusTimestamps = {
    open: this.createdAt,
    accepted: this.acceptedAt,
    picked_up: this.pickedUpAt,
    in_transit: this.inTransitAt,
    delivered: this.deliveredAt,
    completed: this.completedAt,
    cancelled: this.cancelledAt
  };

  return {
    currentStatus: this.status,
    timestamp: statusTimestamps[this.status],
    validNextStates: this.getValidStatusTransitions()[this.status] || [],
    isTerminal: ['completed', 'cancelled'].includes(this.status),
    assignedRider: this.acceptedBy,
    statusHistory: this.getStatusHistory()
  };
};

offerSchema.methods.canBeModifiedBy = function(userId) {
  const userRole = this.getUserRole(userId);
  
  // Terminal states cannot be modified
  if (['completed', 'cancelled'].includes(this.status)) {
    return { canModify: false, reason: 'Offer is in terminal state' };
  }

  // Business can modify their own offers before acceptance
  if (userRole === 'business' && this.status === 'open') {
    return { canModify: true, allowedActions: ['cancel', 'edit'] };
  }

  // Assigned rider can update status
  if (userRole === 'rider' && this.acceptedBy && this.acceptedBy.toString() === userId.toString()) {
    return { canModify: true, allowedActions: ['updateStatus', 'cancel'] };
  }

  return { canModify: false, reason: 'Insufficient permissions' };
};

// Initialize status history on creation
offerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Add initial status to history if this is a new document
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      timestamp: this.createdAt || new Date(),
      updatedBy: this.business,
      notes: 'Offer created'
    });
  }
  
  next();
});

module.exports = mongoose.model('Offer', offerSchema); 