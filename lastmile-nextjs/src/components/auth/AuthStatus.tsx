/**
 * Authentication status components for displaying user info and actions
 */
'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Badge, Button, LoadingSpinner } from '@/components/ui';

export interface AuthStatusProps {
  showAvatar?: boolean;
  showRole?: boolean;
  showLogout?: boolean;
  className?: string;
}

/**
 * Component that displays current authentication status
 */
export const AuthStatus: React.FC<AuthStatusProps> = ({
  showAvatar = true,
  showRole = true,
  showLogout = true,
  className = '',
}) => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className="text-sm text-gray-500">Not authenticated</span>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showAvatar && (
        <Avatar
          src={user.profile?.avatar}
          fallback={user.profile?.firstName || user.email}
          size="sm"
        />
      )}
      
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {user.profile?.firstName || user.email}
        </span>
        
        <div className="flex items-center space-x-2">
          {showRole && (
            <Badge variant="secondary" size="sm">
              {user.role}
            </Badge>
          )}
          
          {!user.isVerified && (
            <Badge variant="warning" size="sm">
              Unverified
            </Badge>
          )}
          
          {!user.isActive && (
            <Badge variant="error" size="sm">
              Inactive
            </Badge>
          )}
        </div>
      </div>
      
      {showLogout && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
        >
          Logout
        </Button>
      )}
    </div>
  );
};

/**
 * Simple user greeting component
 */
export interface UserGreetingProps {
  className?: string;
}

export const UserGreeting: React.FC<UserGreetingProps> = ({ className = '' }) => {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return null;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user.profile?.firstName || user.email.split('@')[0];

  return (
    <div className={className}>
      <h1 className="text-2xl font-bold text-gray-900">
        {getGreeting()}, {displayName}!
      </h1>
    </div>
  );
};

/**
 * Component that shows verification status and actions
 */
export interface VerificationStatusProps {
  className?: string;
  showActions?: boolean;
}

export const VerificationStatus: React.FC<VerificationStatusProps> = ({
  className = '',
  showActions = true,
}) => {
  const { user, refreshUser } = useAuth();

  if (!user || user.isVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lastmile_auth_token')}`,
        },
      });

      if (response.ok) {
        alert('Verification email sent!');
      } else {
        alert('Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      alert('Failed to send verification email');
    }
  };

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-md p-4 ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Email Verification Required
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            Please verify your email address to access all features.
          </p>
          {showActions && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
              >
                Resend Verification Email
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};