/**
 * API-related TypeScript type definitions
 */

import { NextRequest } from 'next/server';
import { UserRole } from './user';

// Generic API response structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  timestamp?: string;
}

// API error structure
export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
  details?: Record<string, any>;
}

// Pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Pagination response metadata
export interface PaginationResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Paginated API response
export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationResponse;
}

// Search parameters
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

// Geospatial query parameters
export interface GeospatialQuery {
  coordinates: [number, number]; // [lng, lat]
  maxDistance?: number; // in meters
  minDistance?: number; // in meters
}

// Date range query parameters
export interface DateRangeQuery {
  startDate?: Date;
  endDate?: Date;
}

// Enhanced Next.js request with user context
export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
}

// API route handler types
export type ApiRouteHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<Response>;

export type AuthenticatedApiRouteHandler = (
  request: AuthenticatedRequest,
  context?: { params: Record<string, string> }
) => Promise<Response>;

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// API endpoint configuration
export interface ApiEndpoint {
  path: string;
  method: HttpMethod;
  requiresAuth: boolean;
  requiredRole?: UserRole;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

// Request validation schema
export interface RequestValidationSchema {
  body?: Record<string, any>;
  query?: Record<string, any>;
  params?: Record<string, any>;
  headers?: Record<string, any>;
}

// API middleware context
export interface ApiMiddlewareContext {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
  };
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
  requestId: string;
  startTime: number;
}

// Error codes
export enum ApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Business logic errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // File upload errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE'
}

// HTTP status codes
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}

// API response helpers
export interface ApiResponseHelpers {
  success<T>(data: T, message?: string): ApiResponse<T>;
  error(code: ApiErrorCode, message: string, statusCode: HttpStatusCode): ApiResponse;
  paginated<T>(data: T[], pagination: PaginationResponse): PaginatedApiResponse<T>;
  notFound(resource: string): ApiResponse;
  unauthorized(message?: string): ApiResponse;
  forbidden(message?: string): ApiResponse;
  validationError(errors: string[]): ApiResponse;
}

// Request body types for common operations
export interface CreateResourceRequest<T> {
  data: T;
  metadata?: Record<string, any>;
}

export interface UpdateResourceRequest<T> {
  data: Partial<T>;
  metadata?: Record<string, any>;
}

export interface BulkOperationRequest<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: Record<string, any>;
}

export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  results: {
    success: boolean;
    item: any;
    error?: string;
  }[];
}

// File upload types
export interface FileUploadRequest {
  file: File;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  url: string;
  metadata: {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: Date;
  };
}

// Webhook types
export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: Date;
  signature: string;
}

export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  message?: string;
}

// API versioning
export interface ApiVersion {
  version: string;
  deprecated: boolean;
  deprecationDate?: Date;
  supportedUntil?: Date;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  version: string;
  uptime: number;
  checks: {
    database: 'healthy' | 'unhealthy';
    redis?: 'healthy' | 'unhealthy';
    externalServices: Record<string, 'healthy' | 'unhealthy'>;
  };
}

// API metrics
export interface ApiMetrics {
  endpoint: string;
  method: HttpMethod;
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastAccessed: Date;
}

// Type guards
export function isApiError(error: any): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof error.message === 'string' &&
    typeof error.code === 'string' &&
    typeof error.statusCode === 'number'
  );
}

export function isApiResponse<T>(response: any): response is ApiResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    typeof response.success === 'boolean'
  );
}

export function isPaginatedResponse<T>(response: any): response is PaginatedApiResponse<T> {
  return (
    isApiResponse(response) &&
    typeof response.pagination === 'object' &&
    response.pagination !== null
  );
}