/**
 * Runtime type validation utilities
 */

import { UserRole, VehicleType } from './user';
import { OfferStatus, PaymentMethod, Currency } from './offer';
import { NotificationType, NotificationPriority, NotificationStatus } from './notification';
import { PaymentStatus, TransactionType } from './payment';

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone validation
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

// Password validation
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Coordinate validation
export function isValidCoordinates(coordinates: any): coordinates is [number, number] {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number' &&
    coordinates[0] >= -180 && coordinates[0] <= 180 && // longitude
    coordinates[1] >= -90 && coordinates[1] <= 90      // latitude
  );
}

// MongoDB ObjectId validation
export function isValidObjectId(id: string): boolean {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
}

// User role validation
export function isValidUserRole(role: string): role is UserRole {
  return ['business', 'rider', 'admin'].includes(role);
}

// Vehicle type validation
export function isValidVehicleType(type: string): type is VehicleType {
  return ['bike', 'scooter', 'car', 'van'].includes(type);
}

// Offer status validation
export function isValidOfferStatus(status: string): status is OfferStatus {
  return ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'].includes(status);
}

// Payment method validation
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ['cash', 'card', 'digital'].includes(method);
}

// Currency validation
export function isValidCurrency(currency: string): currency is Currency {
  return ['USD', 'EUR', 'GBP'].includes(currency);
}

// Notification type validation
export function isValidNotificationType(type: string): type is NotificationType {
  return [
    'offer_created',
    'offer_accepted',
    'offer_picked_up',
    'offer_in_transit',
    'offer_delivered',
    'offer_completed',
    'offer_cancelled',
    'payment_received',
    'payment_failed',
    'email_verification',
    'system_announcement',
    'rider_nearby',
    'delivery_delayed'
  ].includes(type);
}

// Notification priority validation
export function isValidNotificationPriority(priority: string): priority is NotificationPriority {
  return ['low', 'medium', 'high', 'urgent'].includes(priority);
}

// Notification status validation
export function isValidNotificationStatus(status: string): status is NotificationStatus {
  return ['unread', 'read', 'archived'].includes(status);
}

// Payment status validation
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'].includes(status);
}

// Transaction type validation
export function isValidTransactionType(type: string): type is TransactionType {
  return ['payment', 'refund', 'fee', 'bonus'].includes(type);
}

// Date validation
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

// Positive number validation
export function isPositiveNumber(value: any): value is number {
  return typeof value === 'number' && value > 0 && !isNaN(value);
}

// Non-negative number validation
export function isNonNegativeNumber(value: any): value is number {
  return typeof value === 'number' && value >= 0 && !isNaN(value);
}

// String validation
export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ZIP code validation (US format)
export function isValidZipCode(zipCode: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
}

// Generic validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Validation helper function
export function createValidationResult(errors: string[] = []): ValidationResult {
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Array validation
export function isNonEmptyArray<T>(value: any): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

// Object validation
export function isNonEmptyObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
}

// Range validation
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Length validation
export function isValidLength(str: string, min: number, max: number): boolean {
  return str.length >= min && str.length <= max;
}

// Request validation types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface BusinessRegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  contactName: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface RiderRegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  vehicleType: VehicleType;
  licenseNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

// Request validation functions
export function validateLoginRequest(data: LoginRequest): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.email)) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  if (!isNonEmptyString(data.password)) {
    errors.push('Password is required');
  }

  return createValidationResult(errors);
}

