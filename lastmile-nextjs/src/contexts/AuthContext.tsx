/**
 * Authentication context for managing user state
 */
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, LoginRequest, BusinessRegistrationRequest, RiderRegistrationRequest } from '@/lib/types';
import { ClientAuthUtils } from '@/lib/utils/auth-helpers';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  profile?: any;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  registerBusiness: (data: BusinessRegistrationRequest) => Promise<void>;
  registerRider: (data: RiderRegistrationRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // API base URL
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  // Generic API call function
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = ClientAuthUtils.getAuthToken() || ClientAuthUtils.getAuthCookie();
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'An error occurred');
    }

    return data;
  };

  // Load user from token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = ClientAuthUtils.getAuthToken() || ClientAuthUtils.getAuthCookie();
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Verify token and get user data
        const response = await apiCall('/api/user/profile');
        
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Invalid token, clear it
          ClientAuthUtils.removeAuthToken();
          ClientAuthUtils.removeAuthCookie();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid tokens
        ClientAuthUtils.removeAuthToken();
        ClientAuthUtils.removeAuthCookie();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      
      const response = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        
        // Store token
        ClientAuthUtils.setAuthToken(token);
        ClientAuthUtils.setAuthCookie(token);
        
        // Set user state
        setUser(userData);
        
        // Redirect based on role
        const dashboardPath = getDashboardPath(userData.role);
        router.push(dashboardPath);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout API to invalidate token on server
      await apiCall('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage and state
      ClientAuthUtils.removeAuthToken();
      ClientAuthUtils.removeAuthCookie();
      setUser(null);
    }
  }, []);

  // Business registration
  const registerBusiness = useCallback(async (data: BusinessRegistrationRequest) => {
    try {
      setLoading(true);
      
      const response = await apiCall('/api/auth/register/business', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        
        // Store token
        ClientAuthUtils.setAuthToken(token);
        ClientAuthUtils.setAuthCookie(token);
        
        // Set user state
        setUser(userData);
        
        // Redirect to verification page if needed
        if (!userData.isVerified) {
          router.push('/verify-email');
        } else {
          router.push('/dashboard/business');
        }
      }
    } catch (error) {
      console.error('Business registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Rider registration
  const registerRider = useCallback(async (data: RiderRegistrationRequest) => {
    try {
      setLoading(true);
      
      const response = await apiCall('/api/auth/register/rider', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.success && response.data) {
        const { token, user: userData } = response.data;
        
        // Store token
        ClientAuthUtils.setAuthToken(token);
        ClientAuthUtils.setAuthCookie(token);
        
        // Set user state
        setUser(userData);
        
        // Redirect to verification page if needed
        if (!userData.isVerified) {
          router.push('/verify-email');
        } else {
          router.push('/dashboard/rider');
        }
      }
    } catch (error) {
      console.error('Rider registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiCall('/api/user/profile');
      
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      // If refresh fails, user might need to re-login
      if (error instanceof Error && error.message.includes('401')) {
        ClientAuthUtils.removeAuthToken();
        ClientAuthUtils.removeAuthCookie();
        setUser(null);
        router.push('/login');
      }
    }
  }, [router]);

  // Update user profile
  const updateProfile = useCallback(async (data: any) => {
    try {
      const response = await apiCall('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }, []);

  // Helper function to get dashboard path based on role
  const getDashboardPath = (role: UserRole): string => {
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
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    registerBusiness,
    registerRider,
    refreshUser,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    return <Component {...props} />;
  };
}

// HOC for role-based access
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[]
): React.ComponentType<P> {
  return function RoleProtectedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && user && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard
        const dashboardPath = getDashboardPath(user.role);
        router.push(dashboardPath);
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!user || !allowedRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };

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
}