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