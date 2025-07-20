# API Testing Documentation

## Overview

This document provides comprehensive testing guidelines and examples for the Last Mile Delivery Platform API. It includes unit tests, integration tests, and end-to-end testing scenarios.

## Testing Framework

The API uses **Jest** as the primary testing framework with **Supertest** for HTTP testing.

### Dependencies

```json
{
  "jest": "^29.0.0",
  "supertest": "^6.3.0",
  "mongodb-memory-server": "^8.0.0",
  "@types/jest": "^29.0.0",
  "@types/supertest": "^2.0.0"
}
```

## Test Structure

```
tests/
├── setup.js                 # Global test setup
├── utils/
│   ├── testSetup.js         # Test utilities
│   ├── testFactories.js     # Data factories
│   └── testHelpers.js       # Helper functions
├── unit/
│   ├── models/              # Model tests
│   ├── services/            # Service tests
│   └── middleware/          # Middleware tests
├── integration/
│   ├── auth.test.js         # Authentication tests
│   ├── business.test.js     # Business workflow tests
│   ├── rider.test.js        # Rider workflow tests
│   └── admin.test.js        # Admin tests
└── e2e/
    └── workflows.test.js    # End-to-end tests
```

## Test Configuration

### Jest Configuration (jest.config.js)

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000
};
```

### Global Test Setup (tests/setup.js)

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  
  console.log('Test database connected');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('Test database disconnected');
});

beforeEach(async () => {
  // Clean database before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

## Test Utilities

### Test Factories (tests/utils/testFactories.js)

```javascript
const User = require('../../models/User');
const Offer = require('../../models/Offer');
const Payment = require('../../models/Payment');
const jwt = require('jsonwebtoken');

class TestFactories {
  static async createBusinessUser(overrides = {}) {
    const userData = {
      name: 'Test Business',
      email: 'business@test.com',
      password: 'password123',
      role: 'business',
      profile: {
        businessName: 'Test Delivery Co',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345',
          coordinates: [-74.006, 40.7128]
        },
        businessPhone: '555-0001'
      },
      isVerified: true,
      ...overrides
    };

    return await User.create(userData);
  }

  static async createRiderUser(overrides = {}) {
    const userData = {
      name: 'Test Rider',
      email: 'rider@test.com',
      password: 'password123',
      role: 'rider',
      profile: {
        phone: '555-0002',
        vehicleType: 'bike',
        currentLocation: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        isAvailable: true,
        rating: 4.5
      },
      isVerified: true,
      ...overrides
    };

    return await User.create(userData);
  }

  static async createOffer(businessId, overrides = {}) {
    const offerData = {
      business: businessId,
      title: 'Test Delivery',
      description: 'Test package delivery',
      packageDetails: {
        weight: 2.5,
        dimensions: { length: 20, width: 15, height: 10 },
        fragile: false,
        specialInstructions: 'Handle with care'
      },
      pickup: {
        address: '123 Pickup St, New York, NY',
        coordinates: [-74.006, 40.7128],
        contactName: 'John Pickup',
        contactPhone: '555-0001'
      },
      delivery: {
        address: '456 Delivery Ave, Brooklyn, NY',
        coordinates: [-73.9857, 40.6892],
        contactName: 'Jane Delivery',
        contactPhone: '555-0002'
      },
      payment: {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: 'card'
      },
      status: 'open',
      estimatedDistance: 5000,
      estimatedDuration: 30,
      ...overrides
    };

    return await Offer.create(offerData);
  }

  static async createPayment(offerId, businessId, riderId, overrides = {}) {
    const paymentData = {
      offer: offerId,
      business: businessId,
      rider: riderId,
      amount: 25.50,
      platformFee: 2.55,
      riderEarnings: 22.95,
      currency: 'USD',
      paymentMethod: 'card',
      status: 'completed',
      transactionId: 'test_txn_123',
      processedAt: new Date(),
      ...overrides
    };

    return await Payment.create(paymentData);
  }

  static generateToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        _id: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }
}

module.exports = TestFactories;
```

### Test Helpers (tests/utils/testHelpers.js)

```javascript
const request = require('supertest');

class TestHelpers {
  static async authenticatedRequest(app, method, url, token, data = null) {
    const req = request(app)[method.toLowerCase()](url)
      .set('Authorization', `Bearer ${token}`);
    
    if (data) {
      req.send(data);
    }
    
    return req;
  }

