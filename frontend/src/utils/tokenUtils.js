/**
 * Token Utilities for Authentication
 * Handles token storage, validation, and cleanup
 */

const TOKEN_KEY = 'token';

export const tokenUtils = {
  /**
   * Store token in localStorage
   */
  setToken: (token) => {
    if (!token) {
      console.warn('⚠️ Attempting to store null/undefined token');
      return false;
    }
    
    try {
      localStorage.setItem(TOKEN_KEY, token);
      console.log('✅ Token stored successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to store token:', error);
      return false;
    }
  },

  /**
   * Get token from localStorage
   */
  getToken: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      console.log('🔍 Retrieved token:', token ? 'Found' : 'None');
      return token;
    } catch (error) {
      console.error('❌ Failed to retrieve token:', error);
      return null;
    }
  },

  /**
   * Remove token from localStorage
   */
  removeToken: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      console.log('✅ Token removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to remove token:', error);
      return false;
    }
  },

  /**
   * Decode JWT token payload
   */
  decodeToken: (token) => {
    if (!token) {
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));
      console.log('✅ Token decoded successfully');
      return payload;
    } catch (error) {
      console.error('❌ Failed to decode token:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (token) => {
    const payload = tokenUtils.decodeToken(token);
    if (!payload || !payload.exp) {
      console.log('⚠️ Token has no expiration or invalid payload');
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < currentTime;
    
    console.log('🔍 Token expiration check:', {
      exp: payload.exp,
      current: currentTime,
      expired: isExpired
    });

    return isExpired;
  },

  /**
   * Validate token format and expiration
   */
  isValidToken: (token) => {
    if (!token || typeof token !== 'string') {
      console.log('❌ Invalid token: null or not string');
      return false;
    }

    // Check format
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('❌ Invalid token: wrong format');
      return false;
    }

    // Check expiration
    if (tokenUtils.isTokenExpired(token)) {
      console.log('❌ Invalid token: expired');
      return false;
    }

    console.log('✅ Token is valid');
    return true;
  },

  /**
   * Get user data from token
   */
  getUserFromToken: (token) => {
    const payload = tokenUtils.decodeToken(token);
    if (!payload) {
      return null;
    }

    return {
      id: payload.id || payload.userId || payload._id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      isVerified: payload.isVerified !== undefined ? payload.isVerified : true
    };
  },

  /**
   * Clean up invalid tokens
   */
  cleanupInvalidTokens: () => {
    const token = tokenUtils.getToken();
    if (token && !tokenUtils.isValidToken(token)) {
      console.log('🧹 Cleaning up invalid token');
      tokenUtils.removeToken();
      return true;
    }
    return false;
  },

  /**
   * Get time until token expires (in seconds)
   */
  getTimeUntilExpiry: (token) => {
    const payload = tokenUtils.decodeToken(token);
    if (!payload || !payload.exp) {
      return 0;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = payload.exp - currentTime;
    
    return Math.max(0, timeUntilExpiry);
  }
};

export default tokenUtils;