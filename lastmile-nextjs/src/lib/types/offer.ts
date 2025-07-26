/**
 * Offer-related TypeScript type definitions
 */

export type OfferStatus = 'open' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'digital';
export type Currency = 'USD' | 'EUR' | 'GBP';

export interface PackageDetails {
  weight?: number; // in kg
  dimensions?: {
    length: number; // in cm
    width: number;  // in cm
    height: number; // in cm
  };
  fragile: boolean;
  specialInstructions?: string;
}

export interface LocationInfo {
  address: string;
  coordinates: [number, number]; // [lng, lat]
  contactName: string;
  contactPhone: string;
  instructions?: string;
}

export interface PickupInfo extends LocationInfo {
  availableFrom?: Date;
  availableUntil?: Date;
}

export interface DeliveryInfo extends LocationInfo {
  deliverBy?: Date;
}

export interface PaymentInfo {
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
}

export interface LocationPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface StatusHistoryEntry {
  status: OfferStatus;
  timestamp: Date;
  updatedBy: string; // User ID
  notes?: string;
  location?: LocationPoint;
}

export interface Offer {
  _id: string;
  business: string; // User ID
  title: string;
  description?: string;
  packageDetails: PackageDetails;
  pickup: PickupInfo;
  delivery: DeliveryInfo;
  payment: PaymentInfo;
  status: OfferStatus;
  statusHistory: StatusHistoryEntry[];
  
  // Rider assignment and timing
  acceptedBy?: string; // User ID
  acceptedAt?: Date;
  pickedUpAt?: Date;
  inTransitAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Distance and time estimates
  estimatedDistance?: number; // in meters
  estimatedDuration?: number; // in minutes
  actualDistance?: number;    // in meters
  actualDuration?: number;    // in minutes
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Offer creation types (without _id and timestamps)
export interface CreateOffer {
  business: string;
  title: string;
  description?: string;
  packageDetails: PackageDetails;
  pickup: PickupInfo;
  delivery: DeliveryInfo;
  payment: PaymentInfo;
}

// Offer update types
export interface UpdateOffer {
  title?: string;
  description?: string;
  packageDetails?: Partial<PackageDetails>;
  pickup?: Partial<PickupInfo>;
  delivery?: Partial<DeliveryInfo>;
  payment?: Partial<PaymentInfo>;
}

// Offer summary for API responses
export interface OfferSummary {
  id: string;
  title: string;
  description?: string;
  pickup: {
    address: string;
    coordinates: [number, number];
    availableFrom?: Date;
    availableUntil?: Date;
  };
  delivery: {
    address: string;
    coordinates: [number, number];
    deliverBy?: Date;
  };
  payment: PaymentInfo;
  status: OfferStatus;
  estimatedDistance?: number;
  estimatedDuration?: number;
  createdAt: Date;
  acceptedBy?: string;
  acceptedAt?: Date;
}

// Offer filtering and search types
export interface OfferFilters {
  status?: OfferStatus;
  minPayment?: number;
  maxPayment?: number;
  packageType?: 'fragile' | 'regular';
  vehicleType?: 'bike' | 'scooter' | 'car' | 'van';
  sortBy?: 'distance' | 'payment' | 'created' | 'weight' | 'deliverBy' | 'estimatedDuration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  fragile?: boolean;
  maxWeight?: number;
  maxDimensions?: string; // "length,width,height"
  availableFrom?: Date;
  availableUntil?: Date;
  deliverBy?: Date;
  paymentMethod?: PaymentMethod;
  businessId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Nearby offers search
export interface NearbyOffersQuery {
  lng: number;
  lat: number;
  maxDistance?: number; // in meters
  minDistance?: number; // in meters
  filters?: OfferFilters;
}

// Offer status workflow
export interface StatusTransitionResult {
  isValid: boolean;
  error?: string;
  validTransitions?: OfferStatus[];
}

export interface StatusUpdateOptions {
  notes?: string;
  location?: LocationPoint;
}

export interface StatusUpdateResult {
  previousStatus: OfferStatus;
  newStatus: OfferStatus;
  timestamp: Date;
  updatedBy: string;
}

// Offer validation
export interface OfferValidationError {
  field: string;
  message: string;
}

export interface OfferValidationResult {
  isValid: boolean;
  errors: OfferValidationError[];
}

// Vehicle constraints for filtering
export interface VehicleConstraints {
  maxWeight: number; // in kg
  maxVolume: number; // in cubic cm
}

// Distance and duration calculations
export interface DistanceCalculation {
  distance: number; // in meters
  duration: number; // in minutes
}

// Geospatial query results
export interface OfferWithDistance extends Offer {
  distanceFromRider: number; // in meters
  businessInfo?: {
    _id: string;
    name: string;
    businessName?: string;
    businessPhone?: string;
  };
}

// Status workflow information
export interface StatusInfo {
  currentStatus: OfferStatus;
  timestamp?: Date;
  validNextStates: OfferStatus[];
  isTerminal: boolean;
  assignedRider?: string;
  statusHistory: StatusHistoryEntry[];
}

// Offer modification permissions
export interface ModificationPermissions {
  canModify: boolean;
  reason?: string;
  allowedActions?: string[];
}

// Type guards
export function isValidOfferStatus(status: string): status is OfferStatus {
  return ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'].includes(status);
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ['cash', 'card', 'digital'].includes(method);
}

export function isTerminalStatus(status: OfferStatus): boolean {
  return ['completed', 'cancelled'].includes(status);
}