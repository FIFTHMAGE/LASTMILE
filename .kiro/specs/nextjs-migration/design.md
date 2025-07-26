# Design Document

## Overview

This document outlines the comprehensive design for migrating the LastMile Delivery Platform from a separate Node.js/Express backend and React frontend architecture to a unified Next.js 14 TypeScript full-stack application. The migration will preserve all existing functionality while modernizing the technology stack and improving developer experience.

## Architecture

### Current Architecture
- **Backend**: Node.js/Express server running on port 5000
- **Frontend**: React application with proxy to backend
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with bcrypt password hashing
- **File Structure**: Separate frontend/ and backend directories
- **Deployment**: Two separate services requiring coordination

### Target Architecture
- **Full-Stack Framework**: Next.js 14 with App Router
- **Language**: TypeScript throughout entire codebase
- **Runtime**: Single Node.js process on port 3000
- **API Layer**: Next.js API routes replacing Express endpoints
- **Database**: Same MongoDB with TypeScript-enhanced Mongoose models
- **Authentication**: JWT-based auth with Next.js middleware
- **File Structure**: Unified src/ directory with clear separation of concerns
- **Deployment**: Single service deployment

### Migration Strategy
1. **Incremental Migration**: Convert components and routes systematically
2. **Type-First Approach**: Define TypeScript interfaces before implementation
3. **API Compatibility**: Maintain existing API contract during transition
4. **Testing Continuity**: Migrate and enhance existing test suite
5. **Performance Optimization**: Leverage Next.js built-in optimizations

## Components and Interfaces

### Core Type Definitions

#### User Types (`src/lib/types/user.ts`)
```typescript
interface BaseUser {
  _id: string;
  name: string;
  email: string;
  role: 'business' | 'rider' | 'admin';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface BusinessProfile {
  businessName: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: [number, number]; // [lng, lat]
  };
  businessPhone: string;
}

interface RiderProfile {
  phone: string;
  vehicleType: 'bike' | 'scooter' | 'car' | 'van';
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  isAvailable: boolean;
  rating: number;
  completedDeliveries: number;
}

interface BusinessUser extends BaseUser {
  role: 'business';
  profile: BusinessProfile;
}

interface RiderUser extends BaseUser {
  role: 'rider';
  profile: RiderProfile;
}

interface AdminUser extends BaseUser {
  role: 'admin';
  profile: {};
}

type User = BusinessUser | RiderUser | AdminUser;
```

#### Offer Types (`src/lib/types/offer.ts`)
```typescript
interface PackageDetails {
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  fragile: boolean;
  specialInstructions?: string;
}

interface LocationInfo {
  address: string;
  coordinates: [number, number];
  contactName: string;
  contactPhone: string;
  instructions?: string;
}

interface PickupInfo extends LocationInfo {
  availableFrom?: Date;
  availableUntil?: Date;
}

interface DeliveryInfo extends LocationInfo {
  deliverBy?: Date;
}

interface PaymentInfo {
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'card' | 'digital';
}

type OfferStatus = 'open' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';

interface StatusHistoryEntry {
  status: OfferStatus;
  timestamp: Date;
  updatedBy: string;
  notes?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface Offer {
  _id: string;
  business: string;
  title: string;
  description?: string;
  packageDetails: PackageDetails;
  pickup: PickupInfo;
  delivery: DeliveryInfo;
  payment: PaymentInfo;
  status: OfferStatus;
  statusHistory: StatusHistoryEntry[];
  acceptedBy?: string;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  inTransitAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  estimatedDistance?: number;
  estimatedDuration?: number;
  actualDistance?: number;
  actualDuration?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### API Types (`src/lib/types/api.ts`)
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
  };
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface PaginationResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface AuthRequest extends NextRequest {
  user: {
    id: string;
    role: string;
    isVerified: boolean;
  };
}
```

### Database Layer

#### Database Connection (`src/lib/services/database.ts`)
```typescript
import mongoose from 'mongoose';

class DatabaseService {
  private static instance: DatabaseService;
  private isConnected: boolean = false;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      await mongoose.connect(mongoUri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    
    await mongoose.disconnect();
    this.isConnected = false;
    console.log('MongoDB disconnected');
  }

  isConnectedToDatabase(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const dbService = DatabaseService.getInstance();
```

