/**
 * Authentication-related TypeScript type definitions
 */

import { UserRole } from './user';

// JWT token payload
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  iat?: number; // issued at
  exp?: number; // expires at
}

// Authentication credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Registration data
export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// Business registration data
export interface BusinessRegistrationData extends RegisterCredentials {
  role: 'business';
  businessName: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: [number, number];
  };
  businessPhone: string;
}

// Rider registration data
export interface RiderRegistrationData extends RegisterCredentials {
  role: 'rider';
  phone: string;
  vehicleType: 'bike' | 'scooter' | 'car' | 'van';
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

// Admin registration data
export interface AdminRegistrationData extends RegisterCredentials {
  role: 'admin';
}

// Authentication response
export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
  message?: string;
  error?: string;
}

// Login response with additional data
export interface LoginResponse extends AuthResponse {
  dashboard?: {
    defaultRoute: string;
    availableRoutes: string[];
    permissions: Record<string, boolean>;
    quickActions: {
      label: string;
      route: string;
      icon: string;
    }[];
  };
  welcome?: {
    message: string;
    nextSteps: string[];
  };
  verification?: {
    verified: boolean;
    message?: string;
    action?: string;
    resendLink?: string;
  };
  sessionInfo?: {
    expiresIn: string;
    tokenType: string;
    refreshAvailable: boolean;
  };
}

// Token refresh request
export interface RefreshTokenRequest {
  refreshToken: string;
}

// Token refresh response
export interface RefreshTokenResponse {
  success: boolean;
  token?: string;
  tokenType?: string;
  expiresIn?: string;
  refreshedAt?: string;
  error?: string;
}

// Password reset request
export interface PasswordResetRequest {
  email: string;
}

// Password reset confirmation
export interface PasswordResetConfirmation {
  token: string;
  newPassword: string;
}

// Email verification
export interface EmailVerificationRequest {
  token: string;
}

// Resend verification email
export interface ResendVerificationRequest {
  email: string;
}

// Change password request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Authentication session
export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    name: string;
  };
  token: string;
  expiresAt: Date;
  issuedAt: Date;
}

// Permission definitions
export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

// Role permissions
export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// Authentication middleware context
export interface AuthMiddlewareContext {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
  token?: string;
  permissions?: Permission[];
}

// Route protection configuration
export interface RouteProtection {
  requiresAuth: boolean;
  requiredRole?: UserRole;
  requiredPermissions?: Permission[];
  requiresVerification?: boolean;
  redirectTo?: string;
}

// Authentication error types
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  VERIFICATION_TOKEN_EXPIRED = 'VERIFICATION_TOKEN_EXPIRED',
  VERIFICATION_TOKEN_INVALID = 'VERIFICATION_TOKEN_INVALID'
}

// Authentication error
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: Record<string, any>;
}

// Two-factor authentication (for future use)
export interface TwoFactorAuth {
  enabled: boolean;
  method: 'sms' | 'email' | 'authenticator';
  backupCodes?: string[];
}

// OAuth provider data (for future use)
export interface OAuthProvider {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

// Security settings
export interface SecuritySettings {
  passwordLastChanged: Date;
  lastLogin: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  twoFactorAuth?: TwoFactorAuth;
  trustedDevices: string[];
}

// Audit log entry
export interface AuthAuditLog {
  userId: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Rate limiting for authentication
export interface AuthRateLimit {
  identifier: string; // IP address or user ID
  attempts: number;
  windowStart: Date;
  blockedUntil?: Date;
}

// Type guards
export function isValidJwtPayload(payload: any): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.id === 'string' &&
    typeof payload.email === 'string' &&
    typeof payload.role === 'string' &&
    typeof payload.isVerified === 'boolean'
  );
}

export function isBusinessRegistration(data: any): data is BusinessRegistrationData {
  return (
    data.role === 'business' &&
    typeof data.businessName === 'string' &&
    typeof data.businessAddress === 'object' &&
    typeof data.businessPhone === 'string'
  );
}

export function isRiderRegistration(data: any): data is RiderRegistrationData {
  return (
    data.role === 'rider' &&
    typeof data.phone === 'string' &&
    typeof data.vehicleType === 'string'
  );
}

export function isAdminRegistration(data: any): data is AdminRegistrationData {
  return data.role === 'admin';
}

// Permission helpers
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.some(
    permission =>
      permission.resource === requiredPermission.resource &&
      permission.action === requiredPermission.action
  );
}

export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some(required =>
    hasPermission(userPermissions, required)
  );
}

export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every(required =>
    hasPermission(userPermissions, required)
  );
}