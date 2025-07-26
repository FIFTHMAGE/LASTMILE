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