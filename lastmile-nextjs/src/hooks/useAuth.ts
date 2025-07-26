/**
 * Authentication hooks for easier usage throughout the app
 */
import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

/**
 * Hook to access authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user has specific role
 */
export function useRole(requiredRole: string | string[]): boolean {
  const { user } = useAuth();
  
  if (!user) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }
  
  return user.role === requiredRole;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { user } = useAuth();
  
  if (!user) return false;
  
  return roles.includes(user.role);
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && !!user;
}

/**
 * Hook to check if user is verified
 */
export function useIsVerified(): boolean {
  const { user } = useAuth();
  return !!user?.isVerified;
}

/**
 * Hook to check if user is active
 */
export function useIsActive(): boolean {
  const { user } = useAuth();
  return !!user?.isActive;
}

/**
 * Hook to get user profile data
 */
export function useUserProfile() {
  const { user } = useAuth();
  return user?.profile || null;
}

/**
 * Hook for authentication status with loading state
 */
export function useAuthStatus() {
  const { user, loading } = useAuth();
  
  return {
    isAuthenticated: !loading && !!user,
    isLoading: loading,
    user,
  };
}