# API Migration Guide

This document provides comprehensive guidance for migrating between different versions of the Last Mile Delivery Platform API.

## Version Overview

| Version | Status | Release Date | Deprecation Date | Sunset Date |
|---------|--------|--------------|------------------|-------------|
| v1.0    | Current | 2024-01-01   | TBD             | TBD         |
| v1.1    | Planned | 2024-06-01   | TBD             | TBD         |
| v2.0    | Beta    | 2024-09-01   | TBD             | TBD         |

## Version Detection

The API supports multiple methods for version detection:

### 1. URL Path (Recommended)
```
GET /api/v1/auth/login
GET /api/v2/auth/login
```

### 2. Accept-Version Header
```http
GET /api/auth/login
Accept-Version: v1
```

### 3. Query Parameter
```
GET /api/auth/login?version=v1
```

## Migration Paths

### V1.0 to V1.1 (Minor Update)

**Migration Effort:** Low  
**Breaking Changes:** None  
**Timeline:** 1-2 days

#### What's New in V1.1
- Enhanced offer filtering options
- Improved geospatial query performance
- Additional notification types
- Extended user profile fields

#### Migration Steps
1. **Update API calls (Optional)**
   - All V1.0 endpoints remain fully compatible
   - New features are additive only

2. **Adopt new features (Recommended)**
   ```javascript
   // New filtering options in V1.1
   GET /api/v1.1/offers?packageType=fragile&maxDistance=5000&sortBy=payment
   ```

3. **Test thoroughly**
   - Existing functionality should work unchanged
   - Test new features if adopted

#### Code Examples

**V1.0 (Still supported)**
```javascript
// Basic offer filtering
const response = await fetch('/api/v1/offers?distance=5000');
```

**V1.1 (Enhanced)**
```javascript
// Enhanced filtering with new options
const response = await fetch('/api/v1.1/offers?distance=5000&packageType=fragile&sortBy=payment');
```

### V1.0 to V2.0 (Major Update)

**Migration Effort:** High  
**Breaking Changes:** Yes  
**Timeline:** 1-2 weeks

#### Breaking Changes in V2.0

1. **Authentication Response Format**
   ```javascript
   // V1.0 Response
   {
     "success": true,
     "data": {
       "user": { ... },
       "token": "jwt-token",
       "accessToken": "jwt-token",  // Duplicate
       "tokenType": "Bearer",
       "expiresIn": "24h"           // String format
     }
   }

   // V2.0 Response
   {
     "success": true,
     "data": {
       "user": { 
         "metadata": { ... },       // New field
         "securityLevel": "standard" // New field
       },
       "authentication": {          // Restructured
         "accessToken": "jwt-token",
         "refreshToken": "refresh-token", // New
         "tokenType": "Bearer",
         "expiresIn": 3600,         // Numeric seconds
         "refreshExpiresIn": 604800,
         "scope": ["read", "write"]
       }
     }
   }
   ```

2. **Enhanced Password Requirements**
   ```javascript
   // V1.0: Basic password validation
   password: "simple123"  // ✅ Valid

   // V2.0: Enhanced requirements
   password: "Simple123!" // ✅ Valid (uppercase, lowercase, number, special char)
   password: "simple123"  // ❌ Invalid
   ```

3. **Account Security Features**
   - Account lockout after 5 failed attempts
   - Separate refresh token handling
   - Enhanced JWT claims

#### Migration Steps

1. **Review Breaking Changes**
   - Update authentication response parsing
   - Handle new error codes (ACCOUNT_LOCKED, WEAK_PASSWORD)
   - Update password validation on client side

2. **Update Authentication Flow**
   ```javascript
   // V1.0 Login
   const loginV1 = async (email, password) => {
     const response = await fetch('/api/v1/auth/login', {
       method: 'POST',
       body: JSON.stringify({ email, password })
     });
     const data = await response.json();
     return data.data.token; // Direct token access
   };

   // V2.0 Login
   const loginV2 = async (email, password) => {
     const response = await fetch('/api/v2/auth/login', {
       method: 'POST',
       body: JSON.stringify({ email, password })
     });
     const data = await response.json();
     return {
       accessToken: data.data.authentication.accessToken,
       refreshToken: data.data.authentication.refreshToken
     };
   };
   ```

3. **Implement Token Refresh**
   ```javascript
   // V2.0 Token Refresh (New in V2.0)
   const refreshToken = async (refreshToken) => {
     const response = await fetch('/api/v2/auth/refresh', {
       method: 'POST',
       body: JSON.stringify({ refreshToken })
     });
     const data = await response.json();
     return data.data.authentication;
   };
   ```

