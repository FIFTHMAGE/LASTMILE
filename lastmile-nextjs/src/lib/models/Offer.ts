/**
 * Offer model with TypeScript support
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  OfferStatus,
  PaymentMethod,
  Currency,
  PaymentInfo,
  StatusHistoryEntry,
  OfferSummary,
  StatusTransitionResult,
  StatusUpdateOptions,
  StatusUpdateResult,
  OfferValidationError,
  StatusInfo,
  ModificationPermissions,
  LocationPoint
} from '@/lib/types';

// Define the Offer document interface that extends mongoose Document
export interface OfferDocument extends Document {
  business: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  packageDetails: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    fragile: boolean;
    specialInstructions?: string;
  };
  pickup: {
    address: string;
    coordinates: [number, number];
    contactName: string;
    contactPhone: string;
    availableFrom?: Date;
    availableUntil?: Date;
    instructions?: string;
  };
  delivery: {
    address: string;
    coordinates: [number, number];
    contactName: string;
    contactPhone: string;
    deliverBy?: Date;
    instructions?: string;
  };
  payment: {
    amount: number;
    currency: Currency;
    paymentMethod: PaymentMethod;
  };
  status: OfferStatus;
  statusHistory: Array<{
    status: OfferStatus;
    timestamp: Date;
    updatedBy: mongoose.Types.ObjectId;
    notes?: string;
    location?: LocationPoint;
  }>;
  acceptedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  inTransitAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  estimatedDistance?: number;
  estimatedDuration?: number;
  actualDistance?: number;
  actualDuration?: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  calculateDistance(): number | null;
  estimateDeliveryTime(vehicleType?: string): number | null;
  validateOffer(): OfferValidationError[];
  getSummary(): OfferSummary;
  updateEstimates(vehicleType?: string): this;
  validateStatusTransition(newStatus: OfferStatus, userId: string): StatusTransitionResult;
  getValidStatusTransitions(): Record<OfferStatus, OfferStatus[]>;
  validateBusinessLogic(newStatus: OfferStatus, userId: string): StatusTransitionResult;
  getUserRole(userId: string): 'business' | 'rider' | 'unknown';
  updateStatus(newStatus: OfferStatus, userId: string, options?: StatusUpdateOptions): StatusUpdateResult;
  getStatusHistory(): StatusHistoryEntry[];
  getCurrentStatusInfo(): StatusInfo;
  canBeModifiedBy(userId: string): ModificationPermissions;
}

// Define the schema
const offerSchema = new Schema<OfferDocument>({
  business: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'Business is required'] 
  },
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Enhanced package details
  packageDetails: {
    weight: { 
      type: Number,
      min: [0, 'Weight cannot be negative'],
      max: [1000, 'Weight cannot exceed 1000kg']
    },
    dimensions: {
      length: { 
        type: Number,
        min: [0, 'Length cannot be negative'],
        max: [1000, 'Length cannot exceed 1000cm']
      },
      width: { 
        type: Number,
        min: [0, 'Width cannot be negative'],
        max: [1000, 'Width cannot exceed 1000cm']
      },
      height: { 
        type: Number,
        min: [0, 'Height cannot be negative'],
        max: [1000, 'Height cannot exceed 1000cm']
      }
    },
    fragile: { 
      type: Boolean, 
      default: false 
    },
    specialInstructions: { 
      type: String,
      trim: true,
      maxlength: [500, 'Special instructions cannot exceed 500 characters']
    }
  },
  
  // Detailed pickup information
  pickup: {
    address: { 
      type: String, 
      required: [true, 'Pickup address is required'],
      trim: true
    },
    coordinates: { 
      type: [Number], 
      required: [true, 'Pickup coordinates are required'],
      validate: {
        validator: function(coords: number[]) {
          return coords.length === 2 && 
            coords[0] >= -180 && coords[0] <= 180 && // longitude
            coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    },
    contactName: { 
      type: String, 
      required: [true, 'Pickup contact name is required'],
      trim: true
    },
    contactPhone: { 
      type: String, 
      required: [true, 'Pickup contact phone is required'],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid phone number']
    },
    availableFrom: { 
      type: Date,
      validate: {
        validator: function(date: Date) {
          return !date || date >= new Date();
        },
        message: 'Available from time must be in the future'
      }
    },
    availableUntil: { 
      type: Date,
      validate: {
        validator: function(this: OfferDocument, date: Date) {
          return !date || !this.pickup.availableFrom || date > this.pickup.availableFrom;
        },
        message: 'Available until time must be after available from time'
      }
    },
    instructions: { 
      type: String,
      trim: true,
      maxlength: [500, 'Pickup instructions cannot exceed 500 characters']
    }
  },
  
  // Detailed delivery information
  delivery: {
    address: { 
      type: String, 
      required: [true, 'Delivery address is required'],
      trim: true
    },
    coordinates: { 
      type: [Number], 
      required: [true, 'Delivery coordinates are required'],
      validate: {
        validator: function(coords: number[]) {
          return coords.length === 2 && 
            coords[0] >= -180 && coords[0] <= 180 && // longitude
            coords[1] >= -90 && coords[1] <= 90;     // latitude
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    },
    contactName: { 
      type: String, 
      required: [true, 'Delivery contact name is required'],
      trim: true
    },
    contactPhone: { 
      type: String, 
      required: [true, 'Delivery contact phone is required'],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]{10,}$/, 'Please provide a valid phone number']
    },
    deliverBy: { 
      type: Date,
      validate: {
        validator: function(date: Date) {
          return !date || date > new Date();
        },
        message: 'Delivery deadline must be in the future'
      }
    },
    instructions: { 
      type: String,
      trim: true,
      maxlength: [500, 'Delivery instructions cannot exceed 500 characters']
    }
  },
  
  // Enhanced payment information
  payment: {
    amount: { 
      type: Number, 
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0']
    },
    currency: { 
      type: String, 
      enum: {
        values: ['USD', 'EUR', 'GBP'] as Currency[],
        message: 'Currency must be USD, EUR, or GBP'
      },
      default: 'USD' 
    },
    paymentMethod: { 
      type: String, 
      enum: {
        values: ['cash', 'card', 'digital'] as PaymentMethod[],
        message: 'Payment method must be cash, card, or digital'
      },
      default: 'digital' 
    }
  },
  
  // Enhanced status tracking
  status: { 
    type: String, 
    enum: {
      values: ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'] as OfferStatus[],
      message: 'Invalid offer status'
    },
    default: 'open' 
  },
  
  // Status history tracking
  statusHistory: [{
    status: {
      type: String,
      enum: ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'] as OfferStatus[],
      required: true
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    },
    updatedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    notes: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(coords: number[] | undefined) {
            return !coords || (coords.length === 2 && 
              coords[0] >= -180 && coords[0] <= 180 && // longitude
              coords[1] >= -90 && coords[1] <= 90);     // latitude
          },
          message: 'Coordinates must be [longitude, latitude] with valid ranges'
        }
      }
    }
  }],
  
  // Rider assignment and timing
  acceptedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  acceptedAt: { type: Date },
  pickedUpAt: { type: Date },
  inTransitAt: { type: Date },
  deliveredAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date },
  
  // Distance and time estimates
  estimatedDistance: { 
    type: Number,
    min: [0, 'Estimated distance cannot be negative']
  },
  estimatedDuration: { 
    type: Number,
    min: [0, 'Estimated duration cannot be negative']
  },
  actualDistance: { 
    type: Number,
    min: [0, 'Actual distance cannot be negative']
  },
  actualDuration: { 
    type: Number,
    min: [0, 'Actual duration cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(_doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Create geospatial indexes for both pickup and delivery locations
offerSchema.index({ 'pickup.coordinates': '2dsphere' });
offerSchema.index({ 'delivery.coordinates': '2dsphere' });

// Index for efficient queries
offerSchema.index({ status: 1, createdAt: -1 });
offerSchema.index({ business: 1, status: 1 });
offerSchema.index({ acceptedBy: 1, status: 1 });
offerSchema.index({ 'payment.amount': 1 });
offerSchema.index({ 'pickup.availableFrom': 1, 'pickup.availableUntil': 1 });
offerSchema.index({ 'delivery.deliverBy': 1 });

// Instance method: Calculate distance between pickup and delivery
offerSchema.methods.calculateDistance = function(this: OfferDocument): number | null {
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

// Instance method: Estimate delivery time based on distance and vehicle type
offerSchema.methods.estimateDeliveryTime = function(this: OfferDocument, vehicleType: string = 'bike'): number | null {
  const distance = this.estimatedDistance || this.calculateDistance();
  if (!distance) return null;
  
  // Average speeds in km/h for different vehicle types
  const speeds: Record<string, number> = {
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

// Instance method: Validate offer data
offerSchema.methods.validateOffer = function(this: OfferDocument): OfferValidationError[] {
  const errors: OfferValidationError[] = [];
  
  if (!this.title) errors.push({ field: 'title', message: 'Title is required' });
  if (!this.pickup.address) errors.push({ field: 'pickup.address', message: 'Pickup address is required' });
  if (!this.pickup.contactName) errors.push({ field: 'pickup.contactName', message: 'Pickup contact name is required' });
  if (!this.pickup.contactPhone) errors.push({ field: 'pickup.contactPhone', message: 'Pickup contact phone is required' });
  if (!this.delivery.address) errors.push({ field: 'delivery.address', message: 'Delivery address is required' });
  if (!this.delivery.contactName) errors.push({ field: 'delivery.contactName', message: 'Delivery contact name is required' });
  if (!this.delivery.contactPhone) errors.push({ field: 'delivery.contactPhone', message: 'Delivery contact phone is required' });
  if (!this.payment.amount || this.payment.amount <= 0) errors.push({ field: 'payment.amount', message: 'Valid payment amount is required' });
  
  // Validate coordinates
  if (!this.pickup.coordinates || this.pickup.coordinates.length !== 2) {
    errors.push({ field: 'pickup.coordinates', message: 'Valid pickup coordinates are required' });
  }
  if (!this.delivery.coordinates || this.delivery.coordinates.length !== 2) {
    errors.push({ field: 'delivery.coordinates', message: 'Valid delivery coordinates are required' });
  }
  
  // Validate dates
  if (this.pickup.availableFrom && this.pickup.availableUntil) {
    if (this.pickup.availableFrom >= this.pickup.availableUntil) {
      errors.push({ field: 'pickup.availableUntil', message: 'Pickup available until time must be after available from time' });
    }
  }
  
  if (this.delivery.deliverBy && this.delivery.deliverBy <= new Date()) {
    errors.push({ field: 'delivery.deliverBy', message: 'Delivery deadline must be in the future' });
  }
  
  return errors;
};

// Instance method: Get offer summary for API responses
offerSchema.methods.getSummary = function(this: OfferDocument): OfferSummary {
  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    pickup: {
      address: this.pickup.address,
      coordinates: this.pickup.coordinates as [number, number],
      availableFrom: this.pickup.availableFrom,
      availableUntil: this.pickup.availableUntil
    },
    delivery: {
      address: this.delivery.address,
      coordinates: this.delivery.coordinates as [number, number],
      deliverBy: this.delivery.deliverBy
    },
    payment: this.payment as PaymentInfo,
    status: this.status,
    estimatedDistance: this.estimatedDistance,
    estimatedDuration: this.estimatedDuration,
    createdAt: this.createdAt,
    acceptedBy: this.acceptedBy?.toString(),
    acceptedAt: this.acceptedAt
  };
};

// Instance method: Update estimated distance and duration
offerSchema.methods.updateEstimates = function(this: OfferDocument, vehicleType: string = 'bike'): OfferDocument {
  this.estimatedDistance = this.calculateDistance();
  this.estimatedDuration = this.estimateDeliveryTime(vehicleType);
  return this;
};

// Status workflow validation methods
offerSchema.methods.validateStatusTransition = function(this: OfferDocument, newStatus: OfferStatus, userId: string): StatusTransitionResult {
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

offerSchema.methods.getValidStatusTransitions = function(this: OfferDocument): Record<OfferStatus, OfferStatus[]> {
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

offerSchema.methods.validateBusinessLogic = function(this: OfferDocument, newStatus: OfferStatus, userId: string): StatusTransitionResult {
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

offerSchema.methods.getUserRole = function(this: OfferDocument, userId: string): 'business' | 'rider' | 'unknown' {
  if (this.business.toString() === userId.toString()) {
    return 'business';
  }
  if (this.acceptedBy && this.acceptedBy.toString() === userId.toString()) {
    return 'rider';
  }
  return 'unknown';
};

offerSchema.methods.updateStatus = function(this: OfferDocument, newStatus: OfferStatus, userId: string, options: StatusUpdateOptions = {}): StatusUpdateResult {
  const validation = this.validateStatusTransition(newStatus, userId);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid status transition');
  }

  const previousStatus = this.status;
  this.status = newStatus;

  // Update timestamp fields
  const now = new Date();
  switch (newStatus) {
    case 'accepted':
      this.acceptedAt = now;
      this.acceptedBy = new mongoose.Types.ObjectId(userId);
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
    updatedBy: new mongoose.Types.ObjectId(userId),
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

offerSchema.methods.getStatusHistory = function(this: OfferDocument): StatusHistoryEntry[] {
  return this.statusHistory.map(entry => ({
    status: entry.status,
    timestamp: entry.timestamp,
    updatedBy: entry.updatedBy.toString(),
    notes: entry.notes,
    location: entry.location
  }));
};

offerSchema.methods.getCurrentStatusInfo = function(this: OfferDocument): StatusInfo {
  const statusTimestamps: Record<OfferStatus, Date | undefined> = {
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
    assignedRider: this.acceptedBy?.toString(),
    statusHistory: this.getStatusHistory()
  };
};

offerSchema.methods.canBeModifiedBy = function(this: OfferDocument, userId: string): ModificationPermissions {
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
offerSchema.pre('save', function(this: OfferDocument, next) {
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

// Static method to find offers near a location
offerSchema.statics.findNearby = function(coordinates: [number, number], maxDistance: number = 10000, options: any = {}) {
  const query: any = {
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

// Static method to calculate distance between two coordinate points
offerSchema.statics.calculateDistanceBetweenPoints = function(coords1: [number, number], coords2: [number, number]): number | null {
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

// Define the model interface
interface OfferModel extends Model<OfferDocument> {
  findNearby(coordinates: [number, number], maxDistance?: number, options?: any): Promise<OfferDocument[]>;
  calculateDistanceBetweenPoints(coords1: [number, number], coords2: [number, number]): number | null;
}

// Create and export the model
export const Offer = (mongoose.models.Offer as OfferModel) || 
  mongoose.model<OfferDocument, OfferModel>('Offer', offerSchema);

// Export the model type
export type { OfferModel };