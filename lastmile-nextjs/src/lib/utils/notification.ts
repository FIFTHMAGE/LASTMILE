/**
 * Notification utility functions
 */

export interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId: string;
  metadata?: Record<string, any>;
}

export function validateNotificationData(data: any): NotificationData {
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  if (!data.message || typeof data.message !== 'string') {
    throw new Error('Message is required and must be a string');
  }

  if (!data.userId || typeof data.userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }

  const validTypes = ['info', 'success', 'warning', 'error'];
  if (!data.type || !validTypes.includes(data.type)) {
    throw new Error('Type must be one of: info, success, warning, error');
  }

  return {
    title: data.title,
    message: data.message,
    type: data.type,
    userId: data.userId,
    metadata: data.metadata || {},
  };
}

export function formatNotificationForDisplay(notification: any) {
  return {
    id: notification._id?.toString() || notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    read: notification.read || false,
    createdAt: notification.createdAt,
    metadata: notification.metadata || {},
  };
}

// Additional notification utility functions

import { connectDB } from '@/lib/services/database';
import { Notification } from '@/lib/models/Notification';

export async function getUserNotifications(userId: string, options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) {
  await connectDB();
  
  const query: any = { userId };
  if (options?.unreadOnly) {
    query.status = 'unread';
  }

  return await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(options?.limit || 50)
    .skip(options?.offset || 0);
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  await connectDB();
  
  return await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { status: 'read', readAt: new Date() },
    { new: true }
  );
}

export async function markAllNotificationsAsRead(userId: string) {
  await connectDB();
  
  return await Notification.updateMany(
    { userId, status: 'unread' },
    { status: 'read', readAt: new Date() }
  );
}

export async function deleteNotification(notificationId: string, userId: string) {
  await connectDB();
  
  return await Notification.findOneAndDelete({
    _id: notificationId,
    userId
  });
}

export async function getUserNotificationStats(userId: string) {
  await connectDB();
  
  const stats = await Notification.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    unread: 0,
    read: 0,
    archived: 0
  };

  stats.forEach(stat => {
    result.total += stat.count;
    if (stat._id === 'unread') result.unread = stat.count;
    if (stat._id === 'read') result.read = stat.count;
    if (stat._id === 'archived') result.archived = stat.count;
  });

  return result;
}

// Notification creation helpers

export async function notifyWelcomeUser(userId: string, userType: 'business' | 'rider') {
  await connectDB();
  
  const notification = new Notification({
    userId,
    type: 'system_announcement',
    priority: 'medium',
    title: 'Welcome to LastMile!',
    message: `Welcome to LastMile Delivery Platform! Your ${userType} account has been created successfully.`,
    metadata: {
      category: 'welcome',
      userType
    }
  });

  return await notification.save();
}

export async function notifyOfferStatusUpdate(
  userId: string, 
  offerId: string, 
  status: string, 
  userType: 'business' | 'rider'
) {
  await connectDB();
  
  const statusMessages = {
    accepted: 'Your offer has been accepted by a rider',
    picked_up: 'Your package has been picked up',
    in_transit: 'Your package is in transit',
    delivered: 'Your package has been delivered',
    completed: 'Your delivery has been completed',
    cancelled: 'Your offer has been cancelled'
  };

  const notification = new Notification({
    userId,
    type: `offer_${status}` as any,
    priority: 'high',
    title: 'Offer Status Update',
    message: statusMessages[status as keyof typeof statusMessages] || `Offer status updated to ${status}`,
    metadata: {
      offerId,
      status,
      userType
    }
  });

  return await notification.save();
}

export async function notifyRiderAssignment(riderId: string, offerId: string) {
  await connectDB();
  
  const notification = new Notification({
    userId: riderId,
    type: 'offer_accepted',
    priority: 'high',
    title: 'New Delivery Assignment',
    message: 'You have been assigned a new delivery. Please check the details and proceed to pickup.',
    metadata: {
      offerId,
      category: 'assignment'
    }
  });

  return await notification.save();
}

export async function notifySystemMaintenance(userId: string) {
  await connectDB();
  
  const notification = new Notification({
    userId,
    type: 'system_announcement',
    priority: 'medium',
    title: 'System Maintenance',
    message: 'The system will undergo maintenance. Some features may be temporarily unavailable.',
    metadata: {
      category: 'maintenance'
    }
  });

  return await notification.save();
}