  static async expectValidationError(response, field = null) {
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    
    if (field) {
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field })
        ])
      );
    }
  }

  static async expectAuthenticationError(response) {
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(response.status).toBe(401);
  }

  static async expectAuthorizationError(response) {
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
    expect(response.status).toBe(403);
  }

  static async expectNotFoundError(response) {
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    expect(response.status).toBe(404);
  }

  static expectValidPagination(pagination) {
    expect(pagination).toHaveProperty('currentPage');
    expect(pagination).toHaveProperty('totalPages');
    expect(pagination).toHaveProperty('totalItems');
    expect(pagination).toHaveProperty('hasNext');
    expect(pagination).toHaveProperty('hasPrev');
    expect(typeof pagination.currentPage).toBe('number');
    expect(typeof pagination.totalPages).toBe('number');
    expect(typeof pagination.totalItems).toBe('number');
    expect(typeof pagination.hasNext).toBe('boolean');
    expect(typeof pagination.hasPrev).toBe('boolean');
  }

  static expectValidTimestamp(timestamp) {
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp).getTime()).not.toBeNaN();
  }

  static expectValidCoordinates(coordinates) {
    expect(Array.isArray(coordinates)).toBe(true);
    expect(coordinates).toHaveLength(2);
    expect(typeof coordinates[0]).toBe('number'); // longitude
    expect(typeof coordinates[1]).toBe('number'); // latitude
    expect(coordinates[0]).toBeGreaterThanOrEqual(-180);
    expect(coordinates[0]).toBeLessThanOrEqual(180);
    expect(coordinates[1]).toBeGreaterThanOrEqual(-90);
    expect(coordinates[1]).toBeLessThanOrEqual(90);
  }
}

module.exports = TestHelpers;
```

## Unit Tests

### Model Tests (tests/unit/models/User.test.js)

```javascript
const User = require('../../../models/User');
const TestFactories = require('../../utils/testFactories');

describe('User Model', () => {
  describe('Business User', () => {
    test('should create a valid business user', async () => {
      const user = await TestFactories.createBusinessUser();
      
      expect(user.name).toBe('Test Business');
      expect(user.email).toBe('business@test.com');
      expect(user.role).toBe('business');
      expect(user.profile.businessName).toBe('Test Delivery Co');
      expect(user.isVerified).toBe(true);
    });

    test('should validate business profile fields', async () => {
      await expect(
        TestFactories.createBusinessUser({
          profile: {
            businessName: '', // Invalid: too short
            businessAddress: {
              street: '123 Business St',
              city: 'Business City',
              state: 'BC',
              zipCode: '12345',
              coordinates: [-74.006, 40.7128]
            },
            businessPhone: '555-0001'
          }
        })
      ).rejects.toThrow();
    });

    test('should validate email format', async () => {
      await expect(
        TestFactories.createBusinessUser({
          email: 'invalid-email'
        })
      ).rejects.toThrow();
    });
  });

  describe('Rider User', () => {
    test('should create a valid rider user', async () => {
      const user = await TestFactories.createRiderUser();
      
      expect(user.name).toBe('Test Rider');
      expect(user.email).toBe('rider@test.com');
      expect(user.role).toBe('rider');
      expect(user.profile.vehicleType).toBe('bike');
      expect(user.profile.isAvailable).toBe(true);
    });

    test('should validate vehicle type', async () => {
      await expect(
        TestFactories.createRiderUser({
          profile: {
            phone: '555-0002',
            vehicleType: 'invalid-vehicle', // Invalid vehicle type
            isAvailable: true
          }
        })
      ).rejects.toThrow();
    });
  });
});
```

### Service Tests (tests/unit/services/LocationService.test.js)

```javascript
const LocationService = require('../../../services/LocationService');

