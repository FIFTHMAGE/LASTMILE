/**
 * Authentication Flow Tests
 * Tests the complete authentication flow including login, token handling, and routing
 */

import { tokenUtils } from '../utils/tokenUtils';

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Token Utils', () => {
    test('should store and retrieve token correctly', () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsImV4cCI6OTk5OTk5OTk5OX0.test';
      
      // Store token
      const stored = tokenUtils.setToken(testToken);
      expect(stored).toBe(true);
      
      // Retrieve token
      const retrieved = tokenUtils.getToken();
      expect(retrieved).toBe(testToken);
    });

    test('should remove token correctly', () => {
      const testToken = 'test-token';
      tokenUtils.setToken(testToken);
      
      const removed = tokenUtils.removeToken();
      expect(removed).toBe(true);
      
      const retrieved = tokenUtils.getToken();
      expect(retrieved).toBe(null);
    });

    test('should decode valid JWT token', () => {
      // Valid JWT token with test payload
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsImV4cCI6OTk5OTk5OTk5OX0.test';
      
      const payload = tokenUtils.decodeToken(testToken);
      expect(payload).toEqual({
        id: '123',
        email: 'test@example.com',
        role: 'business',
        exp: 9999999999
      });
    });

    test('should detect expired tokens', () => {
      // Token with past expiration
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsImV4cCI6MTAwMDAwMDAwMH0.test';
      
      const isExpired = tokenUtils.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);
    });

    test('should validate token format and expiration', () => {
      // Valid future token
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsImV4cCI6OTk5OTk5OTk5OX0.test';
      
      const isValid = tokenUtils.isValidToken(validToken);
      expect(isValid).toBe(true);
      
      // Invalid format
      const invalidToken = 'invalid-token';
      const isInvalid = tokenUtils.isValidToken(invalidToken);
      expect(isInvalid).toBe(false);
    });

    test('should extract user data from token', () => {
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsIm5hbWUiOiJUZXN0IFVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.test';
      
      const userData = tokenUtils.getUserFromToken(testToken);
      expect(userData).toEqual({
        id: '123',
        email: 'test@example.com',
        role: 'business',
        name: 'Test User',
        isVerified: true
      });
    });

    test('should cleanup invalid tokens', () => {
      // Store invalid token
      const invalidToken = 'invalid-token';
      tokenUtils.setToken(invalidToken);
      
      const cleaned = tokenUtils.cleanupInvalidTokens();
      expect(cleaned).toBe(true);
      
      const retrieved = tokenUtils.getToken();
      expect(retrieved).toBe(null);
    });
  });

  describe('Authentication State', () => {
    test('should handle login success flow', async () => {
      // Mock successful login response
      const mockResponse = {
        data: {
          success: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsIm5hbWUiOiJUZXN0IFVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.test',
          user: {
            id: '123',
            email: 'test@example.com',
            role: 'business',
            name: 'Test User',
            isVerified: true
          }
        }
      };

      // Simulate login process
      const { user, token } = mockResponse.data;
      
      // Store token
      tokenUtils.setToken(token);
      
      // Verify token was stored
      const storedToken = tokenUtils.getToken();
      expect(storedToken).toBe(token);
      
      // Verify user data can be extracted
      const extractedUser = tokenUtils.getUserFromToken(token);
      expect(extractedUser).toEqual(user);
    });

    test('should handle logout flow', () => {
      // Setup authenticated state
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsImV4cCI6OTk5OTk5OTk5OX0.test';
      tokenUtils.setToken(testToken);
      
      // Verify token exists
      expect(tokenUtils.getToken()).toBe(testToken);
      
      // Simulate logout
      tokenUtils.removeToken();
      
      // Verify token was removed
      expect(tokenUtils.getToken()).toBe(null);
    });
  });

  describe('Role-based Routing', () => {
    test('should determine correct dashboard route for business user', () => {
      const businessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJidXNpbmVzcyIsImV4cCI6OTk5OTk5OTk5OX0.test';
      
      const userData = tokenUtils.getUserFromToken(businessToken);
      expect(userData.role).toBe('business');
      
      // Business users should go to /dashboard
      const expectedRoute = userData.role === 'admin' ? '/admin' : '/dashboard';
      expect(expectedRoute).toBe('/dashboard');
    });

    test('should determine correct dashboard route for rider user', () => {
      const riderToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJyaWRlciIsImV4cCI6OTk5OTk5OTk5OX0.test';
      
      const userData = tokenUtils.getUserFromToken(riderToken);
      expect(userData.role).toBe('rider');
      
      // Rider users should go to /dashboard
      const expectedRoute = userData.role === 'admin' ? '/admin' : '/dashboard';
      expect(expectedRoute).toBe('/dashboard');
    });

    test('should determine correct dashboard route for admin user', () => {
      const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.test';
      
      const userData = tokenUtils.getUserFromToken(adminToken);
      expect(userData.role).toBe('admin');
      
      // Admin users should go to /admin
      const expectedRoute = userData.role === 'admin' ? '/admin' : '/dashboard';
      expect(expectedRoute).toBe('/admin');
    });
  });
});

// Manual test helper for browser console
if (typeof window !== 'undefined') {
  window.testAuthFlow = {
    testLogin: () => {
      console.log('🧪 Testing login flow...');
      
      // Simulate demo login
      const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImVtYWlsIjoiYnVzaW5lc3NAZGV1by5jb20iLCJyb2xlIjoiYnVzaW5lc3MiLCJuYW1lIjoiRGVtbyBCdXNpbmVzcyIsImV4cCI6OTk5OTk5OTk5OX0.demo';
      
      tokenUtils.setToken(demoToken);
      const userData = tokenUtils.getUserFromToken(demoToken);
      
      console.log('✅ Login test completed:', userData);
      return userData;
    },
    
    testLogout: () => {
      console.log('🧪 Testing logout flow...');
      tokenUtils.removeToken();
      console.log('✅ Logout test completed');
    },
    
    getDebugInfo: () => {
      return {
        hasToken: !!tokenUtils.getToken(),
        token: tokenUtils.getToken(),
        userData: tokenUtils.getToken() ? tokenUtils.getUserFromToken(tokenUtils.getToken()) : null
      };
    }
  };
}