#### Model Definitions (`src/lib/models/`)
- Convert existing Mongoose models to TypeScript
- Maintain same schema structure and validation
- Add TypeScript method signatures
- Preserve all existing model methods and statics

### API Layer Architecture

#### API Route Structure
```
src/app/api/
├── auth/
│   ├── login/route.ts
│   ├── register/
│   │   ├── business/route.ts
│   │   └── rider/route.ts
│   ├── verify-email/route.ts
│   ├── resend-verification/route.ts
│   └── refresh-token/route.ts
├── offers/
│   ├── route.ts (GET, POST)
│   ├── [id]/
│   │   ├── route.ts (GET, PATCH, DELETE)
│   │   ├── accept/route.ts
│   │   ├── pickup/route.ts
│   │   ├── in-transit/route.ts
│   │   ├── delivered/route.ts
│   │   ├── complete/route.ts
│   │   └── cancel/route.ts
│   ├── nearby/route.ts
│   ├── my-offers/route.ts
│   └── my-deliveries/route.ts
├── payments/
│   ├── route.ts
│   └── [id]/route.ts
├── notifications/
│   ├── route.ts
│   └── [id]/route.ts
└── user/
    ├── profile/route.ts
    └── availability/route.ts
```

#### API Route Implementation Pattern
```typescript
// Example: src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { validateLoginRequest } from '@/lib/utils/validation';
import { generateToken } from '@/lib/utils/jwt';
import { ApiResponse } from '@/lib/types/api';

export async function POST(request: NextRequest) {
  try {
    await dbService.connect();
    
    const body = await request.json();
    const validation = validateLoginRequest(body);
    
    if (!validation.isValid) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    // Login logic here...
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { user, token },
      message: 'Login successful'
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
```

### Authentication System

#### JWT Utilities (`src/lib/utils/jwt.ts`)
```typescript
import jwt from 'jsonwebtoken';
import { User } from '@/lib/types/user';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
}

export function generateToken(user: User): string {
  const payload: TokenPayload = {
    id: user._id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}
```

#### Middleware (`src/middleware.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/utils/jwt';

export function middleware(request: NextRequest) {
  // Authentication middleware
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = verifyToken(token);
        // Add user info to request headers for API routes
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', payload.id);
        requestHeaders.set('x-user-role', payload.role);
        requestHeaders.set('x-user-verified', payload.isVerified.toString());
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
    }
  }

  // Route protection for dashboard pages
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check authentication and redirect if needed
    // This will be handled by the auth context on the client side
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
};
```

### Frontend Architecture

#### App Router Structure
```
src/app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── verify-email/page.tsx
│   └── layout.tsx
├── dashboard/
│   ├── business/
│   │   ├── page.tsx
│   │   ├── offers/
│   │   │   ├── page.tsx
│   │   │   ├── create/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── layout.tsx
│   ├── rider/
│   │   ├── page.tsx
│   │   ├── offers/page.tsx
│   │   ├── deliveries/page.tsx
│   │   ├── earnings/page.tsx
│   │   └── layout.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── layout.tsx
├── layout.tsx
├── page.tsx
├── not-found.tsx
└── error.tsx
```

#### Component Architecture
```
src/components/
├── ui/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Select.tsx
│   ├── Badge.tsx
│   └── LoadingSpinner.tsx
├── layout/
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── DashboardLayout.tsx
├── forms/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── OfferForm.tsx
└── features/
    ├── offers/
    ├── auth/
    └── dashboard/
```

#### State Management
- **Authentication Context**: Manage user state and authentication
- **React Query**: Server state management for API calls
- **Local State**: Component-level state with useState/useReducer
- **Form State**: React Hook Form for form management

### Email System

#### Email Service (`src/lib/services/email.ts`)
```typescript
import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(user: User, token: string): Promise<void> {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;
    
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Verify your email address',
      html: `
        <h1>Welcome to LastMile Delivery Platform</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `,
    });
  }
}

export const emailService = new EmailService();
```

## Data Models

### Model Migration Strategy
1. **Type-First Approach**: Define TypeScript interfaces first
2. **Schema Preservation**: Maintain existing MongoDB schema structure
3. **Method Enhancement**: Add TypeScript method signatures
4. **Validation Consistency**: Keep existing validation rules
5. **Index Maintenance**: Preserve all database indexes

### Enhanced Model Structure
```typescript
// src/lib/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';
import { User as UserType, BusinessUser, RiderUser } from '@/lib/types/user';