describe('LocationService', () => {
  describe('calculateDistance', () => {
    test('should calculate distance between two points', () => {
      const point1 = [-74.006, 40.7128]; // NYC
      const point2 = [-73.9857, 40.6892]; // Brooklyn
      
      const distance = LocationService.calculateDistance(point1, point2);
      
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(50000); // Less than 50km
    });

    test('should return 0 for same coordinates', () => {
      const point = [-74.006, 40.7128];
      const distance = LocationService.calculateDistance(point, point);
      
      expect(distance).toBe(0);
    });
  });

  describe('validateCoordinates', () => {
    test('should validate correct coordinates', () => {
      expect(LocationService.validateCoordinates([-74.006, 40.7128])).toBe(true);
      expect(LocationService.validateCoordinates([0, 0])).toBe(true);
      expect(LocationService.validateCoordinates([-180, -90])).toBe(true);
      expect(LocationService.validateCoordinates([180, 90])).toBe(true);
    });

    test('should reject invalid coordinates', () => {
      expect(LocationService.validateCoordinates([-181, 40.7128])).toBe(false);
      expect(LocationService.validateCoordinates([-74.006, 91])).toBe(false);
      expect(LocationService.validateCoordinates([181, -91])).toBe(false);
      expect(LocationService.validateCoordinates(['invalid', 40.7128])).toBe(false);
    });
  });
});
```

## Integration Tests

### Authentication Tests (tests/integration/auth.test.js)

```javascript
const request = require('supertest');
const app = require('../../server');
const TestFactories = require('../utils/testFactories');
const TestHelpers = require('../utils/testHelpers');

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    test('should register a business user', async () => {
      const userData = {
        name: 'Test Business',
        email: 'business@test.com',
        password: 'password123',
        role: 'business',
        profile: {
          businessName: 'Test Delivery Co',
          businessAddress: {
            street: '123 Business St',
            city: 'Business City',
            state: 'BC',
            zipCode: '12345',
            coordinates: [-74.006, 40.7128]
          },
          businessPhone: '555-0001'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.token).toBeDefined();
    });

    test('should register a rider user', async () => {
      const userData = {
        name: 'Test Rider',
        email: 'rider@test.com',
        password: 'password123',
        role: 'rider',
        profile: {
          phone: '555-0002',
          vehicleType: 'bike',
          currentLocation: {
            type: 'Point',
            coordinates: [-74.006, 40.7128]
          }
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.token).toBeDefined();
    });

    test('should reject duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@test.com',
        password: 'password123',
        role: 'business',
        profile: {
          businessName: 'Test Co',
          businessAddress: {
            street: '123 St',
            city: 'City',
            state: 'ST',
            zipCode: '12345',
            coordinates: [-74.006, 40.7128]
          },
          businessPhone: '555-0001'
        }
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT_ERROR');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User'
          // Missing required fields
        })
        .expect(400);

      TestHelpers.expectValidationError(response);
    });
  });

  describe('POST /api/auth/login', () => {
    let businessUser;

    beforeEach(async () => {
      businessUser = await TestFactories.createBusinessUser();
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: businessUser.email,
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(businessUser.email);
      expect(response.body.data.token).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: businessUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      TestHelpers.expectAuthenticationError(response);
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        })
        .expect(401);

      TestHelpers.expectAuthenticationError(response);
    });
  });
});
```

### Business Workflow Tests (tests/integration/business.test.js)

```javascript
const request = require('supertest');
const app = require('../../server');
const TestFactories = require('../utils/testFactories');
const TestHelpers = require('../utils/testHelpers');

describe('Business Workflow', () => {
  let businessUser;
  let businessToken;

  beforeEach(async () => {
    businessUser = await TestFactories.createBusinessUser();
    businessToken = TestFactories.generateToken(businessUser);
  });

  describe('Offer Management', () => {
    test('should create a new offer', async () => {
      const offerData = {
        title: 'Package Delivery',
        description: 'Urgent document delivery',
        packageDetails: {
          weight: 2.5,
          dimensions: { length: 20, width: 15, height: 10 },
          fragile: false
        },
        pickup: {
          address: '123 Main St, New York, NY',
          coordinates: [-74.006, 40.7128],
          contactName: 'John Doe',
          contactPhone: '555-0123'
        },
        delivery: {
          address: '456 Oak Ave, Brooklyn, NY',
          coordinates: [-73.9857, 40.6892],
          contactName: 'Jane Smith',
          contactPhone: '555-0456'
        },
        payment: {
          amount: 25.50,
          currency: 'USD',
          paymentMethod: 'card'
        }
      };

      const response = await TestHelpers.authenticatedRequest(
        app, 'POST', '/api/business/offers', businessToken, offerData
      ).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offer.title).toBe(offerData.title);
      expect(response.body.data.offer.status).toBe('open');
      expect(response.body.data.offer.business).toBe(businessUser._id.toString());
    });

    test('should get business offers', async () => {
      // Create test offers
      await TestFactories.createOffer(businessUser._id);
      await TestFactories.createOffer(businessUser._id, { title: 'Second Offer' });

      const response = await TestHelpers.authenticatedRequest(
        app, 'GET', '/api/business/offers', businessToken
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offers).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      TestHelpers.expectValidPagination(response.body.data.pagination);
    });

    test('should filter offers by status', async () => {
      await TestFactories.createOffer(businessUser._id, { status: 'open' });
      await TestFactories.createOffer(businessUser._id, { status: 'delivered' });

      const response = await TestHelpers.authenticatedRequest(
        app, 'GET', '/api/business/offers?status=open', businessToken
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offers).toHaveLength(1);
      expect(response.body.data.offers[0].status).toBe('open');
    });
  });

  describe('Dashboard', () => {
    test('should get business dashboard overview', async () => {
      // Create test data
      await TestFactories.createOffer(businessUser._id, { status: 'open' });
      await TestFactories.createOffer(businessUser._id, { status: 'delivered' });

      const response = await TestHelpers.authenticatedRequest(
        app, 'GET', '/api/business/overview', businessToken
      ).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.overview.totalOffers).toBeGreaterThanOrEqual(2);
      expect(response.body.data.recentOffers).toBeDefined();
      expect(Array.isArray(response.body.data.recentOffers)).toBe(true);
    });
  });
});
```

## End-to-End Tests

### Complete Delivery Workflow (tests/e2e/workflows.test.js)

```javascript
const request = require('supertest');
const app = require('../../server');
const TestFactories = require('../utils/testFactories');
const TestHelpers = require('../utils/testHelpers');

