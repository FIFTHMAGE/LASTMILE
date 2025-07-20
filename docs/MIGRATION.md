# API Migration Guide

## Overview

This guide helps developers migrate between different versions of the Last Mile Delivery Platform API. The API uses semantic versioning and provides backward compatibility support for smooth transitions.

## Current API Versions

| Version | Status | Release Date | Support End | Breaking Changes |
|---------|--------|--------------|-------------|------------------|
| v1.0    | Stable | 2024-01-01   | 2025-01-01  | None (Initial)   |
| v1.1    | Stable | 2024-06-01   | 2025-06-01  | None             |
| v2.0    | Beta   | 2024-12-01   | TBD         | Yes              |

## Version Detection

The API supports multiple ways to specify the version:

### 1. URL Path (Recommended)
```
GET /api/v1/business/offers
GET /api/v2/business/offers
```

### 2. Accept-Version Header
```http
GET /api/business/offers
Accept-Version: v1
```

### 3. Query Parameter
```
GET /api/business/offers?version=v1
```

## Migration Paths

### v1.0 → v1.1 (Non-Breaking)

**Effort Level**: Low  
**Migration Time**: 1-2 hours  
**Breaking Changes**: None

#### What's New in v1.1
- Enhanced filtering options for offers
- Improved error messages
- Additional metadata in responses
- Performance optimizations

#### Migration Steps
1. **Optional Update**: All v1.0 endpoints remain fully compatible
2. **New Features**: Adopt new filtering parameters if needed
3. **Testing**: Verify existing functionality works unchanged

#### Example Changes
```javascript
// v1.0 - Basic filtering
GET /api/v1/rider/nearby-offers?maxDistance=5000

// v1.1 - Enhanced filtering (backward compatible)
GET /api/v1.1/rider/nearby-offers?maxDistance=5000&vehicleType=bike&minRating=4.0
```

### v1.x → v2.0 (Breaking Changes)

**Effort Level**: High  
**Migration Time**: 1-2 weeks  
**Breaking Changes**: Yes

#### Major Breaking Changes

##### 1. Authentication Response Format
**v1.x Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "accessToken": "jwt_token",
    "tokenType": "Bearer",
    "expiresIn": "24h"
  }
}
```

**v2.0 Response:**
```json
{
  "success": true,
  "data": {
    "user": { 
      "metadata": { "version": "v2", ... }
    },
    "authentication": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "tokenType": "Bearer",
      "expiresIn": 3600,
      "refreshExpiresIn": 604800
    }
  }
}
```

##### 2. Enhanced Security Requirements
- Stronger password requirements
- Account lockout after failed attempts
- Separate refresh tokens
- Shorter access token lifetime (1 hour vs 24 hours)

##### 3. Response Structure Changes
- Numeric expiration times instead of strings
- Enhanced error responses with request IDs
- Additional security metadata

#### Migration Steps

##### Step 1: Review Breaking Changes
1. Read the complete changelog
2. Identify affected endpoints in your application
3. Plan the migration timeline

##### Step 2: Update Authentication Handling
```javascript
// v1.x Authentication
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = loginResponse.data;

// v2.0 Authentication
const loginResponse = await fetch('/api/v2/auth/login', {
  method: 'POST',
  body: JSON.stringify({ 
    email, 
    password,
    deviceInfo: { fingerprint: getDeviceFingerprint() }
  })
});
const { accessToken, refreshToken } = loginResponse.data.authentication;
```

##### Step 3: Implement Token Refresh
```javascript
// v2.0 Token Refresh (New Requirement)
const refreshTokens = async (refreshToken) => {
  const response = await fetch('/api/v2/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  
  if (response.ok) {
    const { authentication } = response.data;
    return {
      accessToken: authentication.accessToken,
      refreshToken: authentication.refreshToken
    };
  }
  
  throw new Error('Token refresh failed');
};
```

##### Step 4: Update Error Handling
```javascript
// v1.x Error Handling
if (!response.success) {
  console.error(response.error.message);
}

// v2.0 Enhanced Error Handling
if (!response.success) {
  console.error(`[${response.error.requestId}] ${response.error.message}`);
  
  // Handle specific v2.0 error codes
  switch (response.error.code) {
    case 'ACCOUNT_LOCKED':
      showAccountLockedMessage(response.error.unlockTime);
      break;
    case 'WEAK_PASSWORD':
      showPasswordRequirements();
      break;
    default:
      showGenericError(response.error.message);
  }
}
```

##### Step 5: Update Password Requirements
```javascript
// v2.0 Password Validation
const validatePassword = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password)
  };
  
  return Object.values(requirements).every(req => req);
};
```

##### Step 6: Test Thoroughly
1. **Unit Tests**: Update all authentication-related tests
2. **Integration Tests**: Test complete user flows
3. **Error Scenarios**: Test account lockout, token refresh, etc.
4. **Performance**: Verify token refresh doesn't impact UX

## Backward Compatibility

### Automatic Transformations

The API automatically handles some backward compatibility transformations:

#### Request Transformations (v1.x)
```javascript
// Legacy field names are automatically converted
{
  "businessProfile": { ... }  // Converted to "profile"
  "riderProfile": { ... }     // Converted to "profile"
  "coordinates": [lng, lat]   // Converted to GeoJSON format
}
```

#### Response Transformations (v1.x)
```javascript
// v1.x clients receive backward-compatible responses
{
  "profile": { ... },
  "businessProfile": { ... }, // Added for compatibility
  "riderProfile": { ... }     // Added for compatibility
}
```

### Version-Specific Routes

Some endpoints have version-specific implementations:

```javascript
// v1.x - Legacy authentication
POST /api/v1/auth/login

