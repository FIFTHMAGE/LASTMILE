import axios from 'axios';
import toast from 'react-hot-toast';
import { authDebug } from '../utils/authDebug';
import { tokenUtils } from '../utils/tokenUtils';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      authDebug.api(config.method, config.url, { hasAuth: true });
    } else {
      authDebug.api(config.method, config.url, { hasAuth: false });
    }
    return config;
  },
  (error) => {
    authDebug.error('API Request Failed', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    authDebug.log('API Response Success', { 
      url: response.config.url, 
      status: response.status 
    });
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    authDebug.error('API Response Error', error, { 
      url, 
      status,
      data: error.response?.data 
    });
    
    if (status === 401) {
      // Token expired or invalid
      authDebug.log('Token expired, clearing auth state');
      tokenUtils.removeToken();
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        authDebug.navigation(window.location.pathname, '/login', 'Token expired');
        window.location.href = '/login';
      }
    } else if (status === 429) {
      toast.error('Too many requests. Please try again later.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (status === 400 && url?.includes('/auth/login')) {
      // Don't show toast for login errors, let the login form handle it
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => {
    // Determine which registration endpoint to use based on role
    if (userData.role === 'business') {
      return api.post('/auth/register/business', userData);
    } else if (userData.role === 'rider') {
      return api.post('/auth/register/rider', userData);
    } else {
      return api.post('/auth/register', userData);
    }
  },
  refreshToken: (token) => api.post('/auth/refresh', { token }),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
};

// Business API
export const businessAPI = {
  getDashboard: (params) => api.get('/business/overview', { params }),
  getOffers: (params) => api.get('/business/offers', { params }),
  createOffer: (offerData) => api.post('/business/offers', offerData),
  getOffer: (offerId) => api.get(`/business/offers/${offerId}`),
  cancelOffer: (offerId, reason) => api.patch(`/business/offers/${offerId}/cancel`, { reason }),
  getEarnings: (params) => api.get('/business/earnings', { params }),
  getPayments: (params) => api.get('/business/payments', { params }),
};

// Rider API
export const riderAPI = {
  getDashboard: () => api.get('/rider/overview'),
  getNearbyOffers: (params) => api.get('/rider/nearby-offers', { params }),
  acceptOffer: (offerId) => api.post(`/rider/offers/${offerId}/accept`),
  getDeliveries: (params) => api.get('/rider/deliveries', { params }),
  updateDeliveryStatus: (offerId, status, location) => 
    api.patch(`/rider/deliveries/${offerId}/status`, { status, location }),
  updateAvailability: (isAvailable) => api.patch('/rider/availability', { isAvailable }),
  updateLocation: (lat, lng, accuracy) => api.patch('/rider/location', { lat, lng, accuracy }),
  getEarnings: (params) => api.get('/rider/earnings', { params }),
  getStats: (params) => api.get('/rider/stats', { params }),
};

// Common API
export const commonAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markNotificationRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAllNotificationsRead: () => api.patch('/notifications/mark-all-read'),
  getProfile: () => api.get('/profile'),
  updateProfile: (profileData) => api.patch('/profile', profileData),
  getPayments: (params) => api.get('/payments', { params }),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (userId, userData) => api.patch(`/admin/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getOffers: (params) => api.get('/admin/offers', { params }),
  getPayments: (params) => api.get('/admin/payments', { params }),
};

export default api;