/**
 * Centralized type exports for the LastMile Delivery Platform
 */

// User types
export type {
  UserRole,
  VehicleType,
  BaseUser,
  BusinessAddress,
  BusinessProfile,
  LocationPoint,
  RiderProfile,
  AdminProfile,
  BusinessUser,
  RiderUser,
  AdminUser,
  User,
  CreateUserBase,
  CreateBusinessUser,
  CreateRiderUser,
  CreateAdminUser,
  CreateUser,
  UpdateUserProfile,
  LoginCredentials,
  UserProfileData,
  UserValidationError,
  UserValidationResult
} from './user';

export {
  isBusinessUser,
  isRiderUser,
  isAdminUser
} from './user';

// Offer types
export type {
  OfferStatus,
  PaymentMethod,
  Currency,
  PackageDetails,
  LocationInfo,
  PickupInfo,
  DeliveryInfo,
  PaymentInfo,
  StatusHistoryEntry,
  Offer,
  CreateOffer,
  UpdateOffer,
  OfferSummary,
  OfferFilters,
  NearbyOffersQuery,
  StatusTransitionResult,
  StatusUpdateOptions,
  StatusUpdateResult,
  OfferValidationError,
  OfferValidationResult,
  VehicleConstraints,
  DistanceCalculation,
  OfferWithDistance,
  StatusInfo,
  ModificationPermissions
} from './offer';

export {
  isValidOfferStatus,
  isValidPaymentMethod,
  isTerminalStatus
} from './offer';

// Notification types
export type {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  Notification,
  CreateNotification,
  UpdateNotification,
  NotificationSummary,
  NotificationFilters,
  NotificationPreferences,
  NotificationChannel,
  NotificationDelivery,
  NotificationEvent,
  NotificationStats,
  BulkNotificationOperation,
  BulkNotificationResult
} from './notification';

export {
  isValidNotificationType,
  isValidNotificationPriority,
  isValidNotificationStatus
} from './notification';

// Payment types
export type {
  PaymentStatus,
  TransactionType,
  PaymentDetails,
  Payment,
  CreatePayment,
  UpdatePayment,
  PaymentSummary,
  PaymentFilters,
  PaymentProcessingRequest,
  PaymentProcessingResult,
  RefundRequest,
  RefundResult,
  PaymentStats,
  EarningsCalculation,
  RiderEarnings,
  BusinessPayments,
  PaymentValidationError,
  PaymentValidationResult
} from './payment';

export {
  isValidPaymentStatus,
  isValidTransactionType,
  isValidCurrency,
  isCompletedPayment,
  isFailedPayment,
  isPendingPayment
} from './payment';

// API types
export type {
  ApiResponse,
  ApiError,
  PaginationParams,
  PaginationResponse,
  PaginatedApiResponse,
  SearchParams,
  GeospatialQuery,
  DateRangeQuery,
  AuthenticatedRequest,
  ApiRouteHandler,
  AuthenticatedApiRouteHandler,
  HttpMethod,
  ApiEndpoint,
  RequestValidationSchema,
  ApiMiddlewareContext,
  ApiResponseHelpers,
  CreateResourceRequest,
  UpdateResourceRequest,
  BulkOperationRequest,
  BulkOperationResponse,
  FileUploadRequest,
  FileUploadResponse,
  WebhookPayload,
  WebhookResponse,
  ApiVersion,
  HealthCheckResponse,
  ApiMetrics
} from './api';

export {
  ApiErrorCode,
  HttpStatusCode,
  isApiError,
  isApiResponse,
  isPaginatedResponse
} from './api';

// Authentication types
export type {
  JwtPayload,
  LoginCredentials as AuthLoginCredentials,
  RegisterCredentials,
  BusinessRegistrationData,
  RiderRegistrationData,
  AdminRegistrationData,
  AuthResponse,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  PasswordResetRequest,
  PasswordResetConfirmation,
  EmailVerificationRequest,
  ResendVerificationRequest,
  ChangePasswordRequest,
  AuthSession,
  Permission,
  RolePermissions,
  AuthMiddlewareContext,
  RouteProtection,
  AuthError,
  TwoFactorAuth,
  OAuthProvider,
  SecuritySettings,
  AuthAuditLog,
  AuthRateLimit
} from './auth';

export {
  AuthErrorType,
  isValidJwtPayload,
  isBusinessRegistration,
  isRiderRegistration,
  isAdminRegistration,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
} from './auth';

// Validation utilities
export type {
  PasswordValidation,
  ValidationResult
} from './validation';

export {
  isValidEmail,
  isValidPhone,
  validatePassword,
  isValidCoordinates,
  isValidObjectId,
  isValidUserRole,
  isValidVehicleType,
  isValidDate,
  isPositiveNumber,
  isNonNegativeNumber,
  isNonEmptyString,
  isValidUrl,
  isValidZipCode,
  createValidationResult,
  isNonEmptyArray,
  isNonEmptyObject,
  isInRange,
  isValidLength
} from './validation';

// Common utility types
export type ID = string;
export type Timestamp = Date;
export type Coordinates = [number, number]; // [lng, lat]

// Generic response types
export type SuccessResponse<T = any> = {
  success: true;
  data: T;
  message?: string;
};

export type ErrorResponse = {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
  };
};

export type ApiResult<T = any> = SuccessResponse<T> | ErrorResponse;

// Database document base type
export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Soft delete support
export interface SoftDeletable {
  deletedAt?: Date;
  isDeleted: boolean;
}

// Audit trail support
export interface Auditable {
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

// Geospatial types
export interface GeoPoint {
  type: 'Point';
  coordinates: Coordinates;
}

export interface GeoBounds {
  northEast: Coordinates;
  southWest: Coordinates;
}

// File types
export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
}

// Search and filtering
export interface SearchQuery {
  term: string;
  fields?: string[];
  fuzzy?: boolean;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Environment types
export type Environment = 'development' | 'production' | 'test';

// Feature flags
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: Record<string, any>;
}

// Configuration types
export interface AppConfig {
  environment: Environment;
  version: string;
  features: Record<string, FeatureFlag>;
  limits: {
    maxFileSize: number;
    maxRequestSize: number;
    rateLimit: {
      requests: number;
      windowMs: number;
    };
  };
}

// Type utilities
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Event types for real-time features
export interface BaseEvent {
  type: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface OfferEvent extends BaseEvent {
  type: 'offer_created' | 'offer_updated' | 'offer_status_changed';
  offerId: string;
  data: Partial<Offer>;
}

export interface UserEvent extends BaseEvent {
  type: 'user_online' | 'user_offline' | 'location_updated';
  userId: string;
  data: Record<string, any>;
}

export type SystemEvent = OfferEvent | UserEvent;