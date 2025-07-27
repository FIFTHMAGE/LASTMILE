/**
 * Authentication Debug Utilities
 * Provides debugging tools for authentication flow
 */

const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

export const authDebug = {
  /**
   * Log authentication events with context
   */
  log: (event, data = {}) => {
    if (!DEBUG_ENABLED) return;
    
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      event,
      ...data
    };
    
    console.group(`🔍 AUTH DEBUG: ${event}`);
    console.log('Data:', logData);
    console.groupEnd();
  },

  /**
   * Log authentication errors with stack trace
   */
  error: (event, error, context = {}) => {
    const timestamp = new Date().toISOString();
    const errorData = {
      timestamp,
      event,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    };
    
    console.group(`❌ AUTH ERROR: ${event}`);
    console.error('Error:', errorData);
    if (error.response) {
      console.error('API Response:', error.response);
    }
    console.groupEnd();
    
    // Store error for debugging
    if (typeof window !== 'undefined') {
      window.lastAuthError = errorData;
    }
  },

  /**
   * Log authentication state changes
   */
  stateChange: (from, to, reason = '') => {
    if (!DEBUG_ENABLED) return;
    
    console.log(`🔄 AUTH STATE: ${from} → ${to}${reason ? ` (${reason})` : ''}`);
  },

  /**
   * Log token operations
   */
  token: (operation, tokenInfo = {}) => {
    if (!DEBUG_ENABLED) return;
    
    console.group(`🎫 TOKEN: ${operation}`);
    console.log('Token Info:', {
      hasToken: !!tokenInfo.token,
      length: tokenInfo.token?.length,
      expired: tokenInfo.expired,
      payload: tokenInfo.payload
    });
    console.groupEnd();
  },

  /**
   * Log API calls
   */
  api: (method, url, data = {}) => {
    if (!DEBUG_ENABLED) return;
    
    console.group(`🌐 API: ${method.toUpperCase()} ${url}`);
    if (Object.keys(data).length > 0) {
      console.log('Data:', data);
    }
    console.groupEnd();
  },

  /**
   * Log navigation events
   */
  navigation: (from, to, reason = '') => {
    if (!DEBUG_ENABLED) return;
    
    console.log(`🧭 NAVIGATION: ${from} → ${to}${reason ? ` (${reason})` : ''}`);
  },

  /**
   * Get current authentication debug info
   */
  getDebugInfo: () => {
    const token = localStorage.getItem('token');
    let tokenInfo = null;
    
    if (token) {
      try {
        const parts = token.split('.');
        const payload = JSON.parse(atob(parts[1]));
        tokenInfo = {
          hasToken: true,
          length: token.length,
          payload: {
            exp: payload.exp,
            role: payload.role,
            email: payload.email,
            expired: payload.exp * 1000 < Date.now()
          }
        };
      } catch (error) {
        tokenInfo = {
          hasToken: true,
          length: token.length,
          error: 'Failed to decode token'
        };
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      localStorage: {
        token: tokenInfo
      },
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  },

  /**
   * Clear debug data
   */
  clear: () => {
    if (typeof window !== 'undefined') {
      delete window.lastAuthError;
    }
    console.clear();
  }
};

// Add global debug helper in development
if (DEBUG_ENABLED && typeof window !== 'undefined') {
  window.authDebug = authDebug;
}

export default authDebug;