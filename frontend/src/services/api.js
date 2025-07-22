import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please try again later.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: (token) => api.post('/auth/refresh', { token }),
};

// Business API
export const businessAPI = {
  getDashboard: () => api.get('/business/overview'),
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