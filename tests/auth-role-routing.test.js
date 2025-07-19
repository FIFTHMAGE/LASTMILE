const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// Mock Express app setup
const express = require('express');
const app = express();
app.use(express.json());

// Import routes
const authRoutes = require('../routes/auth');
app.use('/api/auth', authRoutes);

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key';

// Mock User model
jest.mock('../models/User');
jest.mock('../models/LocationTracking');

describe('Role-Specific Authentication and Dashboard Routing', () => {
  let businessUser, riderUser, businessToken, riderToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup test users
    businessUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Business',
      email: 'business@test.com',
      password: 'hashedpassword',
      role: 'business',
      isVerified: true,
      profile: {
        businessName: 'Test Company',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345',
          coordinates: [-74.006, 40.7128]
        },
        businessPhone: '555-0123'
      },
      getProfileData: jest.fn().mockReturnValue({
        id: new mongoose.Types.ObjectId(),
        name: 'Test Business',
        email: 'business@test.com',
        role: 'business',
        businessName: 'Test Company',
        businessPhone: '555-0123'
      })
    };

    riderUser = {
      _id: new mongoose.Types.ObjectId(),
      name: 'Test Rider',
      email: 'rider@test.com',
      password: 'hashedpassword',
      role: 'rider',
      isVerified: true,
      profile: {
        phone: '555-0456',
        vehicleType: 'bike',
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        isAvailable: true,
        rating: 4.8,
        completedDeliveries: 25
      },
      getProfileData: jest.fn().mockReturnValue({
        id: new mongoose.Types.ObjectId(),
        name: 'Test Rider',
        email: 'rider@test.com',
        role: 'rider',
        phone: '555-0456',
        vehicleType: 'bike',
        isAvailable: true,
        rating: 4.8,
        completedDeliveries: 25
      })
    };

    // Generate test tokens
    businessToken = jwt.sign(
      { id: businessUser._id, role: 'business', isVerified: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    riderToken = jwt.sign(
      { id: riderUser._id, role: 'rider', isVerified: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  });

  describe('POST /api/auth/login - Role-specific login responses', () => {
    test('should return business-specific dashboard info on business login', async () => {
      // Mock bcrypt compare
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      // Mock User.findOne
      User.findOne = jest.fn().mockResolvedValue(businessUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'business@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('business');
      expect(response.body.dashboard.defaultRoute).toBe('/business/dashboard');
      expect(response.body.dashboard.availableRoutes).toContain('/business/offers/create');
      expect(response.body.dashboard.permissions.canCreateOffers).toBe(true);
      expect(response.body.welcome.message).toContain('manage your deliveries');
      expect(response.body.sessionInfo.tokenType).toBe('Bearer');
    });

    test('should return rider-specific dashboard info on rider login', async () => {
      // Mock bcrypt compare
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      
      // Mock User.findOne
      User.findOne = jest.fn().mockResolvedValue(riderUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'rider@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('rider');
      expect(response.body.dashboard.defaultRoute).toBe('/rider/dashboard');
      expect(response.body.dashboard.availableRoutes).toContain('/rider/offers');
      expect(response.body.dashboard.permissions.canAcceptOffers).toBe(true);
      expect(response.body.welcome.message).toContain('start earning');
      expect(response.body.sessionInfo.expiresIn).toBe('7 days');
    });

    test('should return error for invalid credentials', async () => {
      // Mock User.findOne to return null
      User.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('should return error for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_CREDENTIALS');
      expect(response.body.message).toBe('Email and password are required');
    });
  });

  describe('GET /api/auth/dashboard/business - Business dashboard access', () => {
    test('should return business dashboard data for authenticated business user', async () => {
      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(businessUser);

      const response = await request(app)
        .get('/api/auth/dashboard/business')
        .set('Authorization', `Bearer ${businessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.profile.role).toBe('business');
      expect(response.body.stats).toHaveProperty('totalOffers');
      expect(response.body.quickActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Post New Offer' }),
          expect.objectContaining({ label: 'View Active Offers' })
        ])
      );
    });

    test('should deny access to rider trying to access business dashboard', async () => {
      const response = await request(app)
        .get('/api/auth/dashboard/business')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('INSUFFICIENT_ROLE');
      expect(response.body.requiredRole).toBe('business');
      expect(response.body.userRole).toBe('rider');
    });

    test('should deny access without authentication token', async () => {
      const response = await request(app)
        .get('/api/auth/dashboard/business');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /api/auth/dashboard/rider - Rider dashboard access', () => {
    test('should return rider dashboard data for authenticated rider user', async () => {
      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(riderUser);

      const response = await request(app)
        .get('/api/auth/dashboard/rider')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.profile.role).toBe('rider');
      expect(response.body.stats).toHaveProperty('totalEarnings');
      expect(response.body.stats).toHaveProperty('completedDeliveries');
      expect(response.body.availability).toHaveProperty('isAvailable');
      expect(response.body.quickActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Find Offers' }),
          expect.objectContaining({ label: 'Check Earnings' })
        ])
      );
    });

    test('should deny access to business trying to access rider dashboard', async () => {
      const response = await request(app)
        .get('/api/auth/dashboard/rider')
        .set('Authorization', `Bearer ${businessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('INSUFFICIENT_ROLE');
      expect(response.body.requiredRole).toBe('rider');
      expect(response.body.userRole).toBe('business');
    });
  });

  describe('POST /api/auth/refresh-token - Token refresh functionality', () => {
    test('should refresh token successfully with valid refresh token', async () => {
      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(businessUser);

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: businessToken // Using same token for simplicity in test
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.expiresIn).toBe('7 days');
      expect(response.body.refreshedAt).toBeDefined();
    });

    test('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_REFRESH_TOKEN');
    });

    test('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('GET /api/auth/permissions - User permissions endpoint', () => {
    test('should return business permissions for business user', async () => {
      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(businessUser);

      const response = await request(app)
        .get('/api/auth/permissions')
        .set('Authorization', `Bearer ${businessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('business');
      expect(response.body.permissions.canCreateOffers).toBe(true);
      expect(response.body.permissions.canViewOwnOffers).toBe(true);
      expect(response.body.permissions.canMakePayments).toBe(true);
      expect(response.body.permissions.canAcceptOffers).toBeUndefined();
    });

    test('should return rider permissions for rider user', async () => {
      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(riderUser);

      const response = await request(app)
        .get('/api/auth/permissions')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('rider');
      expect(response.body.permissions.canViewOffers).toBe(true);
      expect(response.body.permissions.canAcceptOffers).toBe(true);
      expect(response.body.permissions.canUpdateLocation).toBe(true);
      expect(response.body.permissions.canCreateOffers).toBeUndefined();
    });
  });

  describe('GET /api/auth/validate-route - Route validation', () => {
    test('should validate route access for authenticated user', async () => {
      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(businessUser);

      const response = await request(app)
        .get('/api/auth/validate-route')
        .set('Authorization', `Bearer ${businessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.role).toBe('business');
      expect(response.body.route).toBe('/validate-route');
      expect(response.body.message).toBe('Route access validated successfully');
    });
  });

  describe('POST /api/auth/logout - Logout functionality', () => {
    test('should logout successfully', async () => {
      // Mock User.findById
      User.findById = jest.fn().mockResolvedValue(businessUser);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${businessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should require authentication for logout', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('MISSING_TOKEN');
    });
  });

  describe('PATCH /api/auth/rider/availability - Rider availability update', () => {
    test('should update rider availability successfully', async () => {
      const updatedUser = {
        ...riderUser,
        profile: {
          ...riderUser.profile,
          isAvailable: false
        }
      };

      // Mock User.findByIdAndUpdate
      User.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/api/auth/rider/availability')
        .set('Authorization', `Bearer ${riderToken}`)
        .send({
          isAvailable: false,
          currentLocation: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Availability updated successfully');
      expect(response.body.availability.isAvailable).toBe(false);
    });

    test('should deny access to business user', async () => {
      const response = await request(app)
        .patch('/api/auth/rider/availability')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          isAvailable: false
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('INSUFFICIENT_ROLE');
      expect(response.body.requiredRole).toBe('rider');
    });
  });
});