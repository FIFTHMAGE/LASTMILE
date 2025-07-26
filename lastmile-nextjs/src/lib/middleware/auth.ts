/**
 * Authentication middleware for API routes
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/utils/jwt';
import { UserRole } from '@/lib/types';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    isActive: boolean;
  };
}

/**
 * Middleware to authenticate API requests
 */
export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized - No token provided' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const decoded = await verifyJWT(token);

      if (!decoded) {
        return NextResponse.json(
          { error: 'Unauthorized - Invalid token' },
          { status: 401 }
        );
      }

      // Add user info to request
      (request as AuthenticatedRequest).user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        isVerified: decoded.isVerified,
        isActive: decoded.isActive,
      };

      return handler(request as AuthenticatedRequest);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Unauthorized - Token verification failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Middleware to check user roles
 */
export function withRole(
  allowedRoles: UserRole[],
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const user = request.user!;

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    return handler(request);
  });
}

/**
 * Middleware to check if user is verified
 */
export function withVerification(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const user = request.user!;

    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'Forbidden - Email verification required' },
        { status: 403 }
      );
    }

    return handler(request);
  });
}

/**
 * Middleware to check if user is active
 */
export function withActiveUser(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const user = request.user!;

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Forbidden - Account is inactive' },
        { status: 403 }
      );
    }

    return handler(request);
  });
}

/**
 * Combined middleware for role, verification, and active status
 */
export function withFullAuth(
  allowedRoles: UserRole[],
  requireVerification: boolean = true,
  requireActive: boolean = true
) {
  return (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) => {
    return withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
      const user = request.user!;

      // Check role
      if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      // Check verification
      if (requireVerification && !user.isVerified) {
        return NextResponse.json(
          { error: 'Forbidden - Email verification required' },
          { status: 403 }
        );
      }

      // Check active status
      if (requireActive && !user.isActive) {
        return NextResponse.json(
          { error: 'Forbidden - Account is inactive' },
          { status: 403 }
        );
      }

      return handler(request);
    });
  };
}

/**
 * Middleware for admin-only routes
 */
export const withAdmin = (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) =>
  withRole(['admin'], handler);

/**
 * Middleware for business-only routes
 */
export const withBusiness = (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) =>
  withRole(['business'], handler);

/**
 * Middleware for rider-only routes
 */
export const withRider = (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) =>
  withRole(['rider'], handler);

/**
 * Middleware for business or rider routes
 */
export const withBusinessOrRider = (handler: (request: AuthenticatedRequest) => Promise<NextResponse>) =>
  withRole(['business', 'rider'], handler);