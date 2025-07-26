/**
 * Payment and Notification Workflow Integration Tests
 * End-to-end tests for payment processing and notification delivery workflows
 */

const request = require('supertest');
const app = require('../../server');
const TestFactories = global.testUtils.TestFactories;
const TestHelpers = global.testUtils.TestHelpers;

describe('Payment and Notification Workflow Integration Tests', () => {
  let business, rider, businessToken, riderToken, completedOffer;

  beforeEach(async () => {
    // Clean database before each test
    await TestFactories.cleanup();

    // Create test users
    business = await TestFactories.createBusinessUser();
    rider = await TestFactories.createRiderUser();
    businessToken = TestHelpers.generateToken(business);
    riderToken = TestHelpers.generateToken(rider);

    // Create a completed offer for payment testing
    completedOffer = await TestFactories.createOffer(business._id, {
      status: 'delivered',
      riderId: rider._id,
      payment: { amount: 35.00, method: 'card' }
    });
  });

  describe('Payment Processing Workflow', () => {
    test('should complete full payment processing workflow', async () => {
      // Step 1: Create payment for completed delivery
      const paymentData = {
        offerId: completedOffer._id,
        amount: completedOffer.payment.amount,
        method: completedOffer.payment.method,
        description: 'Delivery payment for completed order'
      };

      const createPaymentResponse = await TestHelpers.post(
        app, 
        '/api/payments', 
        paymentData, 
        businessToken
      );
      const paymentCreateData = TestHelpers.expectSuccessResponse(createPaymentResponse, 201);
      const payment = TestHelpers.validatePaymentResponse(paymentCreateData.payment);

      expect(payment.businessId).toBe(business._id.toString());
      expect(payment.riderId).toBe(rider._id.toString());
      expect(payment.amount).toBe(paymentData.amount);
      expect(payment.status).toBe('pending');

      // Step 2: Process payment (simulate payment gateway)
      const processResponse = await TestHelpers.patch(
        app, 
        `/api/payments/${payment._id}/process`, 
        { 
          transactionId: 'txn_test_123456',
          gatewayResponse: { status: 'success', reference: 'ref_789' }
        }, 
        businessToken
      );
      const processData = TestHelpers.expectSuccessResponse(processResponse, 200);
      
      expect(processData.payment.status).toBe('completed');
      expect(processData.payment.transactionId).toBe('txn_test_123456');

      // Step 3: Verify rider earnings are updated
      const earningsResponse = await TestHelpers.get(
        app, 
        '/api/earnings/rider', 
        riderToken
      );
      const earningsData = TestHelpers.expectSuccessResponse(earningsResponse, 200);
      
      expect(earningsData.totalEarnings).toBeGreaterThan(0);
      expect(earningsData.recentPayments).toBeDefined();
      expect(earningsData.recentPayments.length).toBeGreaterThan(0);

      // Step 4: Business views payment history
      const paymentHistoryResponse = await TestHelpers.get(
        app, 
        '/api/payments/business', 
        businessToken
      );
      const historyData = TestHelpers.expectSuccessResponse(paymentHistoryResponse, 200);
      
      expect(historyData.payments).toBeDefined();
      expect(historyData.payments.length).toBeGreaterThan(0);
      
      const completedPayment = historyData.payments.find(p => p._id === payment._id);
      expect(completedPayment.status).toBe('completed');

      // Step 5: Generate payment receipt
      const receiptResponse = await TestHelpers.get(
        app, 
        `/api/payments/${payment._id}/receipt`, 
        businessToken
      );
      const receiptData = TestHelpers.expectSuccessResponse(receiptResponse, 200);
      
      expect(receiptData.receipt).toBeDefined();
      expect(receiptData.receipt.paymentId).toBe(payment._id);
      expect(receiptData.receipt.amount).toBe(payment.amount);
    });

    test('should handle payment failure workflow', async () => {
      // Create payment
      const paymentData = {
        offerId: completedOffer._id,
        amount: completedOffer.payment.amount,
        method: 'card',
        description: 'Test payment failure'
      };

      const createResponse = await TestHelpers.post(app, '/api/payments', paymentData, businessToken);
      const createData = TestHelpers.expectSuccessResponse(createResponse, 201);
      const payment = createData.payment;

      // Simulate payment failure
      const failResponse = await TestHelpers.patch(
        app, 
        `/api/payments/${payment._id}/process`, 
        { 
          transactionId: 'txn_failed_123',
          gatewayResponse: { 
            status: 'failed', 
            error: 'Insufficient funds',
            errorCode: 'INSUFFICIENT_FUNDS'
          }
        }, 
        businessToken
      );
      const failData = TestHelpers.expectSuccessResponse(failResponse, 200);
      
      expect(failData.payment.status).toBe('failed');
      expect(failData.payment.error).toBeDefined();

      // Retry payment with different method
      const retryResponse = await TestHelpers.patch(
        app, 
        `/api/payments/${payment._id}/retry`, 
        { method: 'cash' }, 
        businessToken
      );
      const retryData = TestHelpers.expectSuccessResponse(retryResponse, 200);
      
      expect(retryData.payment.method).toBe('cash');
      expect(retryData.payment.status).toBe('pending');
    });

    test('should handle refund workflow', async () => {
      // Create and complete payment
      const payment = await TestFactories.createPayment(business._id, rider._id, {
        status: 'completed',
        transactionId: 'txn_refund_test'
      });

      // Request refund
      const refundData = {
        amount: payment.amount * 0.5, // Partial refund
        reason: 'Service not satisfactory',
        type: 'partial'
      };

      const refundResponse = await TestHelpers.post(
        app, 
        `/api/payments/${payment._id}/refund`, 
        refundData, 
        businessToken
      );
      const refundResponseData = TestHelpers.expectSuccessResponse(refundResponse, 200);
      
      expect(refundResponseData.refund).toBeDefined();
      expect(refundResponseData.refund.amount).toBe(refundData.amount);
      expect(refundResponseData.refund.status).toBe('pending');

      // Process refund
      const processRefundResponse = await TestHelpers.patch(
        app, 
        `/api/payments/${payment._id}/refund/${refundResponseData.refund._id}/process`, 
        { transactionId: 'refund_txn_123' }, 
        businessToken
      );
      const processedRefund = TestHelpers.expectSuccessResponse(processRefundResponse, 200);
      
      expect(processedRefund.refund.status).toBe('completed');
    });
  });

  describe('Notification Delivery Workflow', () => {
    test('should complete full notification delivery workflow', async () => {
      // Step 1: Create notification for offer acceptance
      const notificationData = {
        userId: business._id,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your delivery offer has been accepted by a rider',
        data: {
          offerId: completedOffer._id,
          riderName: rider.name,
          estimatedPickup: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        },
        channels: ['in_app', 'email'],
        priority: 'high'
      };

      const createResponse = await TestHelpers.post(
        app, 
        '/api/notifications', 
        notificationData, 
        businessToken
      );
      const createData = TestHelpers.expectSuccessResponse(createResponse, 201);
      const notification = TestHelpers.validateNotificationResponse(createData.notification);

      expect(notification.userId).toBe(business._id.toString());
      expect(notification.type).toBe('offer_accepted');
      expect(notification.isRead).toBe(false);
      expect(notification.channels).toContain('in_app');
      expect(notification.channels).toContain('email');

      // Step 2: User retrieves notifications
      const getNotificationsResponse = await TestHelpers.get(
        app, 
        '/api/notifications', 
        businessToken
      );
      const notificationsData = TestHelpers.expectSuccessResponse(getNotificationsResponse, 200);
      
      expect(notificationsData.notifications).toBeDefined();
      expect(notificationsData.notifications.length).toBeGreaterThan(0);
      
      const foundNotification = notificationsData.notifications.find(n => n._id === notification._id);
      expect(foundNotification).toBeDefined();
      expect(foundNotification.isRead).toBe(false);

      // Step 3: Mark notification as read
      const markReadResponse = await TestHelpers.patch(
        app, 
        `/api/notifications/${notification._id}/read`, 
        {}, 
        businessToken
      );
      const readData = TestHelpers.expectSuccessResponse(markReadResponse, 200);
      
      expect(readData.notification.isRead).toBe(true);

      // Step 4: Get unread notification count
      const unreadResponse = await TestHelpers.get(
        app, 
        '/api/notifications/unread/count', 
        businessToken
      );
      const unreadData = TestHelpers.expectSuccessResponse(unreadResponse, 200);
      
      expect(unreadData.count).toBe(0); // Should be 0 since we marked the notification as read

      // Step 5: Delete notification
      const deleteResponse = await TestHelpers.delete(
        app, 
        `/api/notifications/${notification._id}`, 
        businessToken
      );
      TestHelpers.expectSuccessResponse(deleteResponse, 200);

      // Verify notification is deleted
      const verifyDeleteResponse = await TestHelpers.get(
        app, 
        `/api/notifications/${notification._id}`, 
        businessToken
      );
      TestHelpers.expectNotFoundError(verifyDeleteResponse);
    });

    test('should handle bulk notification operations', async () => {
      // Create multiple notifications
      const notifications = [];
      for (let i = 0; i < 5; i++) {
        const notification = await TestFactories.createNotification(business._id, {
          type: 'system_update',
          title: `System Update ${i + 1}`,
          message: `System update message ${i + 1}`,
          priority: i % 2 === 0 ? 'normal' : 'low'
        });
        notifications.push(notification);
      }

      // Mark all as read
      const markAllReadResponse = await TestHelpers.patch(
        app, 
        '/api/notifications/mark-all-read', 
        {}, 
        businessToken
      );
      const markAllData = TestHelpers.expectSuccessResponse(markAllReadResponse, 200);
      
      expect(markAllData.updatedCount).toBe(5);

      // Delete multiple notifications
      const notificationIds = notifications.slice(0, 3).map(n => n._id);
      const bulkDeleteResponse = await TestHelpers.delete(
        app, 
        '/api/notifications/bulk', 
        businessToken
      );
      // Note: You might need to send the IDs in the request body
      // This depends on your API implementation
    });

    test('should handle notification preferences', async () => {
      // Update notification preferences
      const preferencesData = {
        channels: {
          email: true,
          sms: false,
          push: true,
          in_app: true
        },
        types: {
          offer_accepted: 'high',
          offer_completed: 'normal',
          payment_received: 'high',
          system_updates: 'low'
        },
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'America/Los_Angeles'
        }
      };

      const updatePrefsResponse = await TestHelpers.patch(
        app, 
        '/api/notifications/preferences', 
        preferencesData, 
        businessToken
      );
      const prefsData = TestHelpers.expectSuccessResponse(updatePrefsResponse, 200);
      
      expect(prefsData.preferences.channels.email).toBe(true);
      expect(prefsData.preferences.channels.sms).toBe(false);
      expect(prefsData.preferences.quietHours.enabled).toBe(true);

      // Get notification preferences
      const getPrefsResponse = await TestHelpers.get(
        app, 
        '/api/notifications/preferences', 
        businessToken
      );
      const getPrefsData = TestHelpers.expectSuccessResponse(getPrefsResponse, 200);
      
      expect(getPrefsData.preferences.channels.email).toBe(true);
      expect(getPrefsData.preferences.types.offer_accepted).toBe('high');
    });
  });

  describe('Integrated Payment and Notification Workflow', () => {
    test('should trigger notifications for payment events', async () => {
      // Create payment
      const paymentData = {
        offerId: completedOffer._id,
        amount: 40.00,
        method: 'card',
        description: 'Integrated test payment'
      };

      const createPaymentResponse = await TestHelpers.post(
        app, 
        '/api/payments', 
        paymentData, 
        businessToken
      );
      const paymentCreateData = TestHelpers.expectSuccessResponse(createPaymentResponse, 201);
      const payment = paymentCreateData.payment;

      // Process payment (should trigger notifications)
      const processResponse = await TestHelpers.patch(
        app, 
        `/api/payments/${payment._id}/process`, 
        { 
          transactionId: 'txn_integrated_test',
          gatewayResponse: { status: 'success' }
        }, 
        businessToken
      );
      TestHelpers.expectSuccessResponse(processResponse, 200);

      // Check that payment completion notification was created for business
      const businessNotificationsResponse = await TestHelpers.get(
        app, 
        '/api/notifications?type=payment_completed', 
        businessToken
      );
      const businessNotifications = TestHelpers.expectSuccessResponse(businessNotificationsResponse, 200);
      
      expect(businessNotifications.notifications.length).toBeGreaterThan(0);
      const paymentNotification = businessNotifications.notifications.find(
        n => n.data && n.data.paymentId === payment._id
      );
      expect(paymentNotification).toBeDefined();

      // Check that earnings notification was created for rider
      const riderNotificationsResponse = await TestHelpers.get(
        app, 
        '/api/notifications?type=earnings_received', 
        riderToken
      );
      const riderNotifications = TestHelpers.expectSuccessResponse(riderNotificationsResponse, 200);
      
      expect(riderNotifications.notifications.length).toBeGreaterThan(0);
      const earningsNotification = riderNotifications.notifications.find(
        n => n.data && n.data.paymentId === payment._id
      );
      expect(earningsNotification).toBeDefined();
    });

    test('should handle payment failure notifications', async () => {
      // Create payment
      const payment = await TestFactories.createPayment(business._id, rider._id, {
        status: 'pending'
      });

      // Simulate payment failure
      const failResponse = await TestHelpers.patch(
        app, 
        `/api/payments/${payment._id}/process`, 
        { 
          transactionId: 'txn_fail_test',
          gatewayResponse: { 
            status: 'failed', 
            error: 'Card declined' 
          }
        }, 
        businessToken
      );
      TestHelpers.expectSuccessResponse(failResponse, 200);

      // Check that failure notification was created
      const notificationsResponse = await TestHelpers.get(
        app, 
        '/api/notifications?type=payment_failed', 
        businessToken
      );
      const notifications = TestHelpers.expectSuccessResponse(notificationsResponse, 200);
      
      expect(notifications.notifications.length).toBeGreaterThan(0);
      const failureNotification = notifications.notifications.find(
        n => n.data && n.data.paymentId === payment._id
      );
      expect(failureNotification).toBeDefined();
      expect(failureNotification.priority).toBe('high');
    });
  });

  describe('Real-time Notification Delivery', () => {
    test('should handle real-time notification delivery via WebSocket', async () => {
      // Note: This test would require WebSocket setup
      // For now, we'll test the HTTP-based real-time notification endpoint
      
      // Create notification
      const notificationData = {
        userId: rider._id,
        type: 'offer_available',
        title: 'New Offer Available',
        message: 'A new delivery offer is available in your area',
        data: { offerId: completedOffer._id },
        channels: ['push', 'in_app'],
        priority: 'high'
      };

      const createResponse = await TestHelpers.post(
        app, 
        '/api/notifications', 
        notificationData, 
        businessToken // Admin or system creates notification
      );
      const createData = TestHelpers.expectSuccessResponse(createResponse, 201);

      // Simulate real-time delivery check
      const realtimeResponse = await TestHelpers.get(
        app, 
        '/api/notifications/realtime', 
        riderToken
      );
      const realtimeData = TestHelpers.expectSuccessResponse(realtimeResponse, 200);
      
      expect(realtimeData.notifications).toBeDefined();
      expect(realtimeData.notifications.length).toBeGreaterThan(0);
      
      const realtimeNotification = realtimeData.notifications.find(
        n => n._id === createData.notification._id
      );
      expect(realtimeNotification).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent payment processing', async () => {
      // Create multiple payments
      const payments = [];
      for (let i = 0; i < 5; i++) {
        const payment = await TestFactories.createPayment(business._id, rider._id, {
          amount: 25.00 + i * 5,
          status: 'pending'
        });
        payments.push(payment);
      }

      // Process all payments concurrently
      const processPayment = (payment) => 
        TestHelpers.patch(
          app, 
          `/api/payments/${payment._id}/process`, 
          { 
            transactionId: `txn_concurrent_${payment._id}`,
            gatewayResponse: { status: 'success' }
          }, 
          businessToken
        );

      const results = await TestHelpers.loadTest(
        () => processPayment(payments[Math.floor(Math.random() * payments.length)]), 
        3, 
        10
      );
      
      expect(results.successfulRequests).toBeGreaterThan(0);
      expect(results.averageTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    test('should handle high-volume notification delivery', async () => {
      // Create notification for multiple users
      const users = await TestFactories.createUsers(10, 'rider');
      
      const createNotification = (user) => {
        const notificationData = {
          userId: user._id,
          type: 'system_announcement',
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight from 2-4 AM',
          channels: ['in_app'],
          priority: 'normal'
        };
        
        return TestHelpers.post(app, '/api/notifications', notificationData, businessToken);
      };

      const results = await TestHelpers.loadTest(
        () => createNotification(users[Math.floor(Math.random() * users.length)]), 
        5, 
        20
      );
      
      expect(results.successfulRequests).toBeGreaterThan(0);
      expect(results.failedRequests).toBe(0);
      expect(results.averageTime).toBeLessThan(1000);
    });
  });
});