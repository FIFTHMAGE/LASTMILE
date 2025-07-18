/**
 * Notification Service Configuration
 */
module.exports = {
  // General settings
  defaultExpiration: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxRetries: 3,
  
  // Email settings
  emailEnabled: true,
  emailFrom: 'notifications@lastmile.com',
  emailReplyTo: 'support@lastmile.com',
  
  // SMS settings
  smsEnabled: false, // Disabled by default
  smsFrom: 'LastMile',
  
  // Push notification settings
  pushEnabled: true,
  
  // Channel preferences by notification type
  channelPreferences: {
    offer_accepted: ['in_app', 'email'],
    offer_completed: ['in_app', 'push', 'email'],
    offer_cancelled: ['in_app', 'push', 'email'],
    pickup_ready: ['in_app', 'push'],
    picked_up: ['in_app'],
    in_transit: ['in_app'],
    delivered: ['in_app', 'push', 'email'],
    payment_processed: ['in_app', 'email'],
    payment_failed: ['in_app', 'push', 'email'],
    new_offer_nearby: ['push', 'in_app'],
    rider_assigned: ['in_app', 'push'],
    delivery_delayed: ['in_app', 'push', 'email'],
    delivery_issue: ['in_app', 'push', 'email'],
    rating_request: ['in_app', 'push'],
    system_maintenance: ['in_app'],
    account_verification: ['email'],
    profile_updated: ['in_app']
  },
  
  // Priority settings by notification type
  prioritySettings: {
    offer_accepted: 'normal',
    offer_completed: 'normal',
    offer_cancelled: 'high',
    pickup_ready: 'normal',
    picked_up: 'normal',
    in_transit: 'low',
    delivered: 'normal',
    payment_processed: 'normal',
    payment_failed: 'high',
    new_offer_nearby: 'normal',
    rider_assigned: 'normal',
    delivery_delayed: 'high',
    delivery_issue: 'high',
    rating_request: 'low',
    system_maintenance: 'normal',
    account_verification: 'high',
    profile_updated: 'low'
  },
  
  // Notification categories
  categories: {
    offer_accepted: 'delivery',
    offer_completed: 'delivery',
    offer_cancelled: 'delivery',
    pickup_ready: 'delivery',
    picked_up: 'delivery',
    in_transit: 'delivery',
    delivered: 'delivery',
    payment_processed: 'payment',
    payment_failed: 'payment',
    new_offer_nearby: 'delivery',
    rider_assigned: 'delivery',
    delivery_delayed: 'delivery',
    delivery_issue: 'delivery',
    rating_request: 'engagement',
    system_maintenance: 'system',
    account_verification: 'security',
    profile_updated: 'account'
  },
  
  // Scheduled job settings
  scheduledJobs: {
    processScheduled: {
      interval: 60000, // 1 minute
      enabled: true
    },
    cleanupExpired: {
      interval: 86400000, // 24 hours
      enabled: true
    }
  }
};