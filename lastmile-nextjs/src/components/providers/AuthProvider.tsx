/**
 * Enhanced authentication provider with error handling and token refresh
 */
'use client';

import React, { useEffect } from 'react';
import { AuthProvider as BaseAuthProvider } from '@/contexts/AuthContext';
import { ToastProvider, useToastContext } from './ToastProvider';
import { ClientAuthUtils } from '@/lib/utils/auth-helpers';

interface AuthProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Internal component that handles auth errors and token refresh
 */
const AuthErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToastContext();

  useEffect(() => {
    // Set up token refresh interval
    const refreshInterval = setInterval(async () => {
      const token = ClientAuthUtils.getAuthToken() || ClientAuthUtils.getAuthCookie();
      
      if (token && ClientAuthUtils.isTokenExpired(token)) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.token) {
              ClientAuthUtils.setAuthToken(data.data.token);
              ClientAuthUtils.setAuthCookie(data.data.token);
            }
          } else {
            // Token refresh failed, clear auth data
            ClientAuthUtils.clearAuth();
            toast.error('Session expired. Please log in again.');
            window.location.href = '/login';
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          ClientAuthUtils.clearAuth();
          toast.error('Session expired. Please log in again.');
          window.location.href = '/login';
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [toast]);

  // Handle global auth errors
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      const { error, message } = event.detail;
      
      if (error === 'UNAUTHORIZED') {
        ClientAuthUtils.clearAuth();
        toast.error(message || 'Session expired. Please log in again.');
        window.location.href = '/login';
      } else if (error === 'FORBIDDEN') {
        toast.error(message || 'Access denied.');
      }
    };

    window.addEventListener('auth-error' as any, handleAuthError);
    return () => window.removeEventListener('auth-error' as any, handleAuthError);
  }, [toast]);

  return <>{children}</>;
};

/**
 * Enhanced authentication provider with error handling and token management
 */
export const AuthProviderWrapper: React.FC<AuthProviderWrapperProps> = ({ children }) => {
  return (
    <ToastProvider>
      <BaseAuthProvider>
        <AuthErrorHandler>
          {children}
        </AuthErrorHandler>
      </BaseAuthProvider>
    </ToastProvider>
  );
};

/**
 * Utility function to dispatch auth errors
 */
export const dispatchAuthError = (error: string, message?: string) => {
  const event = new CustomEvent('auth-error', {
    detail: { error, message }
  });
  window.dispatchEvent(event);
};