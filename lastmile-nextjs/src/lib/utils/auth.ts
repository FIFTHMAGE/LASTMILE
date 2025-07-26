/**
 * Authentication utilities and helpers
 */
import { UserRole } from '@/lib/types';

/**
 * Check if a role has permission to access a resource
 */
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if a role is admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

/**
 * Check if a role is business
 */
export function isBusiness(role: UserRole): boolean {
  return role === 'business';
}

/**
 * Check if a role is rider
 */
export function isRider(role: UserRole): boolean {
  return role === 'rider';
}

/**
 * Get dashboard path for a role
 */
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'business':
      return '/dashboard/business';
    case 'rider':
      return '/dashboard/rider';
    default:
      return '/dashboard';
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'business':
      return 'Business';
    case 'rider':
      return 'Rider';
    default:
      return 'User';
  }
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'red';
    case 'business':
      return 'blue';
    case 'rider':
      return 'green';
    default:
      return 'gray';
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
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
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Generate a secure random password
 */
export function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

/**
 * Format user display name
 */
export function formatUserDisplayName(user: {
  profile?: {
    firstName?: string;
    lastName?: string;
    businessName?: string;
  };
  email: string;
}): string {
  if (user.profile?.businessName) {
    return user.profile.businessName;
  }
  
  if (user.profile?.firstName && user.profile?.lastName) {
    return `${user.profile.firstName} ${user.profile.lastName}`;
  }
  
  if (user.profile?.firstName) {
    return user.profile.firstName;
  }
  
  return user.email.split('@')[0];
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(user: {
  profile?: {
    firstName?: string;
    lastName?: string;
    businessName?: string;
  };
  email: string;
}): string {
  if (user.profile?.businessName) {
    return user.profile.businessName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  if (user.profile?.firstName && user.profile?.lastName) {
    return `${user.profile.firstName.charAt(0)}${user.profile.lastName.charAt(0)}`.toUpperCase();
  }
  
  if (user.profile?.firstName) {
    return user.profile.firstName.charAt(0).toUpperCase();
  }
  
  return user.email.charAt(0).toUpperCase();
}

/**
 * Check if user profile is complete
 */
export function isProfileComplete(user: {
  role: UserRole;
  profile?: any;
}): boolean {
  if (!user.profile) return false;

  switch (user.role) {
    case 'business':
      return !!(
        user.profile.businessName &&
        user.profile.contactPerson &&
        user.profile.phone &&
        user.profile.address
      );
    
    case 'rider':
      return !!(
        user.profile.firstName &&
        user.profile.lastName &&
        user.profile.phone &&
        user.profile.vehicleType
      );
    
    case 'admin':
      return !!(
        user.profile.firstName &&
        user.profile.lastName
      );
    
    default:
      return false;
  }
}

/**
 * Get required profile fields for a role
 */
export function getRequiredProfileFields(role: UserRole): string[] {
  switch (role) {
    case 'business':
      return ['businessName', 'contactPerson', 'phone', 'address'];
    
    case 'rider':
      return ['firstName', 'lastName', 'phone', 'vehicleType'];
    
    case 'admin':
      return ['firstName', 'lastName'];
    
    default:
      return [];
  }
}

/**
 * Sanitize user data for client-side use
 */
export function sanitizeUserData(user: any): any {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
}