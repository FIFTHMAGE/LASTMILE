/**
 * User-related TypeScript type definitions
 */

export type UserRole = 'business' | 'rider' | 'admin';
export type VehicleType = 'bike' | 'scooter' | 'car' | 'van';

export interface BaseUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: [number, number]; // [lng, lat]
}

export interface BusinessProfile {
  businessName: string;
  businessAddress: BusinessAddress;
  businessPhone: string;
}

export interface LocationPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface RiderProfile {
  phone: string;
  vehicleType: VehicleType;
  currentLocation?: LocationPoint;
  isAvailable: boolean;
  rating: number;
  completedDeliveries: number;
}

export interface AdminProfile {
  permissions?: string[];
}

export interface BusinessUser extends BaseUser {
  role: 'business';
  profile: BusinessProfile;
}

export interface RiderUser extends BaseUser {
  role: 'rider';
  profile: RiderProfile;
}

export interface AdminUser extends BaseUser {
  role: 'admin';
  profile: AdminProfile;
}

export type User = BusinessUser | RiderUser | AdminUser;

// User creation types (without _id and timestamps)
export interface CreateUserBase {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface CreateBusinessUser extends CreateUserBase {
  role: 'business';
  profile: BusinessProfile;
}

export interface CreateRiderUser extends CreateUserBase {
  role: 'rider';
  profile: Omit<RiderProfile, 'rating' | 'completedDeliveries' | 'isAvailable'> & {
    isAvailable?: boolean;
    rating?: number;
    completedDeliveries?: number;
  };
}

export interface CreateAdminUser extends CreateUserBase {
  role: 'admin';
  profile?: AdminProfile;
}

export type CreateUser = CreateBusinessUser | CreateRiderUser | CreateAdminUser;

// User update types
export interface UpdateUserProfile {
  name?: string;
  email?: string;
  profile?: Partial<BusinessProfile | RiderProfile | AdminProfile>;
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  businessName?: string;
  businessAddress?: BusinessAddress;
  businessPhone?: string;
  phone?: string;
  vehicleType?: VehicleType;
  currentLocation?: LocationPoint;
  isAvailable?: boolean;
  rating?: number;
  completedDeliveries?: number;
  permissions?: string[];
}

// Type guards
export function isBusinessUser(user: User): user is BusinessUser {
  return user.role === 'business';
}

export function isRiderUser(user: User): user is RiderUser {
  return user.role === 'rider';
}

export function isAdminUser(user: User): user is AdminUser {
  return user.role === 'admin';
}

// Validation types
export interface UserValidationError {
  field: string;
  message: string;
}

export interface UserValidationResult {
  isValid: boolean;
  errors: UserValidationError[];
}