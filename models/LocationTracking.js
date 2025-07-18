const mongoose = require('mongoose');

const locationTrackingSchema = new mongoose.Schema({
  rider: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  offer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Offer',
    required: false // Can track location even when not on active delivery
  },
  
  // Current location
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  
  // Location accuracy and metadata
  accuracy: { 
    type: Number, // GPS accuracy in meters
    default: null 
  },
  altitude: { 
    type: Number, // Altitude in meters
    default: null 
  },
  heading: { 
    type: Number, // Direction in degrees (0-360)
    default: null 
  },
  speed: { 
    type: Number, // Speed in m/s
    default: null 
  },
  
  // Tracking status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  trackingType: {
    type: String,
    enum: ['idle', 'heading_to_pickup', 'at_pickup', 'heading_to_delivery', 'at_delivery'],
    default: 'idle'
  },
  
  // Battery and device info
  batteryLevel: { 
    type: Number, // Battery percentage (0-100)
    default: null 
  },
  deviceInfo: {
    platform: String, // 'ios', 'android', 'web'
    version: String,
    userAgent: String
  },
  
  // Timestamps
  timestamp: { 
    type: Date, 
    default: Date.now,
    required: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create geospatial index for location queries
locationTrackingSchema.index({ 'currentLocation': '2dsphere' });

// Create compound indexes for efficient queries
locationTrackingSchema.index({ rider: 1, timestamp: -1 });
locationTrackingSchema.index({ offer: 1, timestamp: -1 });
locationTrackingSchema.index({ rider: 1, isActive: 1, timestamp: -1 });
locationTrackingSchema.index({ trackingType: 1, isActive: 1 });

// TTL index to automatically delete old location data (keep for 7 days)
locationTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

// Instance methods
locationTrackingSchema.methods.getLocationSummary = function() {
  return {
    id: this._id,
    rider: this.rider,
    offer: this.offer,
    coordinates: this.currentLocation ? this.currentLocation.coordinates : null,
    accuracy: this.accuracy,
    heading: this.heading,
    speed: this.speed,
    trackingType: this.trackingType,
    timestamp: this.timestamp,
    isActive: this.isActive
  };
};

// Static methods for location tracking operations
locationTrackingSchema.statics.updateRiderLocation = async function(riderId, locationData) {
  const {
    coordinates,
    accuracy,
    altitude,
    heading,
    speed,
    batteryLevel,
    deviceInfo,
    offerId,
    trackingType = 'idle'
  } = locationData;

  // Validate coordinates
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new Error('Invalid coordinates format');
  }

  const [lng, lat] = coordinates;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new Error('Coordinates out of valid range');
  }

  // Create new location tracking record
  const locationRecord = new this({
    rider: riderId,
    offer: offerId || null,
    currentLocation: {
      type: 'Point',
      coordinates: coordinates
    },
    accuracy,
    altitude,
    heading,
    speed,
    batteryLevel,
    deviceInfo,
    trackingType,
    isActive: true,
    timestamp: new Date()
  });

  await locationRecord.save();

  // Update rider's current location in User model
  await mongoose.model('User').findByIdAndUpdate(
    riderId,
    {
      'profile.currentLocation': {
        type: 'Point',
        coordinates: coordinates
      },
      updatedAt: new Date()
    }
  );

  return locationRecord;
};

locationTrackingSchema.statics.getRiderLocationHistory = function(riderId, options = {}) {
  const {
    limit = 50,
    startTime,
    endTime,
    offerId
  } = options;

  const query = { rider: riderId };
  
  if (startTime || endTime) {
    query.timestamp = {};
    if (startTime) query.timestamp.$gte = new Date(startTime);
    if (endTime) query.timestamp.$lte = new Date(endTime);
  }
  
  if (offerId) {
    query.offer = offerId;
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('offer', 'title status pickup.address delivery.address');
};

locationTrackingSchema.statics.getActiveRiders = function(coordinates, radius = 10000) {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        timestamp: { $gte: new Date(Date.now() - 300000) } // Last 5 minutes
      }
    },
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: coordinates
        },
        distanceField: 'distance',
        maxDistance: radius,
        spherical: true
      }
    },
    {
      $group: {
        _id: '$rider',
        latestLocation: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestLocation' }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'rider',
        foreignField: '_id',
        as: 'riderInfo'
      }
    },
    {
      $sort: { distance: 1 }
    }
  ]);
};

locationTrackingSchema.statics.getDeliveryTracking = function(offerId) {
  return this.find({ 
    offer: offerId,
    isActive: true 
  })
  .sort({ timestamp: -1 })
  .limit(100)
  .populate('rider', 'name profile.phone profile.vehicleType');
};

locationTrackingSchema.statics.deactivateTracking = async function(riderId, offerId = null) {
  const query = { 
    rider: riderId,
    isActive: true
  };
  
  if (offerId) {
    query.offer = offerId;
  }

  return this.updateMany(query, { 
    isActive: false,
    updatedAt: new Date()
  });
};

// Method to calculate distance traveled
locationTrackingSchema.statics.calculateDistanceTraveled = async function(riderId, offerId, startTime) {
  const locations = await this.find({
    rider: riderId,
    offer: offerId,
    timestamp: { $gte: startTime }
  }).sort({ timestamp: 1 });

  if (locations.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1].currentLocation.coordinates;
    const curr = locations[i].currentLocation.coordinates;
    totalDistance += this._calculateDistance(prev, curr);
  }

  return Math.round(totalDistance);
};

// Helper method for distance calculation
locationTrackingSchema.statics._calculateDistance = function(coords1, coords2) {
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
};

module.exports = mongoose.model('LocationTracking', locationTrackingSchema);