const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Offer = require('../../models/Offer');
const Payment = require('../../models/Payment');
const Notification = require('../../models/Notification');

/**
 * Test Data Factories
 * Provides utilities for creating consistent test data
 */
class TestFactories {
  /**
   * Create a test user with specified role and attributes
   */
  static async createUser(overrides = {}) {
    const defaults = {
      name: 'Test User',
      email: `test${Date.now()}@example.com`,
      password: await bcrypt.hash('password123', 10),
      role: 'business',
      isVerified: true
    };

    const userData = { ...defaults, ...overrides };

    // Add role-specific profile data
    if (userData.role === 'business') {
      userData.profile = {
        businessName: 'Test Business Inc',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345',
          coordinates: [-122.4194, 37.7749]
        },
        businessPhone: '555-0123',
        ...userData.profile
      };
    } else if (userData.role === 'rider') {
      userData.profile = {
        phone: '555-0456',
        vehicleType: 'bike',
        currentLocation: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749]
        },
        isAvailable: true,
        rating: 5.0,
        completedDeliveries: 0,
        ...userData.profile
      };
    } else if (userData.role === 'admin') {
      userData.profile = {
        isSuperAdmin: false,
        ...userData.profile
      };
    }

    const user = new User(userData);
    await user.save();
    return user;
  }

  /**
   * Create a test business user
   */
  static async createBusinessUser(overrides = {}) {
    return this.createUser({
      role: 'business',
      name: 'Test Business Owner',
      email: `business${Date.now()}@example.com`,
      ...overrides
    });
  }

  /**
   * Create a test rider user
   */
  static async createRiderUser(overrides = {}) {
    return this.createUser({
      role: 'rider',
      name: 'Test Rider',
      email: `rider${Date.now()}@example.com`,
      ...overrides
    });
  }

  /**
   * Create a test admin user
   */
  static async createAdminUser(overrides = {}) {
    return this.createUser({
      role: 'admin',
      name: 'Test Admin',
      email: `admin${Date.now()}@example.com`,
      ...overrides
    });
  }

  /**
   * Create a test offer
   */
  static async createOffer(businessId, overrides = {}) {
    const defaults = {
      businessId: businessId || new mongoose.Types.ObjectId(),
      packageDetails: {
        description: 'Test package',
        weight: 2.5,
        dimensions: {
          length: 20,
          width: 15,
          height: 10
        },
        fragile: false,
        value: 50.00
      },
      pickup: {
        address: '123 Pickup Street, Pickup City, PC 12345',
        coordinates: [-122.4194, 37.7749],
        contactName: 'John Pickup',
        contactPhone: '555-0111',
        instructions: 'Ring doorbell'
      },
      delivery: {
        address: '456 Delivery Avenue, Delivery City, DC 67890',
        coordinates: [-122.4094, 37.7849],
        contactName: 'Jane Delivery',
        contactPhone: '555-0222',
        instructions: 'Leave at door'
      },
      payment: {
        amount: 25.00,
        method: 'card'
      },
      status: 'pending',
      urgency: 'standard',
      scheduledPickup: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    };

    const offerData = { ...defaults, ...overrides };
    const offer = new Offer(offerData);
    await offer.save();
    return offer;
  }

  /**
   * Create a test payment
   */
  static async createPayment(businessId, riderId, overrides = {}) {
    const defaults = {
      businessId: businessId || new mongoose.Types.ObjectId(),
      riderId: riderId || new mongoose.Types.ObjectId(),
      amount: 25.00,
      status: 'pending',
      method: 'card',
      transactionId: `txn_${Date.now()}`,
      description: 'Delivery payment'
    };

    const paymentData = { ...defaults, ...overrides };
    const payment = new Payment(paymentData);
    await payment.save();
    return payment;
  }

  /**
   * Create a test notification
   */
  static async createNotification(userId, overrides = {}) {
    const defaults = {
      userId: userId || new mongoose.Types.ObjectId(),
      type: 'offer_created',
      title: 'Test Notification',
      message: 'This is a test notification',
      data: {
        offerId: new mongoose.Types.ObjectId(),
        amount: 25.00
      },
      channels: ['in_app'],
      isRead: false,
      priority: 'normal'
    };

    const notificationData = { ...defaults, ...overrides };
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  }

  /**
   * Create multiple test users
   */
  static async createUsers(count, role = 'business', overrides = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser({
        role,
        name: `Test ${role} ${i + 1}`,
        email: `${role}${i + 1}_${Date.now()}@example.com`,
        ...overrides
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Create multiple test offers
   */
  static async createOffers(count, businessId, overrides = {}) {
    const offers = [];
    for (let i = 0; i < count; i++) {
      const offer = await this.createOffer(businessId, {
        packageDetails: {
          description: `Test package ${i + 1}`,
          weight: 1 + i,
          dimensions: { length: 10 + i, width: 10 + i, height: 10 + i }
        },
        payment: { amount: 20.00 + (i * 5) },
        ...overrides
      });
      offers.push(offer);
    }
    return offers;
  }

  /**
   * Create a complete test scenario with related data
   */
  static async createTestScenario(options = {}) {
    const {
      businessCount = 1,
      riderCount = 1,
      offerCount = 2,
      paymentCount = 1,
      notificationCount = 1
    } = options;

    // Create users
    const businesses = await this.createUsers(businessCount, 'business');
    const riders = await this.createUsers(riderCount, 'rider');
    const admin = await this.createAdminUser();

    // Create offers
    const offers = [];
    for (const business of businesses) {
      const businessOffers = await this.createOffers(offerCount, business._id);
      offers.push(...businessOffers);
    }

    // Create payments
    const payments = [];
    for (let i = 0; i < paymentCount; i++) {
      const business = businesses[i % businesses.length];
      const rider = riders[i % riders.length];
      const payment = await this.createPayment(business._id, rider._id);
      payments.push(payment);
    }

    // Create notifications
    const notifications = [];
    for (let i = 0; i < notificationCount; i++) {
      const user = [...businesses, ...riders][i % (businesses.length + riders.length)];
      const notification = await this.createNotification(user._id);
      notifications.push(notification);
    }

    return {
      businesses,
      riders,
      admin,
      offers,
      payments,
      notifications
    };
  }

  /**
   * Create test data with specific statuses for testing workflows
   */
  static async createWorkflowTestData() {
    const business = await this.createBusinessUser();
    const rider = await this.createRiderUser();

    // Create offers in different states
    const pendingOffer = await this.createOffer(business._id, { status: 'pending' });
    const acceptedOffer = await this.createOffer(business._id, { 
      status: 'accepted', 
      riderId: rider._id 
    });
    const inTransitOffer = await this.createOffer(business._id, { 
      status: 'in_transit', 
      riderId: rider._id 
    });
    const deliveredOffer = await this.createOffer(business._id, { 
      status: 'delivered', 
      riderId: rider._id 
    });

    // Create payments in different states
    const pendingPayment = await this.createPayment(business._id, rider._id, { 
      status: 'pending' 
    });
    const completedPayment = await this.createPayment(business._id, rider._id, { 
      status: 'completed' 
    });

    return {
      business,
      rider,
      offers: {
        pending: pendingOffer,
        accepted: acceptedOffer,
        inTransit: inTransitOffer,
        delivered: deliveredOffer
      },
      payments: {
        pending: pendingPayment,
        completed: completedPayment
      }
    };
  }

  /**
   * Clean up all test data
   */
  static async cleanup() {
    await Promise.all([
      User.deleteMany({}),
      Offer.deleteMany({}),
      Payment.deleteMany({}),
      Notification.deleteMany({})
    ]);
  }
}

module.exports = TestFactories;