const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Payment = require('../models/Payment');
const AdminAuth = require('../middleware/adminAuth');
const adminRoutes = require('../routes/admin');
const { ErrorHandler } = require('../middleware/errorHandler');

// Test app setup
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(new ErrorHandler().handle());

describe('Admin Authentication and Routes', () => {
  let adminUser;
  let adminToken;
  let businessUser;
  let riderUser;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/lastmile_test');
    }
  });

  beforeEach(async () => {
    // Clear test data
    await User.deleteMany({});
    await Offer.deleteMany({});
    await Payment.deleteMany({});

    // Create test admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    adminUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      isVerified: true
    });

    // Create test business user
    businessUser = await User.create({
      name: 'Test Business',
      email: 'business@test.com',
      password: await bcrypt.hash('business123', 10),
      role: 'business',
      isVerified: true,
      profile: {
        businessName: 'Test Business Inc',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345'
        },
        businessPhone: '555-0123'
      }
    });

    // Create test rider user
    riderUser = await User.create({
      name: 'Test Rider',
      email: 'rider@test.com',
      password: await bcrypt.hash('rider123', 10),
      role: 'rider',
      isVerified: true,
      profile: {
        phone: '555-0456',
        vehicleType: 'bike',
        isAvailable: true
      }
    });

    // Generate admin token
    adminToken = AdminAuth.generateToken(adminUser);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Admin Authentication', () => {
    describe('POST /api/admin/login', () => {
      test('should login admin with valid credentials', async () => {
        const response = await request(app)
          .post('/api/admin/login')
          .send({
            email: 'admin@test.com',
            password: 'admin123'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.admin.role).toBe('admin');
        expect(response.body.data.admin.permissions).toContain('manage_users');
      });

      test('should reject invalid admin credentials', async () => {
        const response = await request(app)
          .post('/api/admin/login')
          .send({
            email: 'admin@test.com',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      test('should reject non-admin user login', async () => {
        const response = await request(app)
          .post('/api/admin/login')
          .send({
            email: 'business@test.com',
            password: 'business123'
          });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      test('should require email and password', async () => {
        const response = await request(app)
          .post('/api/admin/login')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/profile', () => {
      test('should get admin profile with valid token', async () => {
        const response = await request(app)
          .get('/api/admin/profile')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.admin.role).toBe('admin');
        expect(response.body.data.admin.email).toBe('admin@test.com');
      });

      test('should reject request without token', async () => {
        const response = await request(app)
          .get('/api/admin/profile');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      test('should reject invalid token', async () => {
        const response = await request(app)
          .get('/api/admin/profile')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/admin/logout', () => {
      test('should logout admin successfully', async () => {
        const response = await request(app)
          .post('/api/admin/logout')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Admin logout successful');
      });
    });
  });

  describe('Admin Dashboard', () => {
    beforeEach(async () => {
      // Create test offers and payments
      await Offer.create({
        businessId: businessUser._id,
        packageDetails: {
          description: 'Test package',
          weight: 1,
          dimensions: { length: 10, width: 10, height: 10 }
        },
        pickup: {
          address: 'Pickup Address',
          coordinates: [-122.4194, 37.7749]
        },
        delivery: {
          address: 'Delivery Address',
          coordinates: [-122.4094, 37.7849]
        },
        payment: { amount: 25.00, method: 'card' },
        status: 'pending'
      });

      await Payment.create({
        businessId: businessUser._id,
        amount: 25.00,
        status: 'completed',
        method: 'card'
      });
    });

    describe('GET /api/admin/dashboard', () => {
      test('should get dashboard overview', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.overview).toBeDefined();
        expect(response.body.data.overview.totalUsers).toBeGreaterThan(0);
        expect(response.body.data.overview.totalBusinesses).toBe(1);
        expect(response.body.data.overview.totalRiders).toBe(1);
        expect(response.body.data.todayStats).toBeDefined();
      });

      test('should require admin authentication', async () => {
        const response = await request(app)
          .get('/api/admin/dashboard');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('User Management', () => {
    describe('GET /api/admin/users', () => {
      test('should get users list with pagination', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.users).toBeDefined();
        expect(response.body.data.pagination).toBeDefined();
        expect(response.body.data.users.length).toBeGreaterThan(0);
      });

      test('should filter users by role', async () => {
        const response = await request(app)
          .get('/api/admin/users?role=business')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.users.every(user => user.role === 'business')).toBe(true);
      });

      test('should search users by name or email', async () => {
        const response = await request(app)
          .get('/api/admin/users?search=Test Business')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.users.length).toBeGreaterThan(0);
      });

      test('should require admin authentication', async () => {
        const response = await request(app)
          .get('/api/admin/users');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/users/:userId', () => {
      test('should get specific user details', async () => {
        const response = await request(app)
          .get(`/api/admin/users/${businessUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user._id).toBe(businessUser._id.toString());
        expect(response.body.data.recentOffers).toBeDefined();
        expect(response.body.data.recentPayments).toBeDefined();
      });

      test('should return 404 for non-existent user', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .get(`/api/admin/users/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/admin/users/:userId/verify', () => {
      test('should verify user successfully', async () => {
        // First unverify the user
        await User.findByIdAndUpdate(businessUser._id, { isVerified: false });

        const response = await request(app)
          .patch(`/api/admin/users/${businessUser._id}/verify`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isVerified: true });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.isVerified).toBe(true);
      });

      test('should unverify user successfully', async () => {
        const response = await request(app)
          .patch(`/api/admin/users/${businessUser._id}/verify`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isVerified: false });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.isVerified).toBe(false);
      });

      test('should require boolean isVerified value', async () => {
        const response = await request(app)
          .patch(`/api/admin/users/${businessUser._id}/verify`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isVerified: 'true' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/admin/users/:userId/suspend', () => {
      test('should suspend user successfully', async () => {
        const response = await request(app)
          .patch(`/api/admin/users/${businessUser._id}/suspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            suspended: true, 
            reason: 'Violation of terms' 
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.profile.suspended).toBe(true);
        expect(response.body.data.user.profile.suspensionReason).toBe('Violation of terms');
      });

      test('should unsuspend user successfully', async () => {
        // First suspend the user
        await User.findByIdAndUpdate(businessUser._id, {
          'profile.suspended': true,
          'profile.suspensionReason': 'Test suspension'
        });

        const response = await request(app)
          .patch(`/api/admin/users/${businessUser._id}/suspend`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ suspended: false });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.profile.suspended).toBe(false);
        expect(response.body.data.user.profile.suspensionReason).toBeUndefined();
      });
    });
  });

  describe('Analytics', () => {
    describe('GET /api/admin/analytics', () => {
      test('should get analytics data', async () => {
        const response = await request(app)
          .get('/api/admin/analytics')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe('7d');
        expect(response.body.data.userGrowth).toBeDefined();
        expect(response.body.data.offerStats).toBeDefined();
        expect(response.body.data.paymentStats).toBeDefined();
      });

      test('should support different time periods', async () => {
        const response = await request(app)
          .get('/api/admin/analytics?period=24h')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.period).toBe('24h');
      });

      test('should require admin authentication', async () => {
        const response = await request(app)
          .get('/api/admin/analytics');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('System Health', () => {
    describe('GET /api/admin/system/health', () => {
      test('should get system health status', async () => {
        const response = await request(app)
          .get('/api/admin/system/health')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('healthy');
        expect(response.body.data.services.database).toBeDefined();
        expect(response.body.data.services.server).toBeDefined();
      });

      test('should require admin authentication', async () => {
        const response = await request(app)
          .get('/api/admin/system/health');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('System Monitoring and Metrics', () => {
    beforeEach(async () => {
      // Create additional test data for monitoring
      await Offer.create([
        {
          businessId: businessUser._id,
          packageDetails: { description: 'Test package 1', weight: 1, dimensions: { length: 10, width: 10, height: 10 } },
          pickup: { address: 'Pickup 1', coordinates: [-122.4194, 37.7749] },
          delivery: { address: 'Delivery 1', coordinates: [-122.4094, 37.7849] },
          payment: { amount: 25.00, method: 'card' },
          status: 'delivered',
          riderId: riderUser._id
        },
        {
          businessId: businessUser._id,
          packageDetails: { description: 'Test package 2', weight: 2, dimensions: { length: 15, width: 15, height: 15 } },
          pickup: { address: 'Pickup 2', coordinates: [-122.4194, 37.7749] },
          delivery: { address: 'Delivery 2', coordinates: [-122.4094, 37.7849] },
          payment: { amount: 30.00, method: 'card' },
          status: 'failed'
        }
      ]);

      await Payment.create([
        {
          businessId: businessUser._id,
          riderId: riderUser._id,
          amount: 25.00,
          status: 'completed',
          method: 'card'
        },
        {
          businessId: businessUser._id,
          amount: 30.00,
          status: 'failed',
          method: 'card'
        }
      ]);
    });

    describe('GET /api/admin/system/metrics', () => {
      test('should get detailed system metrics', async () => {
        const response = await request(app)
          .get('/api/admin/system/metrics')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.system).toBeDefined();
        expect(response.body.data.process).toBeDefined();
        expect(response.body.data.database).toBeDefined();
        expect(response.body.data.system.platform).toBeDefined();
        expect(response.body.data.process.uptime).toBeGreaterThan(0);
        expect(response.body.data.database.status).toBe('connected');
      });

      test('should require admin authentication and analytics permission', async () => {
        const response = await request(app)
          .get('/api/admin/system/metrics');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/monitoring/user-activity', () => {
      test('should get user activity monitoring data', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/user-activity')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.recentRegistrations).toBeDefined();
        expect(response.body.data.recentOffers).toBeDefined();
        expect(response.body.data.recentPayments).toBeDefined();
        expect(response.body.data.summary.period).toBe('24h');
      });

      test('should support different time periods', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/user-activity?period=1h&limit=50')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.summary.period).toBe('1h');
      });

      test('should require admin authentication and analytics permission', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/user-activity');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/monitoring/performance', () => {
      test('should get platform performance metrics', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/performance')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.deliveryMetrics).toBeDefined();
        expect(response.body.data.offerMetrics).toBeDefined();
        expect(response.body.data.paymentMetrics).toBeDefined();
        expect(response.body.data.userMetrics).toBeDefined();
        expect(response.body.data.period).toBe('24h');
      });

      test('should calculate performance metrics correctly', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/performance')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.deliveryMetrics.totalDeliveries).toBeGreaterThanOrEqual(0);
        expect(response.body.data.offerMetrics.totalOffers).toBeGreaterThanOrEqual(0);
        expect(response.body.data.paymentMetrics.totalPayments).toBeGreaterThanOrEqual(0);
        expect(response.body.data.userMetrics.totalUsers).toBeGreaterThanOrEqual(0);
      });

      test('should support different time periods', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/performance?period=7d')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.period).toBe('7d');
      });

      test('should require admin authentication and analytics permission', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/performance');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/monitoring/errors', () => {
      test('should get error monitoring data', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/errors')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.failedOffers).toBeDefined();
        expect(response.body.data.failedPayments).toBeDefined();
        expect(response.body.data.suspendedUsers).toBeDefined();
        expect(response.body.data.summary.period).toBe('24h');
      });

      test('should track failed operations correctly', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/errors')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.summary.totalFailedOffers).toBeGreaterThanOrEqual(0);
        expect(response.body.data.summary.totalFailedPayments).toBeGreaterThanOrEqual(0);
        expect(response.body.data.summary.errorsByType).toBeDefined();
      });

      test('should support different time periods and limits', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/errors?period=7d&limit=25')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.summary.period).toBe('7d');
      });

      test('should require admin authentication and analytics permission', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/errors');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/admin/monitoring/status', () => {
      test('should get real-time platform status', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/status')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBeDefined();
        expect(response.body.data.metrics).toBeDefined();
        expect(response.body.data.metrics.activeUsers).toBeGreaterThanOrEqual(0);
        expect(response.body.data.metrics.activeOffers).toBeGreaterThanOrEqual(0);
        expect(response.body.data.metrics.onlineRiders).toBeGreaterThanOrEqual(0);
        expect(response.body.data.metrics.pendingPayments).toBeGreaterThanOrEqual(0);
        expect(response.body.data.metrics.recentErrors).toBeGreaterThanOrEqual(0);
        expect(response.body.data.uptime).toBeGreaterThan(0);
      });

      test('should determine system status correctly', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/status')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(['healthy', 'warning', 'degraded']).toContain(response.body.data.status);
        expect(Array.isArray(response.body.data.issues)).toBe(true);
      });

      test('should require admin authentication', async () => {
        const response = await request(app)
          .get('/api/admin/monitoring/status');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });
});

describe('AdminAuth Middleware', () => {
  let adminUser;
  let businessUser;

  beforeEach(async () => {
    await User.deleteMany({});

    adminUser = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      isVerified: true
    });

    businessUser = await User.create({
      name: 'Test Business',
      email: 'business@test.com',
      password: await bcrypt.hash('business123', 10),
      role: 'business',
      isVerified: true,
      profile: {
        businessName: 'Test Business Inc',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345'
        },
        businessPhone: '555-0123'
      }
    });
  });

  describe('validateAdminLogin', () => {
    test('should validate correct admin credentials', async () => {
      const result = await AdminAuth.validateAdminLogin('admin@test.com', 'admin123');
      
      expect(result.success).toBe(true);
      expect(result.admin).toBeDefined();
      expect(result.admin.role).toBe('admin');
    });

    test('should reject incorrect password', async () => {
      const result = await AdminAuth.validateAdminLogin('admin@test.com', 'wrongpassword');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid admin credentials');
    });

    test('should reject non-admin user', async () => {
      const result = await AdminAuth.validateAdminLogin('business@test.com', 'business123');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid admin credentials');
    });

    test('should reject non-existent user', async () => {
      const result = await AdminAuth.validateAdminLogin('nonexistent@test.com', 'password');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid admin credentials');
    });
  });

  describe('generateToken', () => {
    test('should generate valid JWT token for admin', () => {
      const token = AdminAuth.generateToken(adminUser);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('createDefaultAdmin', () => {
    test('should create default admin user', async () => {
      const adminData = {
        name: 'Default Admin',
        email: 'default@admin.com',
        password: 'defaultpassword',
        isSuperAdmin: true
      };

      const admin = await AdminAuth.createDefaultAdmin(adminData);
      
      expect(admin).toBeDefined();
      expect(admin.role).toBe('admin');
      expect(admin.email).toBe('default@admin.com');
      expect(admin.isVerified).toBe(true);
    });

    test('should not create duplicate admin', async () => {
      const adminData = {
        name: 'Duplicate Admin',
        email: 'admin@test.com', // Same as existing admin
        password: 'password'
      };

      await expect(AdminAuth.createDefaultAdmin(adminData))
        .rejects.toThrow('Admin user already exists');
    });
  });
});