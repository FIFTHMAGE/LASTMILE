/**
 * Type testing utilities for development and testing
 */

import { 
  User, 
  BusinessUser, 
  RiderUser, 
  Offer, 
  CreateOffer,
  Notification,
  Payment,
  ApiResponse,
  JwtPayload
} from './index';

// Type assertion helpers for testing
export function assertType<T>(value: T): T {
  return value;
}

export function expectType<T>(): <U extends T>(value: U) => U {
  return <U extends T>(value: U) => value;
}

// Mock data factories for testing
export const mockBusinessUser: BusinessUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'John Doe',
  email: 'john@business.com',
  role: 'business',
  isVerified: true,
  profile: {
    businessName: 'Acme Corp',
    businessAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      coordinates: [-74.006, 40.7128]
    },
    businessPhone: '+1-555-0123'
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

export const mockRiderUser: RiderUser = {
  _id: '507f1f77bcf86cd799439012',
  name: 'Jane Smith',
  email: 'jane@rider.com',
  role: 'rider',
  isVerified: true,
  profile: {
    phone: '+1-555-0456',
    vehicleType: 'bike',
    currentLocation: {
      type: 'Point',
      coordinates: [-74.006, 40.7128]
    },
    isAvailable: true,
    rating: 4.8,
    completedDeliveries: 150
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

export const mockOffer: Offer = {
  _id: '507f1f77bcf86cd799439013',
  business: '507f1f77bcf86cd799439011',
  title: 'Document Delivery',
  description: 'Urgent document delivery needed',
  packageDetails: {
    weight: 0.5,
    dimensions: {
      length: 30,
      width: 20,
      height: 2
    },
    fragile: false,
    specialInstructions: 'Handle with care'
  },
  pickup: {
    address: '123 Main St, New York, NY 10001',
    coordinates: [-74.006, 40.7128],
    contactName: 'John Doe',
    contactPhone: '+1-555-0123',
    availableFrom: new Date('2024-01-01T09:00:00Z'),
    availableUntil: new Date('2024-01-01T17:00:00Z'),
    instructions: 'Ring doorbell'
  },
  delivery: {
    address: '456 Oak Ave, Brooklyn, NY 11201',
    coordinates: [-73.9857, 40.6892],
    contactName: 'Alice Johnson',
    contactPhone: '+1-555-0789',
    deliverBy: new Date('2024-01-01T15:00:00Z'),
    instructions: 'Leave at front desk'
  },
  payment: {
    amount: 25.50,
    currency: 'USD',
    paymentMethod: 'digital'
  },
  status: 'open',
  statusHistory: [
    {
      status: 'open',
      timestamp: new Date('2024-01-01T08:00:00Z'),
      updatedBy: '507f1f77bcf86cd799439011',
      notes: 'Offer created'
    }
  ],
  estimatedDistance: 5000,
  estimatedDuration: 30,
  createdAt: new Date('2024-01-01T08:00:00Z'),
  updatedAt: new Date('2024-01-01T08:00:00Z')
};

export const mockNotification: Notification = {
  _id: '507f1f77bcf86cd799439014',
  user: '507f1f77bcf86cd799439012',
  offer: '507f1f77bcf86cd799439013',
  type: 'offer_created',
  title: 'New Offer Available',
  message: 'A new delivery offer is available in your area',
  priority: 'medium',
  status: 'unread',
  data: {
    offerId: '507f1f77bcf86cd799439013',
    distance: 5000
  },
  createdAt: new Date('2024-01-01T08:00:00Z'),
  updatedAt: new Date('2024-01-01T08:00:00Z')
};

export const mockPayment: Payment = {
  _id: '507f1f77bcf86cd799439015',
  offer: '507f1f77bcf86cd799439013',
  business: '507f1f77bcf86cd799439011',
  rider: '507f1f77bcf86cd799439012',
  amount: 25.50,
  currency: 'USD',
  method: 'digital',
  status: 'completed',
  transactionType: 'payment',
  platformFee: 2.55,
  processingFee: 0.75,
  netAmount: 22.20,
  processedAt: new Date('2024-01-01T10:00:00Z'),
  completedAt: new Date('2024-01-01T10:01:00Z'),
  description: 'Payment for document delivery',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:01:00Z')
};

export const mockJwtPayload: JwtPayload = {
  id: '507f1f77bcf86cd799439012',
  email: 'jane@rider.com',
  role: 'rider',
  isVerified: true,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
};

export const mockApiResponse: ApiResponse<User> = {
  success: true,
  data: mockRiderUser,
  message: 'User retrieved successfully',
  timestamp: new Date().toISOString()
};

// Factory functions for creating test data
export function createMockUser(overrides: Partial<User> = {}): User {
  return { ...mockRiderUser, ...overrides };
}

export function createMockOffer(overrides: Partial<Offer> = {}): Offer {
  return { ...mockOffer, ...overrides };
}

export function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return { ...mockNotification, ...overrides };
}

export function createMockPayment(overrides: Partial<Payment> = {}): Payment {
  return { ...mockPayment, ...overrides };
}

// Type compilation tests
export function runTypeTests(): void {
  // Test user type guards
  const user: User = mockBusinessUser;
  
  if (user.role === 'business') {
    // TypeScript should narrow the type here
    const businessName = user.profile.businessName;
    console.log('Business name:', businessName);
  }
  
  // Test offer status transitions
  const offer: Offer = mockOffer;
  const validStatuses: Array<typeof offer.status> = [
    'open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'
  ];
  
  // Test API response types
  const response: ApiResponse<User[]> = {
    success: true,
    data: [mockBusinessUser, mockRiderUser]
  };
  
  // Test type assertions
  assertType<BusinessUser>(mockBusinessUser);
  assertType<RiderUser>(mockRiderUser);
  assertType<Offer>(mockOffer);
  
  console.log('All type tests passed!');
}

// Utility for checking if types are assignable
export type IsAssignable<T, U> = T extends U ? true : false;

// Test type relationships
export type TypeTests = {
  businessUserIsUser: IsAssignable<BusinessUser, User>;
  riderUserIsUser: IsAssignable<RiderUser, User>;
  createOfferHasRequiredFields: IsAssignable<CreateOffer, Omit<Offer, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'statusHistory'>>;
};

// Compile-time type tests
const typeTests: TypeTests = {
  businessUserIsUser: true,
  riderUserIsUser: true,
  createOfferHasRequiredFields: true
};

export { typeTests };