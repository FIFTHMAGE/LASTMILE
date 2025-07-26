/**
 * Notification-related TypeScript type definitions
 */

export type NotificationType = 
  | 'offer_created'
  | 'offer_accepted'
  | 'offer_picked_up'
  | 'offer_in_transit'
  | 'offer_delivered'
  | 'offer_completed'
  | 'offer_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'email_verification'
  | 'system_announcement'
  | 'rider_nearby'
  | 'delivery_delayed';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  _id: string;
  user: string; // User ID
  offer?: string; // Offer ID (optional)
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: Record<string, any>; // Additional data payload
  readAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification creation types
export interface CreateNotification {
  user: string;
  offer?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
}

// Notification update types
export interface UpdateNotification {
  status?: NotificationStatus;
  readAt?: Date;
  archivedAt?: Date;
}

// Notification summary for API responses
export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  offer?: {
    id: string;
    title: string;
  };
  readAt?: Date;
  createdAt: Date;
}

// Notification filtering and pagination
export interface NotificationFilters {
  status?: NotificationStatus;
  type?: NotificationType;
  priority?: NotificationPriority;
  offerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  page?: number;
  sortBy?: 'created' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// Notification preferences
export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  types: {
    [key in NotificationType]: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

// Notification delivery channels
export type NotificationChannel = 'email' | 'push' | 'sms' | 'in_app';

export interface NotificationDelivery {
  notificationId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
}

// Real-time notification events
export interface NotificationEvent {
  type: 'new_notification' | 'notification_read' | 'notification_archived';
  notification: NotificationSummary;
  userId: string;
  timestamp: Date;
}

// Notification statistics
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Bulk notification operations
export interface BulkNotificationOperation {
  notificationIds: string[];
  operation: 'mark_read' | 'mark_unread' | 'archive' | 'delete';
}

export interface BulkNotificationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

// Type guards
export function isValidNotificationType(type: string): type is NotificationType {
  return [
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
  ].includes(type);
}

export function isValidNotificationPriority(priority: string): priority is NotificationPriority {
  return ['low', 'medium', 'high', 'urgent'].includes(priority);
}

export function isValidNotificationStatus(status: string): status is NotificationStatus {
  return ['unread', 'read', 'archived'].includes(status);
}