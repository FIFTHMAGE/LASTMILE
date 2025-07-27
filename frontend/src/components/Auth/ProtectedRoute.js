import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null, redirectTo = '/login' }) => {
  const { user, loading, isInitialized, isAuthenticated } = useAuth();

  console.log('🔍 ProtectedRoute check:', { 
    user: user?.email, 
    loading, 
    isInitialized, 
    isAuthenticated,
    requiredRole,
    userRole: user?.role 
  });

  // Show loading while authentication is being determined
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    console.log('🔍 ProtectedRoute: Not authenticated, redirecting to', redirectTo);
    return <Navigate to={redirectTo} replace />;
  }

  // Check role if required
  if (requiredRole && user.role !== requiredRole) {
    console.log('🔍 ProtectedRoute: Role mismatch, redirecting');
    const defaultRoute = user.role === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={defaultRoute} replace />;
  }

  console.log('✅ ProtectedRoute: Access granted');
  return children;
};

export default ProtectedRoute;