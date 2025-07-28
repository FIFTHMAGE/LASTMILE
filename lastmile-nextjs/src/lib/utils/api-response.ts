/**
 * API Response Utilities
 * Standardized response helpers for API routes
 */

import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, 'healthy' | 'unhealthy'>;
  uptime: number;
  version: string;
  timestamp: string;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...(details && { details })
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a health check response
 */
export function createHealthCheckResponse(
  status: 'healthy' | 'unhealthy' | 'degraded',
  checks: Record<string, 'healthy' | 'unhealthy'>,
  uptime: number,
  version: string
): NextResponse {
  const response: HealthCheckResponse = {
    status,
    checks,
    uptime,
    version,
    timestamp: new Date().toISOString()
  };

  const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(response, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  errors: Record<string, string[]>
): NextResponse {
  return createErrorResponse('Validation failed', 422, { errors });
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse {
  return createErrorResponse(message, 401);
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(
  message: string = 'Forbidden'
): NextResponse {
  return createErrorResponse(message, 403);
}

/**
 * Create a not found response
 */
export function createNotFoundResponse(
  message: string = 'Resource not found'
): NextResponse {
  return createErrorResponse(message, 404);
}

/**
 * Create a server error response
 */
export function createServerErrorResponse(
  message: string = 'Internal server error'
): NextResponse {
  return createErrorResponse(message, 500);
}

/**
 * Handle async API route with error catching
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof Error) {
        return createServerErrorResponse(error.message);
      }
      
      return createServerErrorResponse('An unexpected error occurred');
    }
  };
}

/**
 * CORS headers for API responses
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Add CORS headers to response
 */
export function withCORS(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}