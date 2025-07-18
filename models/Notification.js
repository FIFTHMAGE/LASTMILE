const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  
  // Enhanced notification types
  type: { 
    type: String, 
    enum: [
      'offer_accepted',
      'offer_completed',
      'offer_cancelled',
      'pickup_ready',
      'picked_up',
      'in_transit',
      'delivered',
      'payment_processed',
      'payment_failed',
      'new_offer_nearby',
      'rider_assigned',
      'delivery_delayed',
      'delivery_issue',
      'rating_request',
      'system_maintenance',
      'account_verification',
      'profile_updated'
    ], 
    required: true 
  },
  
  // Enhanced message structure
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Additional notification data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Multi-channel support
  channels: [{
    type: String,
    enum: ['push', 'email', 'in_app', 'sms'],
    default: 'in_app'
  }],
  
  // Channel-specific delivery status
  deliveryStatus: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String }
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      opened: { type: Boolean, default: false },
      openedAt: { type: Date },
      error: { type: String }
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      error: { type: String }
    },
    in_app: {
      sent: { type: Boolean, default: true },
      sentAt: { type: Date, default: Date.now },
      delivered: { type: Boolean, default: true },
      deliveredAt: { type: Date, default: Date.now }
    }
  },
  
  // Priority and urgency
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Notification category
  category: {
    type: String,
    enum: ['delivery', 'payment', 'system', 'marketing', 'security'],
    default: 'delivery'
  },
  
  // Read status and interaction
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  
  // Action buttons/links
  actions: [{
    label: { type: String, required: true },
    action: { type: String, required: true }, // URL or action identifier
    style: { type: String, enum: ['primary', 'secondary', 'danger'], default: 'primary' }
  }],
  
  // Expiration and scheduling
  expiresAt: { type: Date },
  scheduledFor: { type: Date },
  
  // Metadata
  metadata: {
    source: { type: String, default: 'system' },
    version: { type: String, default: '1.0' },
    template: { type: String },
    locale: { type: String, default: 'en' }
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient queries
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ category: 1, priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ scheduledFor: 1 });

// Update the updatedAt field before saving
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.markAsDelivered = function(channel) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].delivered = true;
    this.deliveryStatus[channel].deliveredAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.markAsSent = function(channel) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].sent = true;
    this.deliveryStatus[channel].sentAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.setDeliveryError = function(channel, error) {
  if (this.deliveryStatus[channel]) {
    this.deliveryStatus[channel].error = error;
  }
  return this.save();
};

notificationSchema.methods.isExpired = function() {
  return this.expiresAt && this.expiresAt < new Date();
};

notificationSchema.methods.shouldSend = function() {
  if (this.isExpired()) return false;
  if (this.scheduledFor && this.scheduledFor > new Date()) return false;
  return true;
};

notificationSchema.methods.getDeliveryStatus = function() {
  const status = {};
  this.channels.forEach(channel => {
    status[channel] = this.deliveryStatus[channel] || {};
  });
  return status;
};

notificationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    category: this.category,
    priority: this.priority,
    channels: this.channels,
    read: this.read,
    readAt: this.readAt,
    actions: this.actions,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
    data: this.data
  };
};

// Static methods
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ user: userId, read: false });
};

notificationSchema.statics.getByCategory = function(userId, category, options = {}) {
  const query = { user: userId, category };
  const limit = options.limit || 50;
  const skip = options.skip || 0;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('offer', 'title status payment.amount');
};

notificationSchema.statics.getByPriority = function(userId, priority, options = {}) {
  const query = { user: userId, priority };
  const limit = options.limit || 50;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('offer', 'title status');
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

notificationSchema.statics.deleteExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

notificationSchema.statics.getScheduledNotifications = function() {
  return this.find({
    scheduledFor: { $lte: new Date() },
    'deliveryStatus.in_app.sent': false
  });
};

module.exports = mongoose.model('Notification', notificationSchema); 