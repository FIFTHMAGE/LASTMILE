import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      // Verify token and get user info
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      if (token.startsWith('demo.')) {
        // For demo tokens, extract the payload
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }
        
        // Decode the payload
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if token is expired
        if (payload.exp * 1000 < Date.now()) {
          console.log('Token expired');
          logout();
          return;
        }

        // Set user from token payload
        setUser({
          id: payload.userId || payload._id,
          email: payload.email,
          role: payload.role,
          name: payload.name
        });
      } else {
        // For regular tokens, verify with the server
        try {
          const response = await authAPI.refreshToken(token);
          if (response.data?.user) {
            setUser(response.data.user);
          } else {
            throw new Error('Invalid user data');
          }
        } catch (error) {
          console.error('Server token verification failed:', error);
          logout();
          return;
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.login(email, password);
      
      const { user: userData, token: userToken, verification } = response.data;
      
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      
      // Show verification warning if needed
      if (verification && !verification.verified) {
        toast.warning(verification.message, {
          duration: 6000,
          icon: '⚠️',
        });
      } else {
        toast.success(`Welcome back, ${userData.name}!`);
      }
      
      return userData;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      
      const { user: newUser, token: userToken, verificationSent } = response.data;
      
      setUser(newUser);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      
      if (verificationSent) {
        toast.success(
          `Welcome to LastMile, ${newUser.name}! Please check your email to verify your account.`,
          { duration: 6000 }
        );
      } else {
        toast.success(`Welcome to LastMile, ${newUser.name}!`);
      }
      
      return newUser;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const resendVerification = async (email) => {
    try {
      setLoading(true);
      await authAPI.resendVerification(email);
      toast.success('Verification email sent. Please check your inbox.');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send verification email';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    resendVerification,
    isVerified: user?.isVerified || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};