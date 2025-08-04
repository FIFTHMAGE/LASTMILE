/**
 * Payment model with TypeScript support
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  Payment as PaymentType,
  PaymentStatus,
  PaymentMethod,
  Currency,
  TransactionType,
  PaymentDetails,
  PaymentSummary,
  PaymentFilters,
  PaymentStats,
  EarningsCalculation
} from '@/lib/types';

// Extend mongoose Document with our Payment type
export interface PaymentDocument extends PaymentType, Document {
  calculateEarnings(): EarningsCalculation;
}

// Payment schema definition
const PaymentSchema = new Schema<PaymentDocument>({
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
    index: true
  },
  businessId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  riderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP'],
    default: 'USD'
  },
  method: {
    type: String,
    enum: ['cash', 'card', 'digital'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  transactionType: {
    type: String,
    enum: ['payment', 'refund', 'fee', 'bonus'],
    default: 'payment'
  },
  details: {
    description: String,
    reference: String,
    metadata: Schema.Types.Mixed
  },
  processedAt: Date,
  failureReason: String,
  refundAmount: {
    type: Number,
    min: 0
  },
  refundedAt: Date,
  platformFee: {
    type: Number,
    min: 0,
    default: 0
  },
  riderEarnings: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PaymentSchema.index({ businessId: 1, createdAt: -1 });
PaymentSchema.index({ riderId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ offerId: 1 }, { unique: true });

// Instance methods
PaymentSchema.methods.calculateEarnings = function(): EarningsCalculation {
  const platformFeeRate = 0.15; // 15% platform fee
  const platformFee = this.amount * platformFeeRate;
  const riderEarnings = this.amount - platformFee;

  return {
    totalAmount: this.amount,
    platformFee,
    riderEarnings,
    platformFeeRate
  };
};

// Static methods
PaymentSchema.statics.findByOffer = function(offerId: string) {
  return this.findOne({ offerId });
};

PaymentSchema.statics.findByBusiness = function(businessId: string, filters?: PaymentFilters) {
  const query: any = { businessId };
  
  if (filters?.status) {
    query.status = filters.status;
  }
  
  if (filters?.dateFrom || filters?.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  return this.find(query).sort({ createdAt: -1 });
};

PaymentSchema.statics.findByRider = function(riderId: string, filters?: PaymentFilters) {
  const query: any = { riderId };
  
  if (filters?.status) {
    query.status = filters.status;
  }
  
  if (filters?.dateFrom || filters?.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  return this.find(query).sort({ createdAt: -1 });
};

PaymentSchema.statics.getStats = async function(filters?: PaymentFilters): Promise<PaymentStats> {
  const matchStage: any = {};
  
  if (filters?.status) {
    matchStage.status = filters.status;
  }
  
  if (filters?.dateFrom || filters?.dateTo) {
    matchStage.createdAt = {};
    if (filters.dateFrom) {
      matchStage.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      matchStage.createdAt.$lte = new Date(filters.dateTo);
    }
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        totalPlatformFees: { $sum: '$platformFee' },
        totalRiderEarnings: { $sum: '$riderEarnings' }
      }
    }
  ]);

  return stats[0] || {
    totalPayments: 0,
    totalAmount: 0,
    averageAmount: 0,
    completedPayments: 0,
    failedPayments: 0,
    totalPlatformFees: 0,
    totalRiderEarnings: 0
  };
};

// Pre-save middleware to calculate earnings
PaymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isNew) {
    const earnings = this.calculateEarnings();
    this.platformFee = earnings.platformFee;
    this.riderEarnings = earnings.riderEarnings;
  }
  next();
});

// Pre-save middleware to set processedAt when status changes to completed
PaymentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.processedAt) {
    this.processedAt = new Date();
  }
  next();
});

// Model interface
export interface PaymentModel extends Model<PaymentDocument> {
  findByOffer(offerId: string): Promise<PaymentDocument | null>;
  findByBusiness(businessId: string, filters?: PaymentFilters): Promise<PaymentDocument[]>;
  findByRider(riderId: string, filters?: PaymentFilters): Promise<PaymentDocument[]>;
  getStats(filters?: PaymentFilters): Promise<PaymentStats>;
}

// Create and export the model
export const Payment = (mongoose.models.Payment as PaymentModel) || 
  mongoose.model<PaymentDocument, PaymentModel>('Payment', PaymentSchema);

// Export default for backward compatibility
export default Payment;