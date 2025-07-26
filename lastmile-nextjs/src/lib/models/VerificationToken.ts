/**
 * VerificationToken model with TypeScript support
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export type TokenType = 'email_verification' | 'password_reset';

export interface VerificationTokenType {
  _id: string;
  userId: string;
  token: string;
  type: TokenType;
  createdAt: Date;
  expiresAt: Date;
}

// Extend mongoose Document with our VerificationToken type
export interface VerificationTokenDocument extends VerificationTokenType, Document {
  isExpired(): boolean;
  isValid(): boolean;
}

// Define the schema
const verificationTokenSchema = new Schema<VerificationTokenDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: {
      values: ['email_verification', 'password_reset'] as TokenType[],
      message: 'Token type must be email_verification or password_reset'
    },
    default: 'email_verification'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration: 12 hours from creation
      return new Date(Date.now() + 12 * 60 * 60 * 1000);
    },
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  }
}, {
  timestamps: false, // We handle timestamps manually
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Create indexes
verificationTokenSchema.index({ userId: 1, type: 1 });
verificationTokenSchema.index({ token: 1 }, { unique: true });
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance method: Check if token is expired
verificationTokenSchema.methods.isExpired = function(this: VerificationTokenDocument): boolean {
  return new Date() > this.expiresAt;
};

// Instance method: Check if token is valid (not expired)
verificationTokenSchema.methods.isValid = function(this: VerificationTokenDocument): boolean {
  return !this.isExpired();
};

// Pre-save middleware to set expiration based on type
verificationTokenSchema.pre('save', function(this: VerificationTokenDocument, next) {
  if (this.isNew && !this.expiresAt) {
    const now = new Date();
    
    // Set different expiration times based on token type
    switch (this.type) {
      case 'email_verification':
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        break;
      case 'password_reset':
        this.expiresAt = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour
        break;
      default:
        this.expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours
    }
  }
  next();
});

// Static method: Generate a random token
verificationTokenSchema.statics.generateToken = function(): string {
  return crypto.randomBytes(32).toString('hex');
};

// Static method: Create a new token (removes existing tokens of same type for user)
verificationTokenSchema.statics.createToken = async function(
  userId: string, 
  type: TokenType = 'email_verification'
): Promise<VerificationTokenDocument> {
  // Delete any existing tokens for this user and type
  await this.deleteMany({ userId, type });
  
  // Generate a new token
  const token = this.generateToken();
  
  // Create and save the new token
  const verificationToken = new this({
    userId,
    token,
    type
  });
  
  return await verificationToken.save();
};

// Static method: Find and validate a token
verificationTokenSchema.statics.findAndValidateToken = async function(
  token: string, 
  type?: TokenType
): Promise<VerificationTokenDocument | null> {
  const query: any = { token };
  if (type) {
    query.type = type;
  }
  
  const verificationToken = await this.findOne(query).populate('userId');
  
  if (!verificationToken) {
    return null;
  }
  
  // Check if token is expired
  if (verificationToken.isExpired()) {
    // Delete expired token
    await verificationToken.deleteOne();
    return null;
  }
  
  return verificationToken;
};

// Static method: Verify and consume a token (deletes after verification)
verificationTokenSchema.statics.verifyAndConsumeToken = async function(
  token: string, 
  type?: TokenType
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const verificationToken = await this.findAndValidateToken(token, type);
  
  if (!verificationToken) {
    return { 
      success: false, 
      error: 'Invalid or expired token' 
    };
  }
  
  const userId = verificationToken.userId.toString();
  
  // Delete the token after successful verification
  await verificationToken.deleteOne();
  
  return { 
    success: true, 
    userId 
  };
};

// Static method: Clean up expired tokens
verificationTokenSchema.statics.cleanupExpiredTokens = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  return result.deletedCount || 0;
};

// Static method: Get token statistics
verificationTokenSchema.statics.getTokenStats = async function(): Promise<{
  total: number;
  byType: Record<TokenType, number>;
  expired: number;
}> {
  const [totalResult, byTypeResult, expiredResult] = await Promise.all([
    this.countDocuments(),
    this.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    this.countDocuments({ expiresAt: { $lt: new Date() } })
  ]);
  
  const byType: Record<TokenType, number> = {
    email_verification: 0,
    password_reset: 0
  };
  
  byTypeResult.forEach((item: any) => {
    byType[item._id as TokenType] = item.count;
  });
  
  return {
    total: totalResult,
    byType,
    expired: expiredResult
  };
};

// Define the model interface
interface VerificationTokenModel extends Model<VerificationTokenDocument> {
  generateToken(): string;
  createToken(userId: string, type?: TokenType): Promise<VerificationTokenDocument>;
  findAndValidateToken(token: string, type?: TokenType): Promise<VerificationTokenDocument | null>;
  verifyAndConsumeToken(token: string, type?: TokenType): Promise<{ success: boolean; userId?: string; error?: string }>;
  cleanupExpiredTokens(): Promise<number>;
  getTokenStats(): Promise<{ total: number; byType: Record<TokenType, number>; expired: number }>;
}

// Create and export the model
export const VerificationToken = (mongoose.models.VerificationToken as VerificationTokenModel) || 
  mongoose.model<VerificationTokenDocument, VerificationTokenModel>('VerificationToken', verificationTokenSchema);

// Export types for use in other modules
export type { VerificationTokenDocument, VerificationTokenModel };