4. **Handle Account Lockout**
   ```javascript
   // V2.0 Error Handling
   const handleLoginError = (error) => {
     switch (error.code) {
       case 'ACCOUNT_LOCKED':
         // Show lockout message with unlock time
         showMessage(`Account locked until ${error.unlockTime}`);
         break;
       case 'WEAK_PASSWORD':
         // Show password requirements
         showPasswordRequirements();
         break;
       default:
         showGenericError(error.message);
     }
   };
   ```

5. **Update Password Validation**
   ```javascript
   // V2.0 Client-side validation
   const validatePassword = (password) => {
     const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
     return regex.test(password);
   };
   ```

## Backward Compatibility

### Automatic Transformations

The API automatically handles certain transformations for backward compatibility:

1. **Legacy Profile Fields**
   ```javascript
   // V1.0 Request (still supported)
   {
     "businessProfile": { ... }
   }
   
   // Automatically transformed to V2.0 format
   {
     "profile": { ... }
   }
   ```

2. **Response Format Adaptation**
   - V1 clients receive V1-formatted responses even from V2 endpoints
   - Coordinate formats are automatically converted
   - Pagination formats are maintained

### Compatibility Headers

When using deprecated versions, the API includes warning headers:

```http
X-API-Deprecated: true
X-API-Deprecation-Date: 2024-12-01T00:00:00Z
X-API-Sunset-Date: 2025-06-01T00:00:00Z
```

## Testing Your Migration

### 1. Automated Testing
```javascript
// Test both versions during migration
describe('API Migration Tests', () => {
  test('V1 authentication still works', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    expect(response.body.data.token).toBeDefined();
  });

  test('V2 authentication provides enhanced features', async () => {
    const response = await request(app)
      .post('/api/v2/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });
    
    expect(response.body.data.authentication.refreshToken).toBeDefined();
  });
});
```

### 2. Gradual Migration Strategy
1. **Phase 1:** Test V2 endpoints in development
2. **Phase 2:** Implement V2 authentication in staging
3. **Phase 3:** Gradually migrate production traffic
4. **Phase 4:** Monitor and rollback if needed

### 3. Feature Flags
```javascript
// Use feature flags for gradual rollout
const useV2Auth = process.env.FEATURE_V2_AUTH === 'true';

const authEndpoint = useV2Auth ? '/api/v2/auth/login' : '/api/v1/auth/login';
```

## Error Handling

### Version-Specific Errors

| Error Code | V1.0 | V2.0 | Description |
|------------|------|------|-------------|
| INVALID_CREDENTIALS | ✅ | ✅ | Wrong email/password |
| USER_EXISTS | ✅ | ✅ | Email already registered |
| WEAK_PASSWORD | ❌ | ✅ | Password doesn't meet V2 requirements |
| ACCOUNT_LOCKED | ❌ | ✅ | Too many failed attempts |
| INVALID_REFRESH_TOKEN | ❌ | ✅ | Refresh token invalid/expired |

### Error Response Format
```javascript
// Consistent across all versions
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-01T00:00:00Z",
    // V2.0 may include additional fields
    "field": "password",        // Field that caused validation error
    "requestId": "req-123"      // Request tracking ID
  }
}
```

## Best Practices

### 1. Version Pinning
Always specify the API version explicitly:
```javascript
// Good: Explicit version
const API_BASE = 'https://api.lastmile.com/api/v1';

// Bad: Implicit version (may change)
const API_BASE = 'https://api.lastmile.com/api';
```

### 2. Graceful Degradation
```javascript
const authenticateUser = async (email, password) => {
  try {
    // Try V2 first
    return await authenticateV2(email, password);
  } catch (error) {
    if (error.code === 'UNSUPPORTED_VERSION') {
      // Fallback to V1
      return await authenticateV1(email, password);
    }
    throw error;
  }
};
```

### 3. Monitor API Usage
```javascript
// Track version usage
analytics.track('api_version_used', {
  version: 'v1',
  endpoint: '/auth/login',
  timestamp: new Date()
});
```

## Support and Resources

### Getting Help
- **Documentation:** [API Documentation](./API.md)
- **Migration Support:** Contact our support team
- **Community:** Join our developer community

### Tools
- **Migration Checker:** Use our automated migration checker tool
- **Version Compatibility Matrix:** See which features are available in each version
- **Testing Utilities:** Use our testing helpers for migration validation

### Timeline
- **V1.0 Support:** Ongoing
- **V1.1 Release:** Q2 2024
- **V2.0 Beta:** Q3 2024
- **V2.0 GA:** Q4 2024

## Changelog

### V2.0 (Beta)
- Enhanced authentication security
- Separate refresh token handling
- Account lockout protection
- Improved password requirements
- Enhanced error reporting

### V1.1 (Planned)
- Enhanced offer filtering
- Improved geospatial queries
- Additional notification types
- Extended user profiles

### V1.0 (Current)
- Initial API release
- Basic authentication
- Core delivery functionality
- User management
- Offer management