interface UserDocument extends UserType, Document {}

const userSchema = new Schema<UserDocument>({
  // Existing schema definition with TypeScript enhancements
});

// Add TypeScript method signatures
userSchema.methods.validateProfile = function(): string[] {
  // Existing validation logic
};

userSchema.methods.getProfileData = function(): UserType {
  // Existing profile data logic
};

export const User = mongoose.model<UserDocument>('User', userSchema);
```

## Error Handling

### Centralized Error Handling
```typescript
// src/lib/utils/error-handler.ts
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString()
      }
    }, { status: error.statusCode });
  }

  // Handle other error types
  return NextResponse.json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  }, { status: 500 });
}
```

### API Error Boundaries
- Consistent error response format across all API routes
- Proper HTTP status codes
- Detailed error logging for debugging
- User-friendly error messages

## Testing Strategy

### Testing Framework Migration
1. **Jest Configuration**: Update for Next.js and TypeScript
2. **API Testing**: Convert Supertest tests to Next.js API route testing
3. **Component Testing**: React Testing Library with TypeScript
4. **Integration Testing**: End-to-end workflow testing
5. **Type Testing**: TypeScript compilation tests

### Test Structure
```
tests/
├── api/
│   ├── auth.test.ts
│   ├── offers.test.ts
│   └── utils/
├── components/
│   ├── ui/
│   └── forms/
├── integration/
│   ├── auth-flow.test.ts
│   └── offer-workflow.test.ts
└── utils/
    ├── test-helpers.ts
    └── mock-data.ts
```

### Testing Utilities
```typescript
// tests/utils/test-helpers.ts
import { NextRequest } from 'next/server';
import { User } from '@/lib/types/user';

export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  user?: User
): NextRequest {
  const request = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'content-type': 'application/json',
      ...(user && {
        'x-user-id': user._id,
        'x-user-role': user.role,
        'x-user-verified': user.isVerified.toString()
      })
    }
  });
  
  return request;
}
```

## Performance Optimization

### Next.js Optimizations
1. **Static Generation**: Pre-generate static pages where possible
2. **Image Optimization**: Use Next.js Image component
3. **Code Splitting**: Automatic code splitting with dynamic imports
4. **Bundle Analysis**: Regular bundle size monitoring
5. **Caching**: Implement appropriate caching strategies

### Database Optimization
1. **Connection Pooling**: Optimize MongoDB connection management
2. **Query Optimization**: Maintain existing indexes and query patterns
3. **Aggregation Pipelines**: Preserve complex aggregation queries
4. **Caching Layer**: Implement Redis caching where beneficial

### API Performance
1. **Response Caching**: Cache frequently accessed data
2. **Pagination**: Implement efficient pagination
3. **Rate Limiting**: Protect against abuse
4. **Compression**: Enable response compression

## Security Considerations

### Authentication Security
1. **JWT Security**: Secure token generation and validation
2. **Password Hashing**: Maintain bcrypt hashing
3. **Session Management**: Secure session handling
4. **CSRF Protection**: Implement CSRF protection
5. **Rate Limiting**: Prevent brute force attacks

### API Security
1. **Input Validation**: Comprehensive request validation
2. **SQL Injection Prevention**: Parameterized queries
3. **XSS Protection**: Sanitize user inputs
4. **CORS Configuration**: Proper CORS setup
5. **Security Headers**: Implement security headers

### Data Protection
1. **Environment Variables**: Secure configuration management
2. **Sensitive Data**: Proper handling of sensitive information
3. **Audit Logging**: Track important actions
4. **Data Encryption**: Encrypt sensitive data at rest

## Deployment Strategy

### Build Process
1. **TypeScript Compilation**: Ensure type safety
2. **Asset Optimization**: Optimize static assets
3. **Environment Configuration**: Manage environment variables
4. **Health Checks**: Implement health check endpoints
5. **Monitoring**: Set up application monitoring

### Production Configuration
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

This design provides a comprehensive roadmap for migrating the LastMile Delivery Platform to Next.js 14 TypeScript while maintaining all existing functionality and improving the overall architecture.