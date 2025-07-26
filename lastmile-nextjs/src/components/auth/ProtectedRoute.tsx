/**
 * Protected route components for authentication and authorization
 */
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireVerification?: boolean;
  fallbackPath?: string;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

/**
 * Component that protects routes based on authentication and authorization
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requireVerification = false,
  fallbackPath = '/login',
  loadingComponent,
  unauthorizedComponent,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      router.push(fallbackPath);
      return;
    }

    // Check role requirements
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on user role
      const dashboardPath = getDashboardPath(user.role);
      router.push(dashboardPath);
      return;
    }

    // Check verification requirements
    if (requireVerification && !user.isVerified) {
      router.push('/verify-email');
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      router.push('/account-suspended');
      return;
    }
  }, [user, loading, router, requiredRoles, requireVerification, fallbackPath]);

  // Show loading state
  if (loading) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      )
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Check role authorization
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return (
      unauthorizedComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    );
  }

  // Check verification requirement
  if (requireVerification && !user.isVerified) {
    return null; // Will redirect in useEffect
  }

  // Check if user is active
  if (!user.isActive) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

/**
 * HOC version of ProtectedRoute
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
): React.ComponentType<P> {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Component that only renders children if user has required role
 */
export interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRoles,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user || !requiredRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Component that only renders children if user is verified
 */
export interface VerificationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const VerificationGuard: React.FC<VerificationGuardProps> = ({
  children,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user?.isVerified) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Component that redirects authenticated users away from auth pages
 */
export interface GuestOnlyProps {
  children: React.ReactNode;
  redirectPath?: string;
}

export const GuestOnly: React.FC<GuestOnlyProps> = ({
  children,
  redirectPath,
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const path = redirectPath || getDashboardPath(user.role);
      router.push(path);
    }
  }, [user, loading, router, redirectPath]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

// Helper function to get dashboard path based on role
function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'business':
      return '/dashboard/business';
    case 'rider':
      return '/dashboard/rider';
    case 'admin':
      return '/dashboard/admin';
    default:
      return '/dashboard';
  }
}