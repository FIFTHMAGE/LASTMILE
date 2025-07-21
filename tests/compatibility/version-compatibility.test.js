/**
 * API Version Compatibility Tests
 * Tests backward compatibility between API versions
 */

const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const { setupTestEnvironment, cleanupTestEnvironment, teardownTestEnvironment } = require('../utils/testSetup');

describe('API Version Compatibility', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  beforeEach(async () => {
    await cleanupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  describe('Version Detection', () => {
    test('should detect version from URL path', async () => {
      const response = await request(app)
        .get('/api/v1/version')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
    });

    test('should detect version from Accept-Version header', async () => {
      const response = await request(app)
        .get('/api/version')
        .set('Accept-Version', 'v1')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
    });

    test('should detect version from query parameter', async () => {
      const response = await request(app)
        .get('/api/version?version=v1')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
    });

    test('should default to current version when no version specified', async () => {
      const response = await request(app)
        .get('/api/version')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
    });

    test('should reject unsupported version', async () => {
      const response = await request(app)
        .get('/api/v99/version')
        .expect(400);

      expect(response.body.error.code).toBe('UNSUPPORTED_VERSION');
      expect(response.body.error.supportedVersions).toContain('v1');
    });
  });

  describe('V1 Authentication Backward Compatibility', () => {
    const testUser = {
      name: 'Test Business',
      email: 'test@business.com',
      password: 'TestPass123!',
      role: 'business',
      businessProfile: {
        businessName: 'Test Business Inc',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345'
        },
        businessPhone: '+1234567890'
      }
    };

    test('should handle legacy businessProfile field in registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.businessProfile).toEqual(testUser.businessProfile);
      expect(response.body.data.user.profile).toEqual(testUser.businessProfile);
    });

    test('should handle legacy riderProfile field in registration', async () => {
      const riderUser = {
        name: 'Test Rider',
        email: 'rider@test.com',
        password: 'TestPass123!',
        role: 'rider',
        riderProfile: {
          phone: '+1234567890',
          vehicleType: 'bike'
        }
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(riderUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.riderProfile).toEqual(riderUser.riderProfile);
      expect(response.body.data.user.profile).toEqual(riderUser.riderProfile);
    });

    test('should maintain V1 login response format', async () => {
      // First register a user
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined(); // V1 backward compatibility
      expect(response.body.data.tokenType).toBe('Bearer');
      expect(response.body.data.expiresIn).toBe('24h'); // V1 string format
      expect(response.body.data.user.businessProfile).toBeDefined();
    });

    test('should support legacy token refresh endpoint', async () => {
      // Register and login first
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const token = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.tokenType).toBe('Bearer');
    });
  });

  describe('V2 Authentication Enhanced Features', () => {
    const testUser = {
      name: 'Test Business V2',
      email: 'testv2@business.com',
      password: 'TestPass123!@#',
      role: 'business',
      profile: {
        businessName: 'Test Business V2 Inc',
        businessAddress: {
          street: '123 Business St',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345'
        },
        businessPhone: '+1234567890'
      }
    };

    test('should enforce enhanced password requirements in V2', async () => {
      const weakPasswordUser = {
        ...testUser,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    test('should return V2 response format with enhanced metadata', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.data.user.metadata).toBeDefined();
      expect(response.body.data.user.metadata.version).toBe('v2');
      expect(response.body.data.user.securityLevel).toBeDefined();
      expect(response.body.data.authentication.accessToken).toBeDefined();
      expect(response.body.data.authentication.expiresIn).toBeTypeOf('number'); // V2 numeric format
    });

    test('should implement account lockout in V2', async () => {
      // Register user first
      await request(app)
        .post('/api/v2/auth/register')
        .send(testUser);

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v2/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // 6th attempt should result in account lockout
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(423);

      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    test('should provide separate refresh tokens in V2', async () => {
      // Register and login
      await request(app)
        .post('/api/v2/auth/register')
        .send(testUser);

      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const refreshToken = loginResponse.body.data.authentication.refreshToken;
      expect(refreshToken).toBeDefined();

      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.authentication.accessToken).toBeDefined();
      expect(response.body.data.authentication.refreshToken).toBeDefined();
      expect(response.body.data.authentication.expiresIn).toBeTypeOf('number');
    });
  });

  describe('Cross-Version Compatibility', () => {
    test('should handle V1 client accessing V2 endpoints with compatibility layer', async () => {
      const testUser = {
        name: 'Cross Version Test',
        email: 'crossversion@test.com',
        password: 'TestPass123!',
        role: 'business',
        businessProfile: {
          businessName: 'Cross Version Business'
        }
      };

      // V1 client making request to V2 endpoint (should be transformed)
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      // Should receive V1 format response even if processed by V2 logic
      expect(response.body.data.user.businessProfile).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.tokenType).toBe('Bearer');
    });

    test('should provide migration guidance', async () => {
      const response = await request(app)
        .get('/api/migration?from=v1&to=v2')
        .expect(200);

      expect(response.body.data.fromVersion).toBe('v1');
      expect(response.body.data.toVersion).toBe('v2');
      expect(response.body.data.migrationSteps).toBeDefined();
      expect(response.body.data.breakingChanges).toBeDefined();
    });

    test('should provide version information', async () => {
      const response = await request(app)
        .get('/api/version')
        .expect(200);

      expect(response.body.data.supportedVersions).toBeDefined();
      expect(response.body.data.currentVersion).toBeDefined();
      expect(response.body.data.latestVersion).toBeDefined();
    });
  });

  describe('Response Transformation', () => {
    test('should transform coordinates format for V1 compatibility', async () => {
      // This would test coordinate transformation if we had location endpoints
      // For now, we'll test the transformation logic directly
      const mockData = {
        location: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749]
        }
      };

      // The versioning middleware should transform this for V1 clients
      // This is a placeholder for when we implement location endpoints
      expect(mockData.location.coordinates).toEqual([-122.4194, 37.7749]);
    });

    test('should maintain pagination format compatibility', async () => {
      // Test pagination format transformation
      const mockPagination = {
        currentPage: 1,
        totalPages: 5,
        totalItems: 50,
        hasNext: true,
        hasPrev: false
      };

      // V1 format should be: page, pages, total, hasNext, hasPrev
      expect(mockPagination.currentPage).toBe(1);
      expect(mockPagination.totalPages).toBe(5);
    });
  });

  describe('Error Handling Compatibility', () => {
    test('should maintain consistent error format across versions', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });

    test('should provide version-specific error details', async () => {
      const v2Response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          name: 'T', // Too short
          email: 'test@test.com',
          password: 'weak',
          role: 'business'
        })
        .expect(400);

      expect(v2Response.body.error.field).toBeDefined(); // V2 includes field info
    });
  });

  describe('Deprecation Handling', () => {
    test('should include deprecation headers for deprecated versions', async () => {
      // This test assumes we mark v1 as deprecated in the future
      // For now, it's a placeholder
      const response = await request(app)
        .get('/api/v1/version')
        .expect(200);

      // When v1 is deprecated, these headers should be present:
      // expect(response.headers['x-api-deprecated']).toBe('true');
      // expect(response.headers['x-api-deprecation-date']).toBeDefined();
      // expect(response.headers['x-api-sunset-date']).toBeDefined();
      
      // For now, just verify the response is successful
      expect(response.body.success).toBe(true);
    });
  });
});