const jwt = require('jsonwebtoken');
const request = require('supertest');
const AdminAuth = require('../../middleware/adminAuth');

/**
 * Test Helper Functions
 * Provides utilities for authentication, API calls, and common test operations
 */
class TestHelpers {
  /**
   * Generate JWT token for testing
   */
  static generateToken(user, expiresIn = '1h') {
    return jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn }
    );
  }

  /**
   * Generate admin token for testing
   */
  static generateAdminToken(admin, expiresIn = '8h') {
    return AdminAuth.generateToken(admin);
  }

  /**
   * Create authenticated request headers
   */
  static createAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Make authenticated API request
   */
  static async makeAuthenticatedRequest(app, method, url, token, data = null) {
    const req = request(app)[method.toLowerCase()](url)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.send(data);
    }

    return req;
  }

  /**
   * Login user and return token
   */
  static async loginUser(app, email, password) {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    if (response.status === 200) {
      return response.body.data.token;
    }
    throw new Error(`Login failed: ${response.body.message}`);
  }

  /**
   * Login admin and return token
   */
  static async loginAdmin(app, email, password) {
    const response = await request(app)
      .post('/api/admin/login')
      .send({ email, password });

    if (response.status === 200) {
      return response.body.data.token;
    }
    throw new Error(`Admin login failed: ${response.body.message}`);
  }

  /**
   * Register user and return user data with token
   */
  static async registerUser(app, userData) {
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    if (response.status === 201) {
      return {
        user: response.body.data.user,
        token: response.body.data.token
      };
    }
    throw new Error(`Registration failed: ${response.body.message}`);
  }

  /**
   * Create and authenticate business user
   */
  static async createAuthenticatedBusiness(app, overrides = {}) {
    const businessData = {
      name: 'Test Business',
      email: `business${Date.now()}@test.com`,
      password: 'password123',
      role: 'business',
      businessName: 'Test Business Inc',
      businessAddress: {
        street: '123 Business St',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345'
      },
      businessPhone: '555-0123',
      ...overrides
    };

    return this.registerUser(app, businessData);
  }

  /**
   * Create and authenticate rider user
   */
  static async createAuthenticatedRider(app, overrides = {}) {
    const riderData = {
      name: 'Test Rider',
      email: `rider${Date.now()}@test.com`,
      password: 'password123',
      role: 'rider',
      phone: '555-0456',
      vehicleType: 'bike',
      ...overrides
    };

    return this.registerUser(app, riderData);
  }

  /**
   * API Request Helpers
   */
  static async get(app, url, token = null) {
    const req = request(app).get(url);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  static async post(app, url, data, token = null) {
    const req = request(app).post(url).send(data);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  static async put(app, url, data, token = null) {
    const req = request(app).put(url).send(data);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  static async patch(app, url, data, token = null) {
    const req = request(app).patch(url).send(data);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  static async delete(app, url, token = null) {
    const req = request(app).delete(url);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  }

  /**
   * Assertion Helpers
   */
  static expectSuccessResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
    return response.body.data;
  }

  static expectErrorResponse(response, expectedStatus = 400) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    return response.body.error;
  }

  static expectValidationError(response, field = null) {
    const error = this.expectErrorResponse(response, 400);
    expect(error.code).toBe('VALIDATION_ERROR');
    if (field) {
      expect(error.details).toContain(field);
    }
    return error;
  }

  static expectAuthenticationError(response) {
    const error = this.expectErrorResponse(response, 401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    return error;
  }

  static expectAuthorizationError(response) {
    const error = this.expectErrorResponse(response, 403);
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    return error;
  }

  static expectNotFoundError(response) {
    const error = this.expectErrorResponse(response, 404);
    expect(error.code).toBe('NOT_FOUND_ERROR');
    return error;
  }

  /**
   * Data Validation Helpers
   */
  static validateUserResponse(user, expectedRole = null) {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('isVerified');
    expect(user).toHaveProperty('createdAt');
    expect(user).not.toHaveProperty('password');

    if (expectedRole) {
      expect(user.role).toBe(expectedRole);
    }

    return user;
  }

  static validateOfferResponse(offer) {
    expect(offer).toHaveProperty('_id');
    expect(offer).toHaveProperty('businessId');
    expect(offer).toHaveProperty('packageDetails');
    expect(offer).toHaveProperty('pickup');
    expect(offer).toHaveProperty('delivery');
    expect(offer).toHaveProperty('payment');
    expect(offer).toHaveProperty('status');
    expect(offer).toHaveProperty('createdAt');

    // Validate nested objects
    expect(offer.packageDetails).toHaveProperty('description');
    expect(offer.pickup).toHaveProperty('address');
    expect(offer.pickup).toHaveProperty('coordinates');
    expect(offer.delivery).toHaveProperty('address');
    expect(offer.delivery).toHaveProperty('coordinates');
    expect(offer.payment).toHaveProperty('amount');

    return offer;
  }

  static validatePaymentResponse(payment) {
    expect(payment).toHaveProperty('_id');
    expect(payment).toHaveProperty('businessId');
    expect(payment).toHaveProperty('amount');
    expect(payment).toHaveProperty('status');
    expect(payment).toHaveProperty('method');
    expect(payment).toHaveProperty('createdAt');

    return payment;
  }

  static validateNotificationResponse(notification) {
    expect(notification).toHaveProperty('_id');
    expect(notification).toHaveProperty('userId');
    expect(notification).toHaveProperty('type');
    expect(notification).toHaveProperty('title');
    expect(notification).toHaveProperty('message');
    expect(notification).toHaveProperty('isRead');
    expect(notification).toHaveProperty('createdAt');

    return notification;
  }

  /**
   * Test Data Helpers
   */
  static generateRandomEmail(prefix = 'test') {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 5)}@example.com`;
  }

  static generateRandomPhone() {
    return `555-${Math.floor(Math.random() * 9000) + 1000}`;
  }

  static generateRandomCoordinates(centerLat = 37.7749, centerLng = -122.4194, radiusKm = 10) {
    const radiusInDegrees = radiusKm / 111.32; // Approximate conversion
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    return [centerLng + x, centerLat + y];
  }

  /**
   * Wait for async operations
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retry(operation, maxAttempts = 3, baseDelay = 100) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) break;
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.wait(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Mock external services for testing
   */
  static mockExternalServices() {
    // Mock email service
    const mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock SMS service
    const mockSMSService = {
      sendSMS: jest.fn().mockResolvedValue({ success: true }),
      sendVerificationSMS: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock push notification service
    const mockPushService = {
      sendPushNotification: jest.fn().mockResolvedValue({ success: true }),
      sendBulkNotifications: jest.fn().mockResolvedValue({ success: true })
    };

    // Mock payment service
    const mockPaymentService = {
      processPayment: jest.fn().mockResolvedValue({ 
        success: true, 
        transactionId: 'mock_txn_123' 
      }),
      refundPayment: jest.fn().mockResolvedValue({ success: true })
    };

    return {
      email: mockEmailService,
      sms: mockSMSService,
      push: mockPushService,
      payment: mockPaymentService
    };
  }

  /**
   * Performance testing helpers
   */
  static async measureExecutionTime(operation) {
    const startTime = process.hrtime.bigint();
    const result = await operation();
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    return {
      result,
      executionTime
    };
  }

  static async loadTest(operation, concurrency = 10, iterations = 100) {
    const results = [];
    const errors = [];

    const runBatch = async () => {
      const promises = Array(concurrency).fill().map(async () => {
        try {
          const { result, executionTime } = await this.measureExecutionTime(operation);
          results.push({ result, executionTime });
        } catch (error) {
          errors.push(error);
        }
      });

      await Promise.all(promises);
    };

    const batches = Math.ceil(iterations / concurrency);
    for (let i = 0; i < batches; i++) {
      await runBatch();
    }

    const executionTimes = results.map(r => r.executionTime);
    const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    const minTime = Math.min(...executionTimes);
    const maxTime = Math.max(...executionTimes);

    return {
      totalRequests: results.length,
      successfulRequests: results.length,
      failedRequests: errors.length,
      averageTime: avgTime,
      minTime,
      maxTime,
      errors
    };
  }
}

module.exports = TestHelpers;