// v2.0 - Enhanced authentication
POST /api/v2/auth/login
```

## Testing Your Migration

### 1. Version Compatibility Test
```javascript
describe('API Version Compatibility', () => {
  it('should handle v1.0 requests', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.accessToken).toBeDefined(); // v1 compatibility
  });
  
  it('should handle v2.0 requests', async () => {
    const response = await request(app)
      .post('/api/v2/auth/login')
      .send({ 
        email: 'test@example.com', 
        password: 'SecurePass123!',
        deviceInfo: { fingerprint: 'test-device' }
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.authentication.accessToken).toBeDefined();
    expect(response.body.data.authentication.refreshToken).toBeDefined();
  });
});
```

### 2. Migration Validation Script
```javascript
const validateMigration = async () => {
  const tests = [
    { name: 'Authentication', endpoint: '/auth/login', method: 'POST' },
    { name: 'User Registration', endpoint: '/auth/register', method: 'POST' },
    { name: 'Get Offers', endpoint: '/business/offers', method: 'GET' },
    { name: 'Accept Offer', endpoint: '/rider/offers/123/accept', method: 'POST' }
  ];
  
  for (const test of tests) {
    try {
      // Test v1
      const v1Response = await testEndpoint(`/api/v1${test.endpoint}`, test.method);
      console.log(`✓ v1 ${test.name}: ${v1Response.status}`);
      
      // Test v2
      const v2Response = await testEndpoint(`/api/v2${test.endpoint}`, test.method);
      console.log(`✓ v2 ${test.name}: ${v2Response.status}`);
      
    } catch (error) {
      console.error(`✗ ${test.name}: ${error.message}`);
    }
  }
};
```

## Migration Checklist

### Pre-Migration
- [ ] Review all breaking changes
- [ ] Identify affected code areas
- [ ] Plan migration timeline
- [ ] Set up testing environment
- [ ] Backup current implementation

### During Migration
- [ ] Update authentication handling
- [ ] Implement token refresh logic
- [ ] Update error handling
- [ ] Modify password validation
- [ ] Update API client configuration
- [ ] Test each component individually

### Post-Migration
- [ ] Run comprehensive tests
- [ ] Verify all user flows work
- [ ] Monitor error rates
- [ ] Update documentation
- [ ] Train team on new features
- [ ] Plan rollback strategy

## Common Migration Issues

### Issue 1: Token Expiration
**Problem**: v2.0 tokens expire after 1 hour instead of 24 hours  
**Solution**: Implement automatic token refresh

```javascript
const apiClient = {
  async request(url, options) {
    let response = await fetch(url, options);
    
    if (response.status === 401) {
      // Try to refresh token
      await this.refreshToken();
      response = await fetch(url, options);
    }
    
    return response;
  }
};
```

### Issue 2: Password Requirements
**Problem**: Existing passwords don't meet v2.0 requirements  
**Solution**: Implement graceful password upgrade

```javascript
// Force password update on next login for v2.0
if (apiVersion === 'v2' && !user.passwordMeetsV2Requirements) {
  return {
    success: false,
    error: {
      code: 'PASSWORD_UPGRADE_REQUIRED',
      message: 'Please update your password to meet new security requirements'
    }
  };
}
```

### Issue 3: Account Lockout
**Problem**: Users getting locked out due to failed attempts  
**Solution**: Implement proper lockout handling

```javascript
const handleLoginError = (error) => {
  if (error.code === 'ACCOUNT_LOCKED') {
    const unlockTime = new Date(error.unlockTime);
    const minutes = Math.ceil((unlockTime - Date.now()) / 60000);
    
    showMessage(`Account locked. Try again in ${minutes} minutes.`);
  }
};
```

## Support and Resources

### Getting Help
- **Documentation**: `/api/docs`
- **Version Info**: `/api/version`
- **Migration Guide**: `/api/migration?from=v1&to=v2`
- **Changelog**: `/api/changelog`

### Migration Tools
- **Version Compatibility Checker**: Test your requests against multiple versions
- **Migration Validator**: Automated testing of migration completeness
- **Rollback Scripts**: Quick rollback to previous version if needed

### Contact
For migration support, contact the development team or create an issue in the project repository.

---

**Last Updated**: January 2024  
**Document Version**: 1.0.0