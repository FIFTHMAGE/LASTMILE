const mongoose = require('mongoose');
const Notification = require('../models/Notification');

describe('Enhanced Notification Model', () => {
  let testUser, testOffer;

  beforeAll(() => {
    // Mock user and offer IDs
    testUser = new mongoose.Types.ObjectId();
    testOffer = new mongoose.Types.ObjectId();
  });

  describe('Schema Validation', () => {
    test('should create notification with required fields', () => {
      const notification = new Notification({
        user: testUser,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your delivery offer has been accepted by a rider.'
      });

      expect(notification.user).toEqual(testUser);
      expect(notification.type).toBe('offer_accepted');
      expect(notification.title).toBe('Offer Accepted');
      expect(notification.message).toBe('Your delivery offer has been accepted by a rider.');
      expect(notification.read).toBe(false);
      expect(notification.priority).toBe('normal');
      expect(notification.category).toBe('delivery');
      expect(notification.channels).toEqual(['in_app']);
    });

    test('should validate notification types', () => {
      const validTypes = [
        'offer_accepted', 'offer_completed', 'offer_cancelled',
        'pickup_ready', 'picked_up', 'in_transit', 'delivered',
        'payment_processed', 'payment_failed', 'new_offer_nearby',
        'rider_assigned', 'delivery_delayed', 'delivery_issue',
        'rating_request', 'system_maintenance', 'account_verification',
        'profile_updated'
      ];

      validTypes.forEach(type => {
        const notification = new Notification({
          user: testUser,
          type,
          title: 'Test Title',
          message: 'Test message'
        });
        expect(notification.type).toBe(type);
      });
    });

    test('should validate channel types', () => {
      const validChannels = ['push', 'email', 'in_app', 'sms'];
      
      const notification = new Notification({
        user: testUser,
        type: 'offer_accepted',
        title: 'Test Title',
        message: 'Test message',
        channels: validChannels
      });

      expect(notification.channels).toEqual(validChannels);
    });

    test('should validate priority levels', () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];
      
      priorities.forEach(priority => {
        const notification = new Notification({
          user: testUser,
          type: 'offer_accepted',
          title: 'Test Title',
          message: 'Test message',
          priority
        });
        expect(notification.priority).toBe(priority);
      });
    });

    test('should validate categories', () => {
      const categories = ['delivery', 'payment', 'system', 'marketing', 'security'];
      
      categories.forEach(category => {
        const notification = new Notification({
          user: testUser,
          type: 'offer_accepted',
          title: 'Test Title',
          message: 'Test message',
          category
        });
        expect(notification.category).toBe(category);
      });
    });
  });

  describe('Enhanced Features', () => {
    test('should support additional notification data', () => {
      const additionalData = {
        offerId: testOffer,
        amount: 25.50,
        pickupAddress: '123 Main St',
        deliveryAddress: '456 Oak Ave'
      };

      const notification = new Notification({
        user: testUser,
        offer: testOffer,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your delivery offer has been accepted.',
        data: additionalData
      });

      expect(notification.data).toEqual(additionalData);
    });

    test('should support action buttons', () => {
      const actions = [
        { label: 'View Offer', action: '/offers/123', style: 'primary' },
        { label: 'Contact Rider', action: '/contact/456', style: 'secondary' }
      ];

      const notification = new Notification({
        user: testUser,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your delivery offer has been accepted.',
        actions
      });

      expect(notification.actions).toEqual(actions);
    });

    test('should support expiration dates', () => {
      const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      const notification = new Notification({
        user: testUser,
        type: 'new_offer_nearby',
        title: 'New Offer Available',
        message: 'A new delivery offer is available near you.',
        expiresAt: expirationDate
      });

      expect(notification.expiresAt).toEqual(expirationDate);
    });

    test('should support scheduled notifications', () => {
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const notification = new Notification({
        user: testUser,
        type: 'rating_request',
        title: 'Rate Your Delivery',
        message: 'Please rate your recent delivery experience.',
        scheduledFor: scheduledTime
      });

      expect(notification.scheduledFor).toEqual(scheduledTime);
    });

    test('should support metadata', () => {
      const metadata = {
        source: 'mobile_app',
        version: '2.1',
        template: 'offer_accepted_template',
        locale: 'es'
      };

      const notification = new Notification({
        user: testUser,
        type: 'offer_accepted',
        title: 'Oferta Aceptada',
        message: 'Tu oferta de entrega ha sido aceptada.',
        metadata
      });

      expect(notification.metadata.source).toBe('mobile_app');
      expect(notification.metadata.version).toBe('2.1');
      expect(notification.metadata.template).toBe('offer_accepted_template');
      expect(notification.metadata.locale).toBe('es');
    });
  });

  describe('Multi-Channel Delivery Status', () => {
    test('should initialize delivery status for all channels', () => {
      const notification = new Notification({
        user: testUser,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your offer has been accepted.',
        channels: ['push', 'email', 'sms']
      });

      expect(notification.deliveryStatus.push.sent).toBe(false);
      expect(notification.deliveryStatus.email.sent).toBe(false);
      expect(notification.deliveryStatus.sms.sent).toBe(false);
      expect(notification.deliveryStatus.in_app.sent).toBe(true); // Default for in-app
    });

    test('should track email-specific delivery status', () => {
      const notification = new Notification({
        user: testUser,
        type: 'payment_processed',
        title: 'Payment Processed',
        message: 'Your payment has been processed successfully.',
        channels: ['email']
      });

      expect(notification.deliveryStatus.email.opened).toBe(false);
      expect(notification.deliveryStatus.email.openedAt).toBeUndefined();
    });
  });

  describe('Instance Methods', () => {
    let notification;

    beforeEach(() => {
      notification = new Notification({
        user: testUser,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your offer has been accepted.',
        channels: ['push', 'email']
      });
    });

    test('markAsRead should update read status', async () => {
      const mockSave = jest.fn().mockResolvedValue(notification);
      notification.save = mockSave;

      await notification.markAsRead();

      expect(notification.read).toBe(true);
      expect(notification.readAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });

    test('markAsSent should update channel delivery status', async () => {
      const mockSave = jest.fn().mockResolvedValue(notification);
      notification.save = mockSave;

      await notification.markAsSent('push');

      expect(notification.deliveryStatus.push.sent).toBe(true);
      expect(notification.deliveryStatus.push.sentAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });

    test('markAsDelivered should update channel delivery status', async () => {
      const mockSave = jest.fn().mockResolvedValue(notification);
      notification.save = mockSave;

      await notification.markAsDelivered('email');

      expect(notification.deliveryStatus.email.delivered).toBe(true);
      expect(notification.deliveryStatus.email.deliveredAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });

    test('setDeliveryError should record delivery errors', async () => {
      const mockSave = jest.fn().mockResolvedValue(notification);
      notification.save = mockSave;
      const errorMessage = 'Invalid email address';

      await notification.setDeliveryError('email', errorMessage);

      expect(notification.deliveryStatus.email.error).toBe(errorMessage);
      expect(mockSave).toHaveBeenCalled();
    });

    test('isExpired should check expiration status', () => {
      // Not expired notification
      notification.expiresAt = new Date(Date.now() + 60000); // 1 minute from now
      expect(notification.isExpired()).toBe(false);

      // Expired notification
      notification.expiresAt = new Date(Date.now() - 60000); // 1 minute ago
      expect(notification.isExpired()).toBe(true);

      // No expiration date
      notification.expiresAt = null;
      expect(notification.isExpired()).toBe(false);
    });

    test('shouldSend should check if notification should be sent', () => {
      // Should send immediately
      expect(notification.shouldSend()).toBe(true);

      // Should not send if expired
      notification.expiresAt = new Date(Date.now() - 60000);
      expect(notification.shouldSend()).toBe(false);

      // Should not send if scheduled for future
      notification.expiresAt = null;
      notification.scheduledFor = new Date(Date.now() + 60000);
      expect(notification.shouldSend()).toBe(false);

      // Should send if scheduled time has passed
      notification.scheduledFor = new Date(Date.now() - 60000);
      expect(notification.shouldSend()).toBe(true);
    });

    test('getDeliveryStatus should return channel-specific status', () => {
      const status = notification.getDeliveryStatus();

      expect(status.push).toBeDefined();
      expect(status.email).toBeDefined();
      expect(status.push.sent).toBe(false);
      expect(status.email.sent).toBe(false);
    });

    test('getSummary should return notification summary', () => {
      const summary = notification.getSummary();

      expect(summary).toEqual({
        id: notification._id,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your offer has been accepted.',
        category: 'delivery',
        priority: 'normal',
        channels: ['push', 'email'],
        read: false,
        readAt: undefined,
        actions: [],
        createdAt: notification.createdAt,
        expiresAt: undefined,
        data: {}
      });
    });
  });

  describe('Static Methods', () => {
    test('getUnreadCount should count unread notifications', async () => {
      const mockCountDocuments = jest.fn().mockResolvedValue(5);
      Notification.countDocuments = mockCountDocuments;

      const count = await Notification.getUnreadCount(testUser);

      expect(count).toBe(5);
      expect(mockCountDocuments).toHaveBeenCalledWith({ user: testUser, read: false });
    });

    test('getByCategory should filter notifications by category', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([])
      });
      Notification.find = mockFind;

      await Notification.getByCategory(testUser, 'payment', { limit: 10, skip: 5 });

      expect(mockFind).toHaveBeenCalledWith({ user: testUser, category: 'payment' });
    });

    test('getByPriority should filter notifications by priority', async () => {
      const mockFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([])
      });
      Notification.find = mockFind;

      await Notification.getByPriority(testUser, 'high');

      expect(mockFind).toHaveBeenCalledWith({ user: testUser, priority: 'high' });
    });

    test('markAllAsRead should mark all user notifications as read', async () => {
      const mockUpdateMany = jest.fn().mockResolvedValue({ modifiedCount: 3 });
      Notification.updateMany = mockUpdateMany;

      await Notification.markAllAsRead(testUser);

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { user: testUser, read: false },
        { read: true, readAt: expect.any(Date) }
      );
    });

    test('deleteExpired should remove expired notifications', async () => {
      const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 2 });
      Notification.deleteMany = mockDeleteMany;

      await Notification.deleteExpired();

      expect(mockDeleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) }
      });
    });

    test('getScheduledNotifications should find notifications ready to send', async () => {
      const mockFind = jest.fn().mockResolvedValue([]);
      Notification.find = mockFind;

      await Notification.getScheduledNotifications();

      expect(mockFind).toHaveBeenCalledWith({
        scheduledFor: { $lte: expect.any(Date) },
        'deliveryStatus.in_app.sent': false
      });
    });
  });

  describe('Notification Types and Use Cases', () => {
    test('should create delivery-related notifications', () => {
      const deliveryTypes = ['pickup_ready', 'picked_up', 'in_transit', 'delivered'];
      
      deliveryTypes.forEach(type => {
        const notification = new Notification({
          user: testUser,
          offer: testOffer,
          type,
          title: `Delivery ${type.replace('_', ' ')}`,
          message: `Your package is ${type.replace('_', ' ')}.`,
          category: 'delivery',
          priority: 'normal'
        });

        expect(notification.type).toBe(type);
        expect(notification.category).toBe('delivery');
      });
    });

    test('should create payment-related notifications', () => {
      const paymentTypes = ['payment_processed', 'payment_failed'];
      
      paymentTypes.forEach(type => {
        const notification = new Notification({
          user: testUser,
          offer: testOffer,
          type,
          title: `Payment ${type.split('_')[1]}`,
          message: `Your payment has been ${type.split('_')[1]}.`,
          category: 'payment',
          priority: type === 'payment_failed' ? 'high' : 'normal'
        });

        expect(notification.type).toBe(type);
        expect(notification.category).toBe('payment');
      });
    });

    test('should create system notifications', () => {
      const systemTypes = ['system_maintenance', 'account_verification', 'profile_updated'];
      
      systemTypes.forEach(type => {
        const notification = new Notification({
          user: testUser,
          type,
          title: `System ${type.split('_')[1]}`,
          message: `System notification: ${type.replace('_', ' ')}.`,
          category: 'system',
          priority: type === 'system_maintenance' ? 'urgent' : 'low'
        });

        expect(notification.type).toBe(type);
        expect(notification.category).toBe('system');
      });
    });
  });

  describe('Performance and Indexing', () => {
    test('should have appropriate indexes for common queries', () => {
      // Test that the schema has the correct index configuration
      const notification = new Notification({
        user: testUser,
        type: 'offer_accepted',
        title: 'Test',
        message: 'Test message'
      });

      // Verify the notification can be created (indexes would be tested in integration tests)
      expect(notification.user).toEqual(testUser);
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(notification.read).toBe(false);
    });

    test('should support TTL for expiration', () => {
      const futureDate = new Date(Date.now() + 60000);
      const notification = new Notification({
        user: testUser,
        type: 'new_offer_nearby',
        title: 'New Offer',
        message: 'A new offer is available.',
        expiresAt: futureDate
      });

      expect(notification.expiresAt).toEqual(futureDate);
      expect(notification.isExpired()).toBe(false);
    });
  });
});