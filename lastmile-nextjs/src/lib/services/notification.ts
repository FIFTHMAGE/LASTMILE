/**
 * Notification service for managing notifications
 */
import { Notification } from '@/lib/models/Notification';
import { NotificationData } from '@/lib/utils/notification';

export class NotificationService {
  static async createNotification(data: NotificationData) {
    try {
      const notification = new Notification({
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId,
        metadata: data.metadata,
        read: false,
        createdAt: new Date(),
      });

      return await notification.save();
    } catch (error) {
      throw new Error(`Failed to create notification: ${error}`);
    }
  }

  static async getUserNotifications(userId: string, limit: number = 50) {
    try {
      return await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      throw new Error(`Failed to get notifications: ${error}`);
    }
  }

  static async markAsRead(notificationId: string, userId: string) {
    try {
      return await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to mark notification as read: ${error}`);
    }
  }

  static async markAllAsRead(userId: string) {
    try {
      return await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );
    } catch (error) {
      throw new Error(`Failed to mark all notifications as read: ${error}`);
    }
  }

  static async deleteNotification(notificationId: string, userId: string) {
    try {
      return await Notification.findOneAndDelete({
        _id: notificationId,
        userId,
      });
    } catch (error) {
      throw new Error(`Failed to delete notification: ${error}`);
    }
  }

  static async getUnreadCount(userId: string) {
    try {
      return await Notification.countDocuments({
        userId,
        read: false,
      });
    } catch (error) {
      throw new Error(`Failed to get unread count: ${error}`);
    }
  }
}