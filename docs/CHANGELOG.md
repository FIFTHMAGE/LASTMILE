# API Changelog

All notable changes to the Last Mile Delivery Platform API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- API versioning system with backward compatibility
- Enhanced security features for v2 authentication
- Comprehensive API documentation and testing guides

## [2.0.0] - 2024-02-01 (Future Release)

### Added
- Enhanced authentication with account lockout protection
- Separate access and refresh tokens for improved security
- Enhanced password requirements with complexity validation
- Device fingerprinting support in authentication
- Improved error responses with request IDs
- Enhanced user metadata in responses
- Numeric token expiration times (seconds instead of strings)

### Changed
- **BREAKING**: Authentication response format restructured
  - `data.token` moved to `data.authentication.accessToken`
  - `data.expiresIn` changed from string to numeric seconds
  - Added `data.authentication.refreshToken` for token refresh
  - Enhanced user object with security metadata
- **BREAKING**: Password requirements strengthened
  - Must contain uppercase, lowercase, number, and special character
  - Minimum length increased to 8 characters with complexity rules
- **BREAKING**: Token refresh endpoint requires refresh token instead of access token
- **BREAKING**: JWT tokens include additional security claims
- Enhanced error responses include request IDs and more context

### Security
- Account lockout after 5 failed login attempts (30-minute lockout)
- Enhanced password hashing with increased salt rounds (14 vs 12)
- Separate refresh token secret for improved security
- JWT tokens include issuer and audience claims
- Enhanced token validation with security level checks

### Migration Guide
- Update authentication response parsing to use new structure
- Implement refresh token storage and rotation
- Update password validation to meet new requirements
- Handle account lockout scenarios in client applications
- Update error handling for enhanced error format

## [1.1.0] - 2024-01-15 (Future Release)

### Added
- Enhanced offer filtering with additional parameters
- Improved pagination with metadata
- Extended notification types
- Performance optimizations for geospatial queries

### Changed
- Pagination response includes additional metadata
- Enhanced offer search with relevance scoring
- Improved notification delivery reliability

### Deprecated
- None

### Security
- Enhanced rate limiting for location updates
- Improved input validation for geospatial data

## [1.0.0] - 2024-01-01

### Added
- Initial API release
- User authentication and registration
- Role-based access control (business, rider, admin)
- Offer management system
- Real-time location tracking
- Payment processing
- Notification system
- Dashboard APIs for businesses and riders
- Admin management interface
- Comprehensive error handling
- Rate limiting and security middleware
- Caching system with Redis
- API documentation and testing

### Authentication
- JWT-based authentication
- Role-specific registration flows
- Email verification system
- Password reset functionality

### Business Features
- Offer creation and management
- Dashboard with analytics
- Payment and earnings tracking
- Notification management

### Rider Features
- Nearby offer discovery with geospatial search
- Offer acceptance and delivery tracking
- Real-time location updates
- Earnings and performance metrics
- Availability management

### Admin Features
- Platform statistics and monitoring
- User management
- System health checks

### Technical Features
- MongoDB with geospatial indexing
- Redis caching for performance
- Comprehensive test suite
- API rate limiting
- Request/response validation
- Error handling and logging

## Version Support Policy

### Current Support Status
- **v1.0.x**: ✅ Fully supported (Current stable)
- **v1.1.x**: 🚧 In development
- **v2.0.x**: 📋 Planned

### Support Timeline
- **Active Support**: 18 months from release
- **Security Updates**: 12 months after active support ends
- **End of Life**: 30 months from release

### Deprecation Policy
- Breaking changes require major version increment
- Deprecated features are marked 6 months before removal
- Migration guides provided for all breaking changes
- Backward compatibility maintained within major versions

## Breaking Changes Summary

### v1.0.0 → v2.0.0

#### Authentication Changes
```javascript
// v1.0.0 Response
{
  "data": {
    "user": { /* user data */ },
    "token": "jwt_token",
    "accessToken": "jwt_token", // Legacy field
    "tokenType": "Bearer",
    "expiresIn": "24h" // String format
  }
}

// v2.0.0 Response
{
  "data": {
    "user": { 
      /* enhanced user data */,
      "securityLevel": "standard",
      "metadata": { /* additional metadata */ }
    },
    "authentication": {
      "accessToken": "jwt_token",
      "refreshToken": "refresh_token",
      "tokenType": "Bearer",
      "expiresIn": 3600, // Numeric seconds
      "refreshExpiresIn": 604800,
      "scope": ["read", "write"],
      "issuedAt": 1640995200,
      "issuer": "last-mile-delivery-api"
    }
  }
}
```

#### Password Requirements
```javascript
// v1.0.0 - Basic requirements
{
  "password": "password123" // ✅ Valid
}

// v2.0.0 - Enhanced requirements
{
  "password": "StrongPass123!" // ✅ Valid (uppercase, lowercase, number, special char)
}
```

#### Token Refresh
```javascript
// v1.0.0 - Refresh with access token
POST /api/v1/auth/refresh
{
  "token": "access_token"
}

// v2.0.0 - Refresh with refresh token
POST /api/v2/auth/refresh
{
  "refreshToken": "refresh_token"
}
```

## Migration Examples

### Updating Authentication Flow

#### v1 to v2 Registration
```javascript
// Before (v1)
const registerUser = async (userData) => {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.data.token);
  return data.data.user;
};

// After (v2)
const registerUser = async (userData) => {
  const response = await fetch('/api/v2/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.data.authentication.accessToken);
  localStorage.setItem('refreshToken', data.data.authentication.refreshToken);
  return data.data.user;
};
```

#### v1 to v2 Token Refresh
```javascript
// Before (v1)
const refreshToken = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.data.token);
  return data.data.token;
};

// After (v2)
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('/api/v2/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  localStorage.setItem('accessToken', data.data.authentication.accessToken);
  localStorage.setItem('refreshToken', data.data.authentication.refreshToken);
  return data.data.authentication.accessToken;
};
```

## Compatibility Matrix

| Feature | v1.0 | v1.1 | v2.0 |
|---------|------|------|------|
| Basic Authentication | ✅ | ✅ | ✅ |
| Legacy Profile Fields | ✅ | ✅ | ❌ |
| String Token Expiry | ✅ | ✅ | ❌ |
| Enhanced Security | ❌ | ❌ | ✅ |
| Refresh Tokens | ❌ | ❌ | ✅ |
| Account Lockout | ❌ | ❌ | ✅ |
| Enhanced Errors | ❌ | ❌ | ✅ |

## Testing Compatibility

### Automated Compatibility Tests
```bash
# Run compatibility tests
npm run test:compatibility

# Test specific version migration
npm run test:migration -- --from=v1 --to=v2

# Validate backward compatibility
npm run test:backward-compatibility
```

### Manual Testing Checklist

#### v1 → v2 Migration
- [ ] Update authentication response parsing
- [ ] Implement refresh token handling
- [ ] Update password validation
- [ ] Handle account lockout scenarios
- [ ] Test error response changes
- [ ] Validate token expiration handling
- [ ] Update API client libraries

## Support and Resources

### Documentation
- [API Documentation](./API.md)
- [Testing Guide](./TESTING.md)
- [Migration Guide](./MIGRATION.md)

### Tools
- [Postman Collection](./postman-collection.json)
- [OpenAPI Schema](./api-schema.json)

### Support Channels
- GitHub Issues for bug reports
- Documentation updates via pull requests
- Community Discord for questions

---

**Note**: This changelog follows semantic versioning. All dates are in YYYY-MM-DD format.
For the most up-to-date information, check the API version endpoint: `GET /api/version`