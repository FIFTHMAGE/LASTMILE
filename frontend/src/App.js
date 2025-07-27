import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage';
import ResendVerificationPage from './pages/Auth/ResendVerificationPage';
import BusinessDashboard from './pages/Business/Dashboard';
import BusinessOffers from './pages/Business/Offers';
import CreateOffer from './pages/Business/CreateOffer';
import RiderDashboard from './pages/Rider/Dashboard';
import RiderOffers from './pages/Rider/Offers';
import RiderDeliveries from './pages/Rider/Deliveries';
import RiderEarnings from './pages/Rider/Earnings';
import AdminDashboard from './pages/Admin/Dashboard';
import ProfilePage from './pages/Profile/ProfilePage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import LoadingSpinner from './components/UI/LoadingSpinner';

function App() {
  const { user, loading, isInitialized, isAuthenticated } = useAuth();

  console.log('🔍 App render:', { 
    user: user?.email, 
    loading, 
    isInitialized, 
    isAuthenticated,
    role: user?.role 
  });

  // Show loading spinner while initializing authentication
  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes (no authentication required)
  if (!isAuthenticated || !user) {
    console.log('🔍 Rendering public routes');
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  console.log('🔍 Rendering authenticated routes for role:', user.role);

  // Authenticated routes
  return (
    <Layout>
      <Routes>
        {/* Common routes for all authenticated users */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Business routes */}
        {user.role === 'business' && (
          <>
            <Route path="/dashboard" element={<BusinessDashboard />} />
            <Route path="/offers" element={<BusinessOffers />} />
            <Route path="/offers/create" element={<CreateOffer />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/register" element={<Navigate to="/dashboard" replace />} />
          </>
        )}

        {/* Rider routes */}
        {user.role === 'rider' && (
          <>
            <Route path="/dashboard" element={<RiderDashboard />} />
            <Route path="/offers" element={<RiderOffers />} />
            <Route path="/deliveries" element={<RiderDeliveries />} />
            <Route path="/earnings" element={<RiderEarnings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/register" element={<Navigate to="/dashboard" replace />} />
          </>
        )}

        {/* Admin routes */}
        {user.role === 'admin' && (
          <>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Navigate to="/admin" replace />} />
            <Route path="/register" element={<Navigate to="/admin" replace />} />
          </>
        )}

        {/* Fallback route - redirect to appropriate dashboard */}
        <Route path="*" element={
          <Navigate 
            to={user.role === 'admin' ? '/admin' : '/dashboard'} 
            replace 
          />
        } />
      </Routes>
    </Layout>
  );
}

export default App;