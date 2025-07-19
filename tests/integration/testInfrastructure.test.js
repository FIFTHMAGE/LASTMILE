/**
 * Test Infrastructure Integration Tests
 * Demonstrates and validates the comprehensive test setup and utilities
 */

const request = require('supertest');
const app = require('../../server');
const TestFactories = global.testUtils.TestFactories;
const TestHelpers = global.testUtils.TestHelpers;
const { testSetup } = global.testUtils;

describe('Test Infrastructure', () => {
  beforeEach(async () => {
    // Clean database before each test
    await TestFactories.cleanup();
  });

  describe('Test Database Setup', () => {
    test('should have a connected test database', () => {
      expect(testSetup.isConnected()).toBe(true);
    });

    test('should provide database statistics', async () => {
      const stats = await testSetup.getDatabaseStats();
      expect(stats).toHaveProperty('collections');
      expect(stats).toHaveProperty('documents');
      expect(stats).toHaveProperty('dataSize');
      expect(stats).toHaveProperty('storageSize');
    });

    test('should clean database successfully', async () => {
      // Create some test data
      await TestFactories.createUser();
      await TestFactories.createOffer();

      // Clean database
      await testSetup.cleanDatabase();

      // Verify data is cleaned
      const stats = await testSetup.getDatabaseStats();
      expect(stats.documents).toBe(0);
    });
  });

  describe('Test Factories', () => {
    describe('User Creation', () => {
      test('should create business user with default data', async () => {
        const user = await TestFactories.createBusinessUser();
        
        expect(user.role).toBe('business');
        expect(user.profile.businessName).toBeDefined();
        expect(user.profile.businessAddress).toBeDefined();
        expect(user.profile.businessPhone).toBeDefined();
        expect(user.isVerified).toBe(true);
      });

      test('should create rider user with default data', async () => {
        const user = await TestFactories.createRiderUser();
        
        expect(user.role).toBe('rider');
        expect(user.profile.phone).toBeDefined();
        expect(user.profile.vehicleType).toBeDefined();
        expect(user.profile.isAvailable).toBe(true);
        expect(user.profile.rating).toBe(5.0);
      });

      test('should create admin user with default data', async () => {
        const user = await TestFactories.createAdminUser();
        
        expect(user.role).toBe('admin');
        expect(user.isVerified).toBe(true);
      });

      test('should create user with custom overrides', async () => {
        const customData = {
          name: 'Custom Business Name',
          email: 'custom@business.com',
          profile: {
            businessName: 'Custom Business Inc'
          }
        };

        const user = await TestFactories.createBusinessUser(customData);
        
        expect(user.name).toBe('Custom Business Name');
        expect(user.email).toBe('custom@business.com');
        expect(user.profile.businessName).toBe('Custom Business Inc');
      });

      test('should create multiple users', async () => {
        const users = await TestFactories.createUsers(3, 'rider');
        
        expect(users).toHaveLength(3);
        users.forEach(user => {
          expect(user.role).toBe('rider');
        });
      });
    });

    describe('Offer Creation', () => {
      test('should create offer with default data', async () => {
        const business = await TestFactories.createBusinessUser();
        const offer = await TestFactories.createOffer(business._id);
        
        expect(offer.businessId.toString()).toBe(business._id.toString());
        expect(offer.packageDetails).toBeDefined();
        expect(offer.pickup).toBeDefined();
        expect(offer.delivery).toBeDefined();
        expect(offer.payment).toBeDefined();
        expect(offer.status).toBe('pending');
      });

      test('should create multiple offers', async () => {
        const business = await TestFactories.createBusinessUser();
        const offers = await TestFactories.createOffers(3, business._id);
        
        expect(offers).toHaveLength(3);
        offers.forEach(offer => {
          expect(offer.businessId.toString()).toBe(business._id.toString());
        });
      });
    });

    describe('Payment Creation', () => {
      test('should create payment with default data', async () => {
        const business = await TestFactories.createBusinessUser();
        const rider = await TestFactories.createRiderUser();
        const payment = await TestFactories.createPayment(business._id, rider._id);
        
        expect(payment.businessId.toString()).toBe(business._id.toString());
        expect(payment.riderId.toString()).toBe(rider._id.toString());
        expect(payment.amount).toBe(25.00);
        expect(payment.status).toBe('pending');
      });
    });

    describe('Notification Creation', () => {
      test('should create notification with default data', async () => {
        const user = await TestFactories.createBusinessUser();
        const notification = await TestFactories.createNotification(user._id);
        
        expect(notification.userId.toString()).toBe(user._id.toString());
        expect(notification.type).toBe('offer_created');
        expect(notification.title).toBeDefined();
        expect(notification.message).toBeDefined();
        expect(notification.isRead).toBe(false);
      });
    });

    describe('Test Scenarios', () => {
      test('should create complete test scenario', async () => {
        const scenario = await TestFactories.createTestScenario({
          businessCount: 2,
          riderCount: 2,
          offerCount: 3,
          paymentCount: 2,
          notificationCount: 2
        });
        
        expect(scenario.businesses).toHaveLength(2);
        expect(scenario.riders).toHaveLength(2);
        expect(scenario.admin).toBeDefined();
        expect(scenario.offers).toHaveLength(6); // 2 businesses * 3 offers each
        expect(scenario.payments).toHaveLength(2);
        expect(scenario.notifications).toHaveLength(2);
      });

      test('should create workflow test data', async () => {
        const workflowData = await TestFactories.createWorkflowTestData();
        
        expect(workflowData.business).toBeDefined();
        expect(workflowData.rider).toBeDefined();
        expect(workflowData.offers.pending.status).toBe('pending');
        expect(workflowData.offers.accepted.status).toBe('accepted');
        expect(workflowData.offers.inTransit.status).toBe('in_transit');
        expect(workflowData.offers.delivered.status).toBe('delivered');
        expect(workflowData.payments.pending.status).toBe('pending');
        expect(workflowData.payments.completed.status).toBe('completed');
      });
    });
  });

  describe('Test Helpers', () => {
    describe('Authentication Helpers', () => {
      test('should generate JWT token', async () => {
        const user = await TestFactories.createBusinessUser();
        const token = TestHelpers.generateToken(user);
        
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3); // JWT has 3 parts
      });

      test('should generate admin token', async () => {
        const admin = await TestFactories.createAdminUser();
        const token = TestHelpers.generateAdminToken(admin);
        
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
      });

      test('should create auth headers', () => {
        const token = 'test-token';
        const headers = TestHelpers.createAuthHeaders(token);
        
        expect(headers.Authorization).toBe('Bearer test-token');
        expect(headers['Content-Type']).toBe('application/json');
      });
    });

    describe('API Request Helpers', () => {
      test('should make GET request', async () => {
        const response = await TestHelpers.get(app, '/');
        expect(response.status).toBe(200);
      });

      test('should make authenticated GET request', async () => {
        const user = await TestFactories.createBusinessUser();
        const token = TestHelpers.generateToken(user);
        
        const response = await TestHelpers.get(app, '/api/auth/profile', token);
        expect(response.status).toBe(200);
      });

      test('should make POST request with data', async () => {
        const userData = {
          name: 'Test User',
          email: TestHelpers.generateRandomEmail(),
          password: 'password123',
          role: 'business',
          businessName: 'Test Business',
          businessAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345'
          },
          businessPhone: '555-0123'
        };

        const response = await TestHelpers.post(app, '/api/auth/register', userData);
        expect(response.status).toBe(201);
      });
    });

    describe('Assertion Helpers', () => {
      test('should validate success response', async () => {
        const user = await TestFactories.createBusinessUser();
        const token = TestHelpers.generateToken(user);
        
        const response = await TestHelpers.get(app, '/api/auth/profile', token);
        const data = TestHelpers.expectSuccessResponse(response, 200);
        
        expect(data.user).toBeDefined();
      });

      test('should validate error response', async () => {
        const response = await TestHelpers.get(app, '/api/auth/profile'); // No token
        const error = TestHelpers.expectAuthenticationError(response);
        
        expect(error.code).toBe('AUTHENTICATION_ERROR');
      });

      test('should validate user response structure', async () => {
        const user = await TestFactories.createBusinessUser();
        const validatedUser = TestHelpers.validateUserResponse(user, 'business');
        
        expect(validatedUser.role).toBe('business');
      });
    });

    describe('Data Generation Helpers', () => {
      test('should generate random email', () => {
        const email1 = TestHelpers.generateRandomEmail('test');
        const email2 = TestHelpers.generateRandomEmail('test');
        
        expect(email1).toMatch(/^test\d+\w+@example\.com$/);
        expect(email2).toMatch(/^test\d+\w+@example\.com$/);
        expect(email1).not.toBe(email2);
      });

      test('should generate random phone', () => {
        const phone = TestHelpers.generateRandomPhone();
        expect(phone).toMatch(/^555-\d{4}$/);
      });

      test('should generate random coordinates', () => {
        const coords = TestHelpers.generateRandomCoordinates();
        expect(coords).toHaveLength(2);
        expect(typeof coords[0]).toBe('number'); // longitude
        expect(typeof coords[1]).toBe('number'); // latitude
      });
    });

    describe('Performance Helpers', () => {
      test('should measure execution time', async () => {
        const operation = async () => {
          await TestHelpers.wait(100); // Wait 100ms
          return 'test result';
        };

        const { result, executionTime } = await TestHelpers.measureExecutionTime(operation);
        
        expect(result).toBe('test result');
        expect(executionTime).toBeGreaterThan(90); // Should be around 100ms
        expect(executionTime).toBeLessThan(200);
      });

      test('should perform load test', async () => {
        const operation = async () => {
          await TestHelpers.wait(10);
          return Math.random();
        };

        const results = await TestHelpers.loadTest(operation, 5, 10);
        
        expect(results.totalRequests).toBe(10);
        expect(results.successfulRequests).toBe(10);
        expect(results.failedRequests).toBe(0);
        expect(results.averageTime).toBeGreaterThan(0);
        expect(results.minTime).toBeGreaterThan(0);
        expect(results.maxTime).toBeGreaterThan(0);
      });
    });

    describe('Mock Services', () => {
      test('should provide mock external services', () => {
        const mocks = TestHelpers.mockExternalServices();
        
        expect(mocks.email.sendEmail).toBeDefined();
        expect(mocks.sms.sendSMS).toBeDefined();
        expect(mocks.push.sendPushNotification).toBeDefined();
        expect(mocks.payment.processPayment).toBeDefined();
        
        // Test that mocks work
        expect(jest.isMockFunction(mocks.email.sendEmail)).toBe(true);
      });
    });
  });

  describe('Integration Test Example', () => {
    test('should demonstrate complete workflow testing', async () => {
      // Create test users using factories
      const business = await TestFactories.createBusinessUser();
      const rider = await TestFactories.createRiderUser();
      
      // Generate tokens using helpers
      const businessToken = TestHelpers.generateToken(business);
      const riderToken = TestHelpers.generateToken(rider);
      
      // Business creates an offer
      const offerData = {
        packageDetails: {
          description: 'Test package for integration',
          weight: 2.0,
          dimensions: { length: 20, width: 15, height: 10 }
        },
        pickup: {
          address: '123 Pickup St, City, State 12345',
          coordinates: [-122.4194, 37.7749],
          contactName: 'John Pickup',
          contactPhone: '555-0111'
        },
        delivery: {
          address: '456 Delivery Ave, City, State 67890',
          coordinates: [-122.4094, 37.7849],
          contactName: 'Jane Delivery',
          contactPhone: '555-0222'
        },
        payment: { amount: 30.00, method: 'card' }
      };

      const createResponse = await TestHelpers.post(
        app, 
        '/api/offers', 
        offerData, 
        businessToken
      );
      const offerResponseData = TestHelpers.expectSuccessResponse(createResponse, 201);
      const createdOffer = TestHelpers.validateOfferResponse(offerResponseData.offer);

      // Rider accepts the offer
      const acceptResponse = await TestHelpers.patch(
        app,
        `/api/offers/${createdOffer._id}/accept`,
        {},
        riderToken
      );
      TestHelpers.expectSuccessResponse(acceptResponse, 200);

      // Verify offer status changed
      const getResponse = await TestHelpers.get(
        app,
        `/api/offers/${createdOffer._id}`,
        businessToken
      );
      const updatedOfferData = TestHelpers.expectSuccessResponse(getResponse, 200);
      expect(updatedOfferData.offer.status).toBe('accepted');
      expect(updatedOfferData.offer.riderId).toBe(rider._id.toString());
    });
  });
});