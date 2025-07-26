/**
 * User Workflow Integration Tests
 * End-to-end tests for user registration, authentication, and profile management
 */

const request = require('supertest');
const app = require('../../server');
const TestFactories = global.testUtils.TestFactories;
const TestHelpers = global.testUtils.TestHelpers;

describe('User Workflow Integration Tests', () => {
  beforeEach(async () => {
    // Clean database before each test
    await TestFactories.cleanup();
  });

  describe('Business User Registration and Authentication Workflow', () => {
    test('should complete full business registration and authentication flow', async () => {
      // Step 1: Register business user
      const businessData = {
        name: 'John Business Owner',
        email: TestHelpers.generateRandomEmail('business'),
        password: 'securePassword123',
        role: 'business',
        businessName: 'Johns Delivery Service',
        businessAddress: {
          street: '123 Business Avenue',
          city: 'Business City',
          state: 'BC',
          zipCode: '12345'
        },
        businessPhone: TestHelpers.generateRandomPhone()
      };

      const registerResponse = await TestHelpers.post(app, '/api/auth/register', businessData);
      const registrationData = TestHelpers.expectSuccessResponse(registerResponse, 201);
      
      // Validate registration response
      const user = TestHelpers.validateUserResponse(registrationData.user, 'business');
      expect(user.name).toBe(businessData.name);
      expect(user.email).toBe(businessData.email);
      expect(user.isVerified).toBe(false); // Should start unverified
      expect(registrationData.token).toBeDefined();

      // Step 2: Login with registered credentials
      const loginResponse = await TestHelpers.post(app, '/api/auth/login', {
        email: businessData.email,
        password: businessData.password
      });
      const loginData = TestHelpers.expectSuccessResponse(loginResponse, 200);
      
      expect(loginData.token).toBeDefined();
      expect(loginData.user.email).toBe(businessData.email);

      // Step 3: Access protected profile endpoint
      const profileResponse = await TestHelpers.get(app, '/api/auth/profile', loginData.token);
      const profileData = TestHelpers.expectSuccessResponse(profileResponse, 200);
      
      const profileUser = TestHelpers.validateUserResponse(profileData.user, 'business');
      expect(profileUser.businessName).toBe(businessData.businessName);
      expect(profileUser.businessAddress.street).toBe(businessData.businessAddress.street);
      expect(profileUser.businessPhone).toBe(businessData.businessPhone);

      // Step 4: Update profile information
      const updateData = {
        businessName: 'Johns Premium Delivery Service',
        businessPhone: TestHelpers.generateRandomPhone()
      };

      const updateResponse = await TestHelpers.patch(app, '/api/auth/profile', updateData, loginData.token);
      const updatedData = TestHelpers.expectSuccessResponse(updateResponse, 200);
      
      expect(updatedData.user.businessName).toBe(updateData.businessName);
      expect(updatedData.user.businessPhone).toBe(updateData.businessPhone);

      // Step 5: Logout
      const logoutResponse = await TestHelpers.post(app, '/api/auth/logout', {}, loginData.token);
      TestHelpers.expectSuccessResponse(logoutResponse, 200);

      // Step 6: Verify token is invalidated (optional - depends on implementation)
      // Some implementations may still accept the token until expiry
    });

    test('should handle business registration validation errors', async () => {
      // Test missing required business fields
      const incompleteData = {
        name: 'John Business',
        email: TestHelpers.generateRandomEmail('business'),
        password: 'password123',
        role: 'business'
        // Missing businessName, businessAddress, businessPhone
      };

      const response = await TestHelpers.post(app, '/api/auth/register', incompleteData);
      TestHelpers.expectValidationError(response);
    });

    test('should prevent duplicate email registration', async () => {
      // Register first user
      const userData = {
        name: 'First Business',
        email: 'duplicate@test.com',
        password: 'password123',
        role: 'business',
        businessName: 'First Business Inc',
        businessAddress: {
          street: '123 First St',
          city: 'First City',
          state: 'FC',
          zipCode: '12345'
        },
        businessPhone: '555-0001'
      };

      await TestHelpers.post(app, '/api/auth/register', userData);

      // Try to register with same email
      const duplicateData = { ...userData, name: 'Second Business' };
      const response = await TestHelpers.post(app, '/api/auth/register', duplicateData);
      
      TestHelpers.expectErrorResponse(response, 400);
    });
  });

  describe('Rider User Registration and Authentication Workflow', () => {
    test('should complete full rider registration and authentication flow', async () => {
      // Step 1: Register rider user
      const riderData = {
        name: 'Jane Rider',
        email: TestHelpers.generateRandomEmail('rider'),
        password: 'securePassword123',
        role: 'rider',
        phone: TestHelpers.generateRandomPhone(),
        vehicleType: 'bike'
      };

      const registerResponse = await TestHelpers.post(app, '/api/auth/register', riderData);
      const registrationData = TestHelpers.expectSuccessResponse(registerResponse, 201);
      
      // Validate registration response
      const user = TestHelpers.validateUserResponse(registrationData.user, 'rider');
      expect(user.name).toBe(riderData.name);
      expect(user.email).toBe(riderData.email);
      expect(user.phone).toBe(riderData.phone);
      expect(user.vehicleType).toBe(riderData.vehicleType);
      expect(user.isAvailable).toBe(true); // Should default to available
      expect(user.rating).toBe(5.0); // Should default to 5.0
      expect(user.completedDeliveries).toBe(0); // Should start at 0

      // Step 2: Login and access profile
      const loginResponse = await TestHelpers.post(app, '/api/auth/login', {
        email: riderData.email,
        password: riderData.password
      });
      const loginData = TestHelpers.expectSuccessResponse(loginResponse, 200);

      // Step 3: Update rider availability
      const availabilityUpdate = { isAvailable: false };
      const updateResponse = await TestHelpers.patch(app, '/api/auth/profile', availabilityUpdate, loginData.token);
      const updatedData = TestHelpers.expectSuccessResponse(updateResponse, 200);
      
      expect(updatedData.user.isAvailable).toBe(false);

      // Step 4: Update location
      const locationUpdate = {
        currentLocation: {
          type: 'Point',
          coordinates: TestHelpers.generateRandomCoordinates()
        }
      };
      
      const locationResponse = await TestHelpers.patch(app, '/api/auth/profile', locationUpdate, loginData.token);
      const locationData = TestHelpers.expectSuccessResponse(locationResponse, 200);
      
      expect(locationData.user.currentLocation.coordinates).toEqual(locationUpdate.currentLocation.coordinates);
    });

    test('should handle rider registration validation errors', async () => {
      // Test invalid vehicle type
      const invalidData = {
        name: 'Jane Rider',
        email: TestHelpers.generateRandomEmail('rider'),
        password: 'password123',
        role: 'rider',
        phone: TestHelpers.generateRandomPhone(),
        vehicleType: 'invalid_vehicle' // Invalid vehicle type
      };

      const response = await TestHelpers.post(app, '/api/auth/register', invalidData);
      TestHelpers.expectValidationError(response);
    });
  });

  describe('Admin User Authentication Workflow', () => {
    test('should complete admin authentication and access control flow', async () => {
      // Step 1: Create admin user (typically done via seeding or special endpoint)
      const admin = await TestFactories.createAdminUser({
        email: 'admin@test.com',
        password: 'adminPassword123'
      });

      // Step 2: Admin login
      const loginResponse = await TestHelpers.post(app, '/api/admin/login', {
        email: 'admin@test.com',
        password: 'adminPassword123'
      });
      const loginData = TestHelpers.expectSuccessResponse(loginResponse, 200);
      
      expect(loginData.token).toBeDefined();
      expect(loginData.admin.role).toBe('admin');
      expect(loginData.admin.permissions).toContain('manage_users');

      // Step 3: Access admin dashboard
      const dashboardResponse = await TestHelpers.get(app, '/api/admin/dashboard', loginData.token);
      const dashboardData = TestHelpers.expectSuccessResponse(dashboardResponse, 200);
      
      expect(dashboardData.overview).toBeDefined();
      expect(dashboardData.todayStats).toBeDefined();

      // Step 4: Access user management
      const usersResponse = await TestHelpers.get(app, '/api/admin/users', loginData.token);
      const usersData = TestHelpers.expectSuccessResponse(usersResponse, 200);
      
      expect(usersData.users).toBeDefined();
      expect(usersData.pagination).toBeDefined();

      // Step 5: Admin logout
      const logoutResponse = await TestHelpers.post(app, '/api/admin/logout', {}, loginData.token);
      TestHelpers.expectSuccessResponse(logoutResponse, 200);
    });

    test('should prevent non-admin access to admin endpoints', async () => {
      // Create regular business user
      const business = await TestFactories.createBusinessUser();
      const businessToken = TestHelpers.generateToken(business);

      // Try to access admin dashboard
      const response = await TestHelpers.get(app, '/api/admin/dashboard', businessToken);
      TestHelpers.expectAuthorizationError(response);
    });
  });

  describe('Cross-Role Authentication Security', () => {
    test('should prevent role escalation attacks', async () => {
      // Create business user
      const business = await TestFactories.createBusinessUser();
      const businessToken = TestHelpers.generateToken(business);

      // Try to access rider-specific endpoints (if any exist)
      // This would depend on your specific role-based routing implementation
      
      // Try to access admin endpoints
      const adminResponse = await TestHelpers.get(app, '/api/admin/users', businessToken);
      TestHelpers.expectAuthorizationError(adminResponse);
    });

    test('should handle token expiration gracefully', async () => {
      // Create user with expired token
      const user = await TestFactories.createBusinessUser();
      const expiredToken = TestHelpers.generateToken(user, '1ms'); // Expires immediately
      
      // Wait for token to expire
      await TestHelpers.wait(10);
      
      // Try to access protected endpoint
      const response = await TestHelpers.get(app, '/api/auth/profile', expiredToken);
      TestHelpers.expectAuthenticationError(response);
    });

    test('should handle invalid tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      const response = await TestHelpers.get(app, '/api/auth/profile', invalidToken);
      TestHelpers.expectAuthenticationError(response);
    });
  });

  describe('Password Security Workflow', () => {
    test('should handle password change workflow', async () => {
      // Create and login user
      const userData = {
        name: 'Test User',
        email: TestHelpers.generateRandomEmail('test'),
        password: 'oldPassword123',
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

      const registerResponse = await TestHelpers.post(app, '/api/auth/register', userData);
      const { token } = TestHelpers.expectSuccessResponse(registerResponse, 201);

      // Change password
      const passwordChangeData = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456'
      };

      const changeResponse = await TestHelpers.patch(app, '/api/auth/change-password', passwordChangeData, token);
      TestHelpers.expectSuccessResponse(changeResponse, 200);

      // Verify old password no longer works
      const oldLoginResponse = await TestHelpers.post(app, '/api/auth/login', {
        email: userData.email,
        password: 'oldPassword123'
      });
      TestHelpers.expectAuthenticationError(oldLoginResponse);

      // Verify new password works
      const newLoginResponse = await TestHelpers.post(app, '/api/auth/login', {
        email: userData.email,
        password: 'newPassword456'
      });
      TestHelpers.expectSuccessResponse(newLoginResponse, 200);
    });

    test('should handle forgot password workflow', async () => {
      // Create user
      const user = await TestFactories.createBusinessUser({
        email: 'forgot@test.com'
      });

      // Request password reset
      const resetRequestResponse = await TestHelpers.post(app, '/api/auth/forgot-password', {
        email: 'forgot@test.com'
      });
      TestHelpers.expectSuccessResponse(resetRequestResponse, 200);

      // In a real implementation, you would:
      // 1. Check that reset email was sent
      // 2. Extract reset token from email
      // 3. Use reset token to set new password
      // For this test, we'll simulate the process
    });
  });

  describe('User Profile Management Workflow', () => {
    test('should handle complete profile update workflow for business', async () => {
      // Create business user
      const business = await TestFactories.createBusinessUser();
      const token = TestHelpers.generateToken(business);

      // Update all profile fields
      const updateData = {
        name: 'Updated Business Name',
        businessName: 'Updated Business Inc',
        businessAddress: {
          street: '456 Updated Street',
          city: 'Updated City',
          state: 'UC',
          zipCode: '67890'
        },
        businessPhone: TestHelpers.generateRandomPhone()
      };

      const updateResponse = await TestHelpers.patch(app, '/api/auth/profile', updateData, token);
      const updatedData = TestHelpers.expectSuccessResponse(updateResponse, 200);

      // Verify all fields were updated
      expect(updatedData.user.name).toBe(updateData.name);
      expect(updatedData.user.businessName).toBe(updateData.businessName);
      expect(updatedData.user.businessAddress.street).toBe(updateData.businessAddress.street);
      expect(updatedData.user.businessPhone).toBe(updateData.businessPhone);

      // Verify profile persists after re-login
      const loginResponse = await TestHelpers.post(app, '/api/auth/login', {
        email: business.email,
        password: 'password123' // Default password from factory
      });
      const loginData = TestHelpers.expectSuccessResponse(loginResponse, 200);
      
      expect(loginData.user.name).toBe(updateData.name);
      expect(loginData.user.businessName).toBe(updateData.businessName);
    });

    test('should handle rider profile updates with location tracking', async () => {
      // Create rider user
      const rider = await TestFactories.createRiderUser();
      const token = TestHelpers.generateToken(rider);

      // Update rider profile with location
      const updateData = {
        phone: TestHelpers.generateRandomPhone(),
        vehicleType: 'car',
        isAvailable: false,
        currentLocation: {
          type: 'Point',
          coordinates: TestHelpers.generateRandomCoordinates()
        }
      };

      const updateResponse = await TestHelpers.patch(app, '/api/auth/profile', updateData, token);
      const updatedData = TestHelpers.expectSuccessResponse(updateResponse, 200);

      // Verify updates
      expect(updatedData.user.phone).toBe(updateData.phone);
      expect(updatedData.user.vehicleType).toBe(updateData.vehicleType);
      expect(updatedData.user.isAvailable).toBe(updateData.isAvailable);
      expect(updatedData.user.currentLocation.coordinates).toEqual(updateData.currentLocation.coordinates);
    });
  });

  describe('User Verification Workflow', () => {
    test('should handle admin user verification workflow', async () => {
      // Create unverified business user
      const business = await TestFactories.createBusinessUser({ isVerified: false });
      const admin = await TestFactories.createAdminUser();
      const adminToken = TestHelpers.generateAdminToken(admin);

      // Admin verifies user
      const verifyResponse = await TestHelpers.patch(
        app, 
        `/api/admin/users/${business._id}/verify`, 
        { isVerified: true }, 
        adminToken
      );
      const verifyData = TestHelpers.expectSuccessResponse(verifyResponse, 200);
      
      expect(verifyData.user.isVerified).toBe(true);

      // Verify user can now access verified-only features (if any)
      const userToken = TestHelpers.generateToken(business);
      const profileResponse = await TestHelpers.get(app, '/api/auth/profile', userToken);
      const profileData = TestHelpers.expectSuccessResponse(profileResponse, 200);
      
      expect(profileData.user.isVerified).toBe(true);
    });
  });
});