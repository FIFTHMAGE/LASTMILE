const NotificationService = require('../services/NotificationService');

describe('NotificationService', () => {
  let notificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  test('should initialize with default options', () => {
    expect(notificationService.defaultOptions.defaultChannels).toEqual(['in_app']);
    expect(notificationService.defaultOptions.enablePush).toBe(true);
    expect(notificationService.defaultOptions.maxRetries).toBe(3);
  });

  test('should allow custom options', () => {
    const customService = new NotificationService({
      defaultChannels: ['push', 'email'],
      maxRetries: 5
    });
    
    expect(customService.defaultOptions.defaultChannels).toEqual(['push', 'email']);
    expect(customService.defaultOptions.maxRetries).toBe(5);
  });

  test('should initialize channel providers', () => {
    expect(notificationService.channelProviders.push).toBeDefined();
    expect(notificationService.channelProviders.email).toBeDefined();
    expect(notificationService.channelProviders.sms).toBeDefined();
    expect(notificationService.channelProviders.in_app).toBeDefined();
  });

  test('should get notification template for business recipient', () => {
    const template = notificationService._getNotificationTemplate('offer_accepted', 'business');
    
    expect(template).toBeDefined();
    expect(template.title).toBe('Offer Accepted');
    expect(template.message).toBe('Your delivery offer has been accepted by a rider.');
    expect(template.channels).toContain('in_app');
    expect(template.priority).toBe('normal');
  });

  test('should return null for invalid template', () => {
    const template = notificationService._getNotificationTemplate('invalid_type', 'business');
    expect(template).toBeNull();
  });

  test('should format template strings', () => {
    const template = 'Hello {user.name}, your order {order.id} is ready';
    const data = {
      user: { name: 'John' },
      order: { id: '12345' }
    };
    
    const result = notificationService._formatTemplate(template, data);
    expect(result).toBe('Hello John, your order 12345 is ready');
  });

  test('should handle missing template data', () => {
    const template = 'Hello {user.name}, your order {missing.field} is ready';
    const data = { user: { name: 'John' } };
    
    const result = notificationService._formatTemplate(template, data);
    expect(result).toBe('Hello John, your order {missing.field} is ready');
  });
});