describe('Complete Delivery Workflow', () => {
  let businessUser, riderUser;
  let businessToken, riderToken;
  let offer;

  beforeEach(async () => {
    // Create users
    businessUser = await TestFactories.createBusinessUser();
    riderUser = await TestFactories.createRiderUser();
    
    // Generate tokens
    businessToken = TestFactories.generateToken(businessUser);
    riderToken = TestFactories.generateToken(riderUser);
  });

  test('complete delivery workflow', async () => {
    // 1. Business creates an offer
    const offerData = {
      title: 'E2E Test Delivery',
      pickup: {
        address: '123 Main St, New York, NY',
        coordinates: [-74.006, 40.7128],
        contactName: 'John Doe',
        contactPhone: '555-0123'
      },
      delivery: {
        address: '456 Oak Ave, Brooklyn, NY',
        coordinates: [-73.9857, 40.6892],
        contactName: 'Jane Smith',
        contactPhone: '555-0456'
      },
      payment: {
        amount: 25.50,
        currency: 'USD',
        paymentMethod: 'card'
      }
    };

    const createResponse = await TestHelpers.authenticatedRequest(
      app, 'POST', '/api/business/offers', businessToken, offerData
    ).expect(201);

    offer = createResponse.body.data.offer;
    expect(offer.status).toBe('open');

    // 2. Rider views nearby offers
    const nearbyResponse = await TestHelpers.authenticatedRequest(
      app, 'GET', '/api/rider/nearby-offers?lat=40.7128&lng=-74.006', riderToken
    ).expect(200);

    expect(nearbyResponse.body.data.offers.length).toBeGreaterThan(0);
    const foundOffer = nearbyResponse.body.data.offers.find(o => o.id === offer.id);
    expect(foundOffer).toBeDefined();

    // 3. Rider accepts the offer
    const acceptResponse = await TestHelpers.authenticatedRequest(
      app, 'POST', `/api/rider/offers/${offer.id}/accept`, riderToken
    ).expect(200);

    expect(acceptResponse.body.data.offer.status).toBe('accepted');
    expect(acceptResponse.body.data.offer.acceptedAt).toBeDefined();

    // 4. Rider updates status to picked_up
    const pickupResponse = await TestHelpers.authenticatedRequest(
      app, 'PATCH', `/api/rider/deliveries/${offer.id}/status`, riderToken, {
        status: 'picked_up',
        location: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        }
      }
    ).expect(200);

    expect(pickupResponse.body.data.delivery.status).toBe('picked_up');
    expect(pickupResponse.body.data.delivery.pickedUpAt).toBeDefined();

    // 5. Rider updates status to in_transit
    const transitResponse = await TestHelpers.authenticatedRequest(
      app, 'PATCH', `/api/rider/deliveries/${offer.id}/status`, riderToken, {
        status: 'in_transit'
      }
    ).expect(200);

    expect(transitResponse.body.data.delivery.status).toBe('in_transit');

    // 6. Rider completes delivery
    const deliveredResponse = await TestHelpers.authenticatedRequest(
      app, 'PATCH', `/api/rider/deliveries/${offer.id}/status`, riderToken, {
        status: 'delivered',
        location: {
          type: 'Point',
          coordinates: [-73.9857, 40.6892]
        }
      }
    ).expect(200);

    expect(deliveredResponse.body.data.delivery.status).toBe('delivered');
    expect(deliveredResponse.body.data.delivery.deliveredAt).toBeDefined();

    // 7. Verify business can see completed offer
    const businessOffersResponse = await TestHelpers.authenticatedRequest(
      app, 'GET', '/api/business/offers', businessToken
    ).expect(200);

    const completedOffer = businessOffersResponse.body.data.offers.find(o => o.id === offer.id);
    expect(completedOffer.status).toBe('delivered');
    expect(completedOffer.rider).toBeDefined();

    // 8. Verify payment was created
    const paymentsResponse = await TestHelpers.authenticatedRequest(
      app, 'GET', '/api/payments', businessToken
    ).expect(200);

    const payment = paymentsResponse.body.data.payments.find(p => p.offer.id === offer.id);
    expect(payment).toBeDefined();
    expect(payment.status).toBe('completed');
    expect(payment.amount).toBe(25.50);
  });

  test('offer cancellation workflow', async () => {
    // Create offer
    offer = await TestFactories.createOffer(businessUser._id);

    // Business cancels offer
    const cancelResponse = await TestHelpers.authenticatedRequest(
      app, 'PATCH', `/api/business/offers/${offer._id}/cancel`, businessToken, {
        reason: 'No longer needed'
      }
    ).expect(200);

    expect(cancelResponse.body.data.offer.status).toBe('cancelled');

    // Verify rider cannot accept cancelled offer
    const acceptResponse = await TestHelpers.authenticatedRequest(
      app, 'POST', `/api/rider/offers/${offer._id}/accept`, riderToken
    ).expect(400);

    expect(acceptResponse.body.success).toBe(false);
  });
});
```

## Performance Tests

### Load Testing (tests/performance/load.test.js)

```javascript
const request = require('supertest');
const app = require('../../server');
const TestFactories = require('../utils/testFactories');

