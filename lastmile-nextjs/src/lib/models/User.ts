/**
 * User model with TypeScript support
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  User as UserType,
  UserRole,
  VehicleType,
  BusinessUser,
  RiderUser,
  AdminUser,
  CreateUser,
  UpdateUserProfile
} from '@/lib/types';

// Extend mongoose Document with our User type
export interface UserDocument extends UserType, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateVerificationToken(): string;
  isTokenExpired(token: string): boolean;
}

// User schema definition
const UserSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['business', 'rider', 'admin'],
    required: true,
    index: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: Date,
  
  // Business-specific fields
  profile: {
    // Business profile
    businessName: {
      type: String,
      required: function(this: UserDocument) { return this.role === 'business'; }
    },
    contactName: {
      type: String,
      required: function(this: UserDocument) { return this.role === 'business'; }
    },
    phone: {
      type: String,
      required: function(this: UserDocument) { return this.role === 'business' || this.role === 'rider'; }
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    
    // Rider profile
    firstName: {
      type: String,
      required: function(this: UserDocument) { return this.role === 'rider'; }
    },
    lastName: {
      type: String,
      required: function(this: UserDocument) { return this.role === 'rider'; }
    },
    vehicleType: {
      type: String,
      enum: ['bike', 'scooter', 'car', 'van'],
      required: function(this: UserDocument) { return this.role === 'rider'; }
    },
    licenseNumber: {
      type: String,
      required: function(this: UserDocument) { return this.role === 'rider'; }
    },
    isAvailable: {
      type: Boolean,
      default: function(this: UserDocument) { return this.role === 'rider' ? false : undefined; }
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    
    // Admin profile
    permissions: [{
      type: String,
      enum: ['user_management', 'offer_management', 'payment_management', 'analytics', 'system_settings']
    }]
  },
  
  // Verification tokens
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Metadata
  metadata: {
    registrationSource: String,
    lastActiveAt: Date,
    preferences: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'profile.currentLocation': '2dsphere' });
UserSchema.index({ isActive: 1, role: 1 });

// Virtual for full name (riders)
UserSchema.virtual('fullName').get(function(this: UserDocument) {
  if (this.role === 'rider' && this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile?.businessName || this.email;
});

// Instance methods
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateVerificationToken = async function(): Promise<string> {
  const crypto = await import('crypto');
  return crypto.randomBytes(32).toString('hex');
};

UserSchema.methods.isTokenExpired = function(tokenExpires: Date): boolean {
  return Date.now() > tokenExpires.getTime();
};

// Static methods
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findActiveUsers = function(role?: UserRole) {
  const query: any = { isActive: true };
  if (role) {
    query.role = role;
  }
  return this.find(query);
};

UserSchema.statics.findNearbyRiders = function(
  coordinates: [number, number], 
  maxDistance: number = 10000 // 10km default
) {
  return this.find({
    role: 'rider',
    isActive: true,
    'profile.isAvailable': true,
    'profile.currentLocation': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save middleware to set email verification token
UserSchema.pre('save', function(next) {
  if (this.isNew && !this.emailVerificationToken) {
    this.emailVerificationToken = this.generateVerificationToken();
    this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// Model interface
export interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findActiveUsers(role?: UserRole): Promise<UserDocument[]>;
  findNearbyRiders(coordinates: [number, number], maxDistance?: number): Promise<UserDocument[]>;
}

// Create and export the model
export const User = (mongoose.models.User as UserModel) || 
  mongoose.model<UserDocument, UserModel>('User', UserSchema);

// Export default for backward compatibility
export default User;