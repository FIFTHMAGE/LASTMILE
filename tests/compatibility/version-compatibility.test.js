/**
 * API Version Compatibility Tests
 * Tests backward compatibility and version-specific functionality
 */

const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const { setupTestDB, cleanupTestDB } = require('../utils/testSetup');

describe('API Version Compatibility', () => {
  let testUsers = {};
  let testTokens = {};

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.deleteMany({});
    testUsers = {};
    testTokens = {};
  });

  describe('Version Detection', () => {
    it('should detect version from URL path', async () => {
      const response = await request(app)
        .get('/api/v1/version')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
      expect(response.body.data.currentVersion).toBe('v1');
    });

    it('should detect version from Accept-Version header', async () => {
      const response = await request(app)
        .get('/api/version')
        .set('Accept-Version', 'v1')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
      expect(response.body.data.currentVersion).toBe('v1');
    });

    it('should detect version from query parameter', async () => {
      const response = await request(app)
        .get('/api/version?version=v1')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
      expect(response.body.data.currentVersion).toBe('v1');
    });

    it('should default to current version when no version specified', async () => {
      const response = await request(app)
        .get('/api/version')
        .expect(200);

      expect(response.headers['x-api-version']).toBe('v1');
      expect(response.body.data.currentVersion).toBe('v1');
    });

    it('should reject unsupported versions', async () => {
      const response = await request(app)
        .get('/api/v99/version')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_VERSION');
      expect(response.body.error.supportedVersions).toContain('v1');
    });
  });

  describe('V1 Authentication Compatibility', () => {
    const businessUserData = {
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

    const riderUserData = {
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

    it('should register business user with v1 format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(businessUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('business');
      expect(response.body.data.user.profile).toBeDefined();
      expect(response.body.data.user.businessProfile).toBeDefined(); // v1 compatibility
      expect(response.body.data.token).toBeDefined();
      expect(response.headers['x-api-version']).toBe('v1');
    });

    it('should register rider user with v1 format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(riderUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('rider');
      expect(response.body.data.user.profile).toBeDefined();
      expect(response.body.data.user.riderProfile).toBeDefined(); // v1 compatibility
      expect(response.body.data.token).toBeDefined();
    });

    it('should handle legacy businessProfile field name', async () => {
      const legacyData = {
        ...businessUserData,
        businessProfile: businessUserData.profile
      };
      delete legacyData.profile;

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(legacyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profile).toBeDefined();
      expect(response.body.data.user.businessProfile).toBeDefined();
    });

    it('should handle legacy riderProfile field name', async () => {
      const legacyData = {
        ...riderUserData,
        riderProfile: riderUserData.profile
      };
      delete legacyData.profile;

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(legacyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profile).toBeDefined();
      expect(response.body.data.user.riderProfile).toBeDefined();
    });

    it('should login with v1 format', async () => {
      // First register a user
      await request(app)
        .post('/api/v1/auth/register')
        .send(businessUserData)
        .expect(201);

      // Then login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: businessUserData.email,
          password: businessUserData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined(); // v1 compatibility
      expect(response.body.data.tokenType).toBe('Bearer');
      expect(response.body.data.expiresIn).toBe('24h');
    });

    it('should refresh token with v1 format', async () => {
      // Register and login to get a token
      await request(app)
        .post('/api/v1/auth/register')
        .send(businessUserData)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: businessUserData.email,
          password: businessUserData.password
        })
        .expect(200);

      const token = loginResponse.body.data.token;

      // Refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined(); // v1 compatibility
      expect(response.body.data.tokenType).toBe('Bearer');
      expect(response.body.data.expiresIn).toBe('24h');
    });
  });

  describe('V2 Authentication Enhancements', () => {
    const strongPassword = 'SecurePass123!';
    const businessUserDataV2 = {
      name: 'Test Business V2',
      email: 'businessv2@test.com',
      password: strongPassword,
      role: 'business',
      profile: {
        businessName: 'Test Delivery Co V2',
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

    it('should register user with v2 enhanced security', async () => {
      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(businessUserDataV2)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.securityLevel).toBe('standard');
      expect(response.body.data.user.metadata.version).toBe('v2');
      expect(response.body.data.authentication.accessToken).toBeDefined();
      expect(response.body.data.authentication.expiresIn).toBe(86400); // numeric
      expect(response.body.data.authentication.scope).toContain('read');
    });

    it('should reject weak passwords in v2', async () => {
      const weakPasswordData = {
        ...businessUserDataV2,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/v2/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('should login with v2 enhanced format', async () => {
      // Register user first
      await request(app)
        .post('/api/v2/auth/register')
        .send(businessUserDataV2)
        .expect(201);

      // Login
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: businessUserDataV2.email,
          password: businessUserDataV2.password,
          deviceInfo: { fingerprint: 'test-device' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authentication.accessToken).toBeDefined();
      expect(response.body.data.authentication.refreshToken).toBeDefined();
      expect(response.body.data.authentication.expiresIn).toBe(3600); // 1 hour
      expect(response.body.data.authentication.refreshExpiresIn).toBe(604800); // 7 days
      expect(response.body.data.user.metadata.sessionId).toBeDefined();
    });

    it('should handle account lockout in v2', async () => {
      // Register user first
      await request(app)
        .post('/api/v2/auth/register')
        .send(businessUserDataV2)
        .expect(201);

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v2/auth/login')
          .send({
            email: businessUserDataV2.email,
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // 6th attempt should result in account lockout
      const response = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: businessUserDataV2.email,
          password: 'wrongpassword'
        })
        .expect(423);

      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
      expect(response.body.error.unlockTime).toBeDefined();
    });

    it('should refresh tokens with v2 format', async () => {
      // Register and login
      await request(app)
        .post('/api/v2/auth/register')
        .send(businessUserDataV2)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/v2/auth/login')
        .send({
          email: businessUserDataV2.email,
          password: businessUserDataV2.password
        })
        .expect(200);

      const refreshToken = loginResponse.body.data.authentication.refreshToken;

      // Refresh tokens
      const response = await request(app)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authentication.accessToken).toBeDefined();
      expect(response.body.data.authentication.refreshToken).toBeDefined();
      expect(response.body.data.authentication.expiresIn).toBe(3600);
    });
  });

  describe('Cross-Version Compatibility', () => {
    it('should handle v1 and v2 users in the same system', async () => {
      // Register v1 user
      const v1Response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'V1 User',
          email: 'v1user@test.com',
          password: 'password123',
          role: 'business',
          profile: {
            businessName: 'V1 Business',
            businessAddress: {
              street: '123 V1 St',
              city: 'V1 City',
              state: 'V1',
              zipCode: '12345',
              coordinates: [-74.006, 40.7128]
            },
            businessPhone: '555-0001'
          }
        })
        .expect(201);

      // Register v2 user
      const v2Response = await request(app)
        .post('/api/v2/auth/register')
        .send({
          name: 'V2 User',
          email: 'v2user@test.com',
          password: 'SecurePass123!',
          role: 'business',
          profile: {
            businessName: 'V2 Business',
            businessAddress: {
              street: '123 V2 St',
              city: 'V2 City',
              state: 'V2',
              zipCode: '12345',
              coordinates: [-74.006, 40.7128]
            },
            businessPhone: '555-0002'
          }
        })
        .expect(201);

      expect(v1Response.body.data.user.name).toBe('V1 User');
      expect(v2Response.body.data.user.name).toBe('V2 User');
      expect(v2Response.body.data.user.securityLevel).toBe('standard');
    });

    it('should maintain separate token formats per version', async () => {
      // Create users in both versions
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'V1 User',
          email: 'v1user@test.com',
          password: 'password123',
          role: 'business',
          profile: {
            businessName: 'V1 Business',
            businessAddress: {
              street: '123 V1 St',
              city: 'V1 City',
              state: 'V1',
              zipCode: '12345',
              coordinates: [-74.006, 40.7128]
            },
            businessPhone: '555-0001'
          }
        });

      await request(app)
        .post('/api/v2/auth/register')
        .send({
          name: 'V2 User',
          email: 'v2user@test.com',
          password: 'SecurePass123!',
          role: 'business',
          profile: {
            businessName: 'V2 Business',
            businessAddress: {
              street: '123 V2 St',
              city: 'V2 City',
              state: 'V2',
              zipCode: '12345',
              coordinates: [-74.006, 40.7128]
            },
            businessPhone: '555-0002'
          }
        });

      // Login with v1
      const v1Login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'v1user@test.com', password: 'password123' })
        .expect(200);

      // Login with v2
      const v2Login = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'v2user@test.com', password: 'SecurePass123!' })
        .expect(200);

      // Verify different response formats
      expect(v1Login.body.data.token).toBeDefined();
      expect(v1Login.body.data.expiresIn).toBe('24h');

      expect(v2Login.body.data.authentication.accessToken).toBeDefined();
      expect(v2Login.body.data.authentication.refreshToken).toBeDefined();
      expect(v2Login.body.data.authentication.expiresIn).toBe(3600);
    });
  });

  describe('Version Information Endpoints', () => {
    it('should provide version information', async () => {
      const response = await request(app)
        .get('/api/version')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentVersion).toBeDefined();
      expect(response.body.data.supportedVersions).toBeInstanceOf(Array);
      expect(response.body.data.latestVersion).toBeDefined();
    });

    it('should provide migration guidance', async () => {
      const response = await request(app)
        .get('/api/migration?from=v1&to=v2')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.fromVersion).toBe('v1');
      expect(response.body.data.toVersion).toBe('v2');
      expect(response.body.data.migrationRequired).toBe(true);
      expect(response.body.data.breakingChanges).toBeInstanceOf(Array);
      expect(response.body.data.migrationSteps).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling Across Versions', () => {
    it('should maintain consistent error format across versions', async () => {
      // Test v1 error format
      const v1Error = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' })
        .expect(401);

      expect(v1Error.body.success).toBe(false);
      expect(v1Error.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(v1Error.body.error.timestamp).toBeDefined();

      // Test v2 error format
      const v2Error = await request(app)
        .post('/api/v2/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' })
        .expect(401);

      expect(v2Error.body.success).toBe(false);
      expect(v2Error.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(v2Error.body.error.timestamp).toBeDefined();
      expect(v2Error.body.error.requestId).toBeDefined(); // v2 enhancement
    });
  });

  describe('Performance and Compatibility', () => {
    it('should not significantly impact performance with version detection', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/v1/version')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle concurrent requests to different versions', async () => {
      const promises = [
        request(app).get('/api/v1/version'),
        request(app).get('/api/v2/version'),
        request(app).get('/api/version').set('Accept-Version', 'v1'),
        request(app).get('/api/version?version=v2')
      ];

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(responses[0].headers['x-api-version']).toBe('v1');
      expect(responses[1].headers['x-api-version']).toBe('v2');
      expect(responses[2].headers['x-api-version']).toBe('v1');
      expect(responses[3].headers['x-api-version']).toBe('v2');
    });
  });
});