describe('Performance Tests', () => {
  let businessUser, businessToken;

  beforeAll(async () => {
    businessUser = await TestFactories.createBusinessUser();
    businessToken = TestFactories.generateToken(businessUser);
  });

  test('should handle concurrent offer creation', async () => {
    const concurrentRequests = 10;
    const startTime = Date.now();

    const promises = Array.from({ length: concurrentRequests }, (_, i) => 
      request(app)
        .post('/api/business/offers')
        .set('Authorization', `Bearer ${businessToken}`)
        .send({
          title: `Concurrent Offer ${i}`,
          pickup: {
            address: '123 Main St',
            coordinates: [-74.006, 40.7128],
            contactName: 'John Doe',
            contactPhone: '555-0123'
          },
          delivery: {
            address: '456 Oak Ave',
            coordinates: [-73.9857, 40.6892],
            contactName: 'Jane Smith',
            contactPhone: '555-0456'
          },
          payment: {
            amount: 25.50,
            currency: 'USD',
            paymentMethod: 'card'
          }
        })
    );

    const responses = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(5000); // 5 seconds

    console.log(`${concurrentRequests} concurrent requests completed in ${duration}ms`);
  });

  test('should handle pagination efficiently', async () => {
    // Create many offers
    const offerCount = 100;
    const offers = await Promise.all(
      Array.from({ length: offerCount }, (_, i) =>
        TestFactories.createOffer(businessUser._id, { title: `Offer ${i}` })
      )
    );

    const startTime = Date.now();

    // Test pagination performance
    const response = await request(app)
      .get('/api/business/offers?page=1&limit=20')
      .set('Authorization', `Bearer ${businessToken}`)
      .expect(200);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(response.body.data.offers).toHaveLength(20);
    expect(response.body.data.pagination.totalItems).toBe(offerCount);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second

    console.log(`Paginated query (${offerCount} total items) completed in ${duration}ms`);
  });
});
```

## Test Commands

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e",
    "test:performance": "jest tests/performance",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run performance tests
npm run test:performance

# Run tests for CI/CD
npm run test:ci
```

## Test Best Practices

### 1. Test Structure
- Use descriptive test names
- Group related tests with `describe` blocks
- Use `beforeEach` and `afterEach` for setup/cleanup
- Keep tests independent and isolated

### 2. Data Management
- Use factories for creating test data
- Clean database between tests
- Use realistic but minimal test data
- Avoid hardcoded IDs or timestamps

### 3. Assertions
- Use specific assertions
- Test both success and error cases
- Verify response structure and data types
- Check edge cases and boundary conditions

### 4. Performance
- Keep tests fast and focused
- Use appropriate timeouts
- Mock external services
- Avoid unnecessary database operations

### 5. Maintenance
- Keep tests up to date with API changes
- Refactor tests when refactoring code
- Remove obsolete tests
- Document complex test scenarios

## Continuous Integration

### GitHub Actions Example

```yaml
name: API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]

    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:ci
      env:
        NODE_ENV: test
        JWT_SECRET: test-secret
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

This comprehensive testing documentation provides developers with all the tools and examples needed to effectively test the Last Mile Delivery Platform API.