export function validateBusinessRegistrationRequest(data: BusinessRegistrationRequest): ValidationResult {
  const errors: string[] = [];

  // Email validation
  if (!isNonEmptyString(data.email)) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  // Password validation
  if (!isNonEmptyString(data.password)) {
    errors.push('Password is required');
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }

  // Confirm password validation
  if (!isNonEmptyString(data.confirmPassword)) {
    errors.push('Please confirm your password');
  } else if (data.password !== data.confirmPassword) {
    errors.push('Passwords do not match');
  }

  // Business name validation
  if (!isNonEmptyString(data.businessName)) {
    errors.push('Business name is required');
  }

  // Contact name validation
  if (!isNonEmptyString(data.contactName)) {
    errors.push('Contact name is required');
  }

  // Phone validation
  if (!isNonEmptyString(data.phone)) {
    errors.push('Phone number is required');
  } else if (!isValidPhone(data.phone)) {
    errors.push('Please enter a valid phone number');
  }

  // Address validation
  if (!data.address) {
    errors.push('Address is required');
  } else {
    if (!isNonEmptyString(data.address.street)) {
      errors.push('Street address is required');
    }
    if (!isNonEmptyString(data.address.city)) {
      errors.push('City is required');
    }
    if (!isNonEmptyString(data.address.state)) {
      errors.push('State is required');
    }
    if (!isNonEmptyString(data.address.zipCode)) {
      errors.push('ZIP code is required');
    } else if (!isValidZipCode(data.address.zipCode)) {
      errors.push('Please enter a valid ZIP code');
    }
    if (!isNonEmptyString(data.address.country)) {
      errors.push('Country is required');
    }
  }

  return createValidationResult(errors);
}

export function validateRiderRegistrationRequest(data: RiderRegistrationRequest): ValidationResult {
  const errors: string[] = [];

  // Email validation
  if (!isNonEmptyString(data.email)) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  // Password validation
  if (!isNonEmptyString(data.password)) {
    errors.push('Password is required');
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }

  // Confirm password validation
  if (!isNonEmptyString(data.confirmPassword)) {
    errors.push('Please confirm your password');
  } else if (data.password !== data.confirmPassword) {
    errors.push('Passwords do not match');
  }

  // Name validation
  if (!isNonEmptyString(data.firstName)) {
    errors.push('First name is required');
  }
  if (!isNonEmptyString(data.lastName)) {
    errors.push('Last name is required');
  }

  // Phone validation
  if (!isNonEmptyString(data.phone)) {
    errors.push('Phone number is required');
  } else if (!isValidPhone(data.phone)) {
    errors.push('Please enter a valid phone number');
  }

  // Vehicle type validation
  if (!data.vehicleType) {
    errors.push('Vehicle type is required');
  } else if (!isValidVehicleType(data.vehicleType)) {
    errors.push('Please select a valid vehicle type');
  }

  // License number validation
  if (!isNonEmptyString(data.licenseNumber)) {
    errors.push('License number is required');
  }

  // Address validation
  if (!data.address) {
    errors.push('Address is required');
  } else {
    if (!isNonEmptyString(data.address.street)) {
      errors.push('Street address is required');
    }
    if (!isNonEmptyString(data.address.city)) {
      errors.push('City is required');
    }
    if (!isNonEmptyString(data.address.state)) {
      errors.push('State is required');
    }
    if (!isNonEmptyString(data.address.zipCode)) {
      errors.push('ZIP code is required');
    } else if (!isValidZipCode(data.address.zipCode)) {
      errors.push('Please enter a valid ZIP code');
    }
    if (!isNonEmptyString(data.address.country)) {
      errors.push('Country is required');
    }
  }

  return createValidationResult(errors);
}

// Additional validation functions for API requests

export function validateForgotPasswordRequest(data: { email: string }): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.email)) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  return createValidationResult(errors);
}

export function validateResetPasswordRequest(data: { token: string; password: string; confirmPassword: string }): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.token)) {
    errors.push('Reset token is required');
  }

  if (!isNonEmptyString(data.password)) {
    errors.push('Password is required');
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (!isNonEmptyString(data.confirmPassword)) {
    errors.push('Please confirm your password');
  } else if (data.password !== data.confirmPassword) {
    errors.push('Passwords do not match');
  }

  return createValidationResult(errors);
}

export function validateEmailVerificationRequest(data: { token: string }): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.token)) {
    errors.push('Verification token is required');
  }

  return createValidationResult(errors);
}

export function validateResendVerificationRequest(data: { email: string }): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.email)) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  return createValidationResult(errors);
}

export function validateRefreshTokenRequest(data: { refreshToken: string }): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.refreshToken)) {
    errors.push('Refresh token is required');
  }

  return createValidationResult(errors);
}

export function validateCreateOfferRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.title)) {
    errors.push('Offer title is required');
  }

  if (!isNonEmptyString(data.description)) {
    errors.push('Offer description is required');
  }

  if (!isPositiveNumber(data.price)) {
    errors.push('Valid price is required');
  }

  if (!data.pickup || !isValidCoordinates(data.pickup.coordinates)) {
    errors.push('Valid pickup location is required');
  }

  if (!data.delivery || !isValidCoordinates(data.delivery.coordinates)) {
    errors.push('Valid delivery location is required');
  }

  return createValidationResult(errors);
}

export function validateUpdateOfferRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.title !== undefined && !isNonEmptyString(data.title)) {
    errors.push('Offer title cannot be empty');
  }

  if (data.description !== undefined && !isNonEmptyString(data.description)) {
    errors.push('Offer description cannot be empty');
  }

  if (data.price !== undefined && !isPositiveNumber(data.price)) {
    errors.push('Valid price is required');
  }

  return createValidationResult(errors);
}

export function validateOfferFilters(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.status && !isValidOfferStatus(data.status)) {
    errors.push('Invalid offer status');
  }

  if (data.minPrice !== undefined && !isNonNegativeNumber(data.minPrice)) {
    errors.push('Minimum price must be a non-negative number');
  }

  if (data.maxPrice !== undefined && !isPositiveNumber(data.maxPrice)) {
    errors.push('Maximum price must be a positive number');
  }

  return createValidationResult(errors);
}

export function validateOfferCompletionRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.completionNotes && !isNonEmptyString(data.completionNotes)) {
    errors.push('Completion notes cannot be empty if provided');
  }

  return createValidationResult(errors);
}

export function validatePickupConfirmationRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.pickupNotes && !isNonEmptyString(data.pickupNotes)) {
    errors.push('Pickup notes cannot be empty if provided');
  }

  return createValidationResult(errors);
}

export function validateDeliveryConfirmationRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.deliveryNotes && !isNonEmptyString(data.deliveryNotes)) {
    errors.push('Delivery notes cannot be empty if provided');
  }

  return createValidationResult(errors);
}

export function validateInTransitRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.transitNotes && !isNonEmptyString(data.transitNotes)) {
    errors.push('Transit notes cannot be empty if provided');
  }

  return createValidationResult(errors);
}

export function validateCreatePaymentRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.offerId)) {
    errors.push('Offer ID is required');
  }

  if (!isPositiveNumber(data.amount)) {
    errors.push('Valid payment amount is required');
  }

  if (!isValidPaymentMethod(data.method)) {
    errors.push('Valid payment method is required');
  }

  return createValidationResult(errors);
}

export function validateUpdatePaymentRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.status && !isValidPaymentStatus(data.status)) {
    errors.push('Invalid payment status');
  }

  if (data.amount !== undefined && !isPositiveNumber(data.amount)) {
    errors.push('Valid payment amount is required');
  }

  return createValidationResult(errors);
}

export function validatePaymentFilters(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.status && !isValidPaymentStatus(data.status)) {
    errors.push('Invalid payment status');
  }

  if (data.method && !isValidPaymentMethod(data.method)) {
    errors.push('Invalid payment method');
  }

  return createValidationResult(errors);
}

export function validateUpdateProfileRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Please enter a valid phone number');
  }

  return createValidationResult(errors);
}

export function validateLocationUpdateRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.location || !isValidCoordinates(data.location.coordinates)) {
    errors.push('Valid location coordinates are required');
  }

  return createValidationResult(errors);
}

export function validateAvailabilityUpdateRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (data.isAvailable !== undefined && typeof data.isAvailable !== 'boolean') {
    errors.push('Availability status must be a boolean');
  }

  return createValidationResult(errors);
}