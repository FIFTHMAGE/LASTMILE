/**
 * Notification model with TypeScript support
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  Notification as NotificationType,
  NotificationType as NotificationTypeEnum,
  NotificationPriority,
  NotificationStatus,
  NotificationChannel,
  NotificationSummary,
  NotificationFilters,
  NotificationStats
} from '@/lib/types';

// Extend mongoose Document with our Notification type
export interface NotificationDocument extends NotificationType, Document {
  markAsRead(): Promise<NotificationDocument>;
  markAsUnread(): Promise<NotificationDocument>;
  archive(): Promise<NotificationDocument>;
  getSummary(): NotificationSummary;
}

// Define the schema
const notificationSchema = new Schema<NotificationDocument>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User is required'],
    index: true
  },
  offer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Offer',
    index: true
  },
  type: { 
    type: String, 
    enum: {
      values: [
        'offer_created',
        'offer_accepted',
        'offer_picked_up',
        'offer_in_transit',
        'offer_delivered',
        'offer_completed',
        'offer_cancelled',
        'payment_received',
        'payment_failed',
        'email_verification',
        'system_announcement',
        'rider_nearby',
        'delivery_delayed'
      ] as NotificationTypeEnum[],
      message: 'Invalid notification type'
    },
    required: [true, 'Notification type is required'],
    index: true
  },
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: { 
    type: String, 
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'] as NotificationPriority[],
      message: 'Priority must be low, medium, high, or urgent'
    },
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['unread', 'read', 'archived'] as NotificationStatus[],
      message: 'Status must be unread, read, or archived'
    },
    default: 'unread',
    index: true
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  readAt: {
    type: Date,
    index: true
  },
  archivedAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true,
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

// Create indexes for efficient queries
notificationSchema.index({ user: 1, status: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });
notificationSchema.index({ user: 1, priority: 1 });
notificationSchema.index({ offer: 1 });
notificationSchema.index({ createdAt: -1 });

// Instance method: Mark notification as read
notificationSchema.methods.markAsRead = async function(this: NotificationDocument): Promise<NotificationDocument> {
  if (this.status !== 'read') {
    this.status = 'read';
    this.readAt = new Date();
    return await this.save();
  }
  return this;
};

// Instance method: Mark notification as unread
notificationSchema.methods.markAsUnread = async function(this: NotificationDocument): Promise<NotificationDocument> {
  if (this.status !== 'unread') {
    this.status = 'unread';
    this.readAt = undefined;
    return await this.save();
  }
  return this;
};

// Instance method: Archive notification
notificationSchema.methods.archive = async function(this: NotificationDocument): Promise<NotificationDocument> {
  if (this.status !== 'archived') {
    this.status = 'archived';
    this.archivedAt = new Date();
    return await this.save();
  }
  return this;
};

// Instance method: Get notification summary
notificationSchema.methods.getSummary = function(this: NotificationDocument): NotificationSummary {
  return {
    id: this._id.toString(),
    type: this.type,
    title: this.title,
    message: this.message,
    priority: this.priority,
    status: this.status,
    offer: this.offer ? {
      id: this.offer.toString(),
      title: (this.offer as any).title || 'Unknown Offer'
    } : undefined,
    readAt: this.readAt,
    createdAt: this.createdAt
  };
};

// Static method: Create notification
notificationSchema.statics.createNotification = async function(
  userId: string,
  type: NotificationTypeEnum,
  title: string,
  message: string,
  options: {
    offerId?: string;
    priority?: NotificationPriority;
    data?: Record<string, any>;
  } = {}
): Promise<NotificationDocument> {
  const notification = new this({
    user: userId,
    offer: options.offerId,
    type,
    title,
    message,
    priority: options.priority || 'medium',
    data: options.data || {}
  });
  
  return await notification.save();
};

// Static method: Get notifications for user with filtering
notificationSchema.statics.getNotificationsForUser = async function(
  userId: string,
  filters: NotificationFilters = {}
): Promise<{
  notifications: NotificationDocument[];
  total: number;
  hasMore: boolean;
}> {
  const query: any = { user: userId };
  
  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.offerId) {
    query.offer = filters.offerId;
  }
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
    if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
  }
  
  // Pagination
  const limit = Math.min(filters.limit || 50, 100);
  const skip = ((filters.page || 1) - 1) * limit;
  
  // Sorting
  const sortField = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
  const sort: any = {};
  sort[sortField] = sortOrder;
  
  // Execute queries
  const [notifications, total] = await Promise.all([
    this.find(query)
      .populate('offer', 'title status')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    this.countDocuments(query)
  ]);
  
  return {
    notifications,
    total,
    hasMore: skip + notifications.length < total
  };
};

// Static method: Mark multiple notifications as read
notificationSchema.statics.markMultipleAsRead = async function(
  userId: string,
  notificationIds: string[]
): Promise<number> {
  const result = await this.updateMany(
    {
      _id: { $in: notificationIds },
      user: userId,
      status: { $ne: 'read' }
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );
  
  return result.modifiedCount || 0;
};

// Static method: Mark all notifications as read for user
notificationSchema.statics.markAllAsReadForUser = async function(userId: string): Promise<number> {
  const result = await this.updateMany(
    {
      user: userId,
      status: 'unread'
    },
    {
      status: 'read',
      readAt: new Date()
    }
  );
  
  return result.modifiedCount || 0;
};

// Static method: Delete old notifications
notificationSchema.statics.deleteOldNotifications = async function(
  olderThanDays: number = 90
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['read', 'archived'] }
  });
  
  return result.deletedCount || 0;
};

// Static method: Get notification statistics for user
notificationSchema.statics.getStatsForUser = async function(userId: string): Promise<NotificationStats> {
  const [totalResult, statusResult, typeResult, priorityResult] = await Promise.all([
    this.countDocuments({ user: userId }),
    this.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ])
  ]);
  
  const stats: NotificationStats = {
    total: totalResult,
    unread: 0,
    read: 0,
    archived: 0,
    byType: {} as Record<NotificationTypeEnum, number>,
    byPriority: {} as Record<NotificationPriority, number>
  };
  
  // Process status results
  statusResult.forEach((item: any) => {
    stats[item._id as keyof Pick<NotificationStats, 'unread' | 'read' | 'archived'>] = item.count;
  });
  
  // Process type results
  typeResult.forEach((item: any) => {
    stats.byType[item._id as NotificationTypeEnum] = item.count;
  });
  
  // Process priority results
  priorityResult.forEach((item: any) => {
    stats.byPriority[item._id as NotificationPriority] = item.count;
  });
  
  return stats;
};

// Static method: Get recent notifications for user
notificationSchema.statics.getRecentForUser = async function(
  userId: string,
  limit: number = 10
): Promise<NotificationDocument[]> {
  return await this.find({ user: userId })
    .populate('offer', 'title status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method: Create offer-related notification
notificationSchema.statics.createOfferNotification = async function(
  userId: string,
  offerId: string,
  type: NotificationTypeEnum,
  offerTitle: string
): Promise<NotificationDocument> {
  const notificationMessages: Record<string, { title: string; message: string; priority: NotificationPriority }> = {
    offer_accepted: {
      title: 'Offer Accepted',
      message: `Your offer "${offerTitle}" has been accepted by a rider.`,
      priority: 'high'
    },
    offer_picked_up: {
      title: 'Package Picked Up',
      message: `The package for "${offerTitle}" has been picked up.`,
      priority: 'medium'
    },
    offer_in_transit: {
      title: 'Package In Transit',
      message: `The package for "${offerTitle}" is now in transit.`,
      priority: 'medium'
    },
    offer_delivered: {
      title: 'Package Delivered',
      message: `The package for "${offerTitle}" has been delivered.`,
      priority: 'high'
    },
    offer_completed: {
      title: 'Delivery Completed',
      message: `The delivery for "${offerTitle}" has been completed.`,
      priority: 'medium'
    },
    offer_cancelled: {
      title: 'Offer Cancelled',
      message: `The offer "${offerTitle}" has been cancelled.`,
      priority: 'medium'
    }
  };
  
  const messageData = notificationMessages[type];
  if (!messageData) {
    throw new Error(`Unknown notification type: ${type}`);
  }
  
  return await this.createNotification(
    userId,
    type,
    messageData.title,
    messageData.message,
    {
      offerId,
      priority: messageData.priority,
      data: { offerTitle }
    }
  );
};

// Define the model interface
interface NotificationModel extends Model<NotificationDocument> {
  createNotification(
    userId: string,
    type: NotificationTypeEnum,
    title: string,
    message: string,
    options?: {
      offerId?: string;
      priority?: NotificationPriority;
      data?: Record<string, any>;
    }
  ): Promise<NotificationDocument>;
  getNotificationsForUser(
    userId: string,
    filters?: NotificationFilters
  ): Promise<{
    notifications: NotificationDocument[];
    total: number;
    hasMore: boolean;
  }>;
  markMultipleAsRead(userId: string, notificationIds: string[]): Promise<number>;
  markAllAsReadForUser(userId: string): Promise<number>;
  deleteOldNotifications(olderThanDays?: number): Promise<number>;
  getStatsForUser(userId: string): Promise<NotificationStats>;
  getRecentForUser(userId: string, limit?: number): Promise<NotificationDocument[]>;
  createOfferNotification(
    userId: string,
    offerId: string,
    type: NotificationTypeEnum,
    offerTitle: string
  ): Promise<NotificationDocument>;
}

// Create and export the model
export const Notification = (mongoose.models.Notification as NotificationModel) || 
  mongoose.model<NotificationDocument, NotificationModel>('Notification', notificationSchema);

// Export types for use in other modules
export type { NotificationDocument, NotificationModel };