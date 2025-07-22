# Design Document: Email Verification System

## Overview

This document outlines the design for implementing email verification for new business and rider accounts in the last-mile delivery platform. The email verification system will ensure that users provide valid email addresses during registration, which helps prevent fraud and increases the overall security of the platform.

## Architecture

The email verification system will be integrated into the existing authentication flow and will consist of the following components:

1. **User Model Extensions**: Additional fields in the User model to track verification status
2. **Verification Token Model**: A separate model to store and manage verification tokens
3. **Email Service**: Service for sending verification emails
4. **API Endpoints**: New endpoints for verification and token management
5. **Frontend Components**: UI components for the verification process

## Components and Interfaces

### 1. User Model Extensions

The existing User model will be extended with the following fields:

```javascript
{
  // Existing fields
  isVerified: { type: Boolean, default: false },
  // No need to store the token directly in the user model
}
```

### 2. Verification Token Model

A new VerificationToken model will be created to manage tokens:

```javascript
const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // MongoDB TTL index for automatic expiration
  }
});
```

### 3. Email Service

The EmailService will be enhanced to support verification emails:

```javascript
class EmailService {
  // Existing methods
  
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    // Email template and sending logic
  }
}
```

### 4. API Endpoints

New endpoints will be added to the authentication routes:

- `POST /api/auth/verify-email`: Verify email with token
- `POST /api/auth/resend-verification`: Resend verification email

### 5. Frontend Components

- **VerifyEmailPage**: Page to handle the verification process
- **ResendVerificationPage**: Page to request a new verification email
- **VerificationBanner**: Component to display verification status and prompts

## Data Models

### User Model (Extended)

```javascript
const userSchema = new mongoose.Schema({
  // Existing fields
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['business', 'rider', 'admin'], required: true },
  profile: {
    // Business profile fields
    businessName: String,
    businessAddress: String,
    businessType: String,
    // Rider profile fields
    phone: String,
    vehicleType: String,
    licenseNumber: String,
    // Common fields
    profilePicture: String,
    bio: String
  },
  // New field
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Verification Token Model

```javascript
const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // MongoDB TTL index for automatic expiration
  }
});
```

## Error Handling

1. **Token Validation Errors**:
   - Invalid token: Return 400 Bad Request with appropriate message
   - Expired token: Return 400 Bad Request with expiration message

2. **Email Sending Errors**:
   - Email service failure: Log error, return 500 Internal Server Error
   - Invalid email address: Return 400 Bad Request

3. **User Not Found Errors**:
   - When verifying: Return 404 Not Found with generic message (for security)
   - When resending: Return 404 Not Found with generic message (for security)

## Testing Strategy

1. **Unit Tests**:
   - Test token generation and validation
   - Test email service functions
   - Test model validations

2. **Integration Tests**:
   - Test the verification workflow end-to-end
   - Test token expiration handling
   - Test resend verification functionality

3. **Frontend Tests**:
   - Test verification page rendering and state handling
   - Test error message display
   - Test verification banner behavior

## Security Considerations

1. **Token Security**:
   - Use cryptographically secure random token generation
   - Store tokens securely (hashed if necessary)
   - Set appropriate expiration times

2. **Rate Limiting**:
   - Implement rate limiting for verification attempts
   - Implement rate limiting for resend verification requests

3. **Privacy**:
   - Do not expose user information in verification URLs
   - Use generic error messages that don't reveal user existence