import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { tokenUtils } from '../utils/tokenUtils';
import { authDebug } from '../utils/authDebug';
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
  const [token, setToken] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize token from localStorage on mount
  useEffect(() => {
    authDebug.log('AuthProvider initializing');
    
    // Clean up any invalid tokens first
    const cleanedUp = tokenUtils.cleanupInvalidTokens();
    if (cleanedUp) {
      authDebug.log('Cleaned up invalid tokens');
    }
    
    const storedToken = tokenUtils.getToken();
    
    if (storedToken && tokenUtils.isValidToken(storedToken)) {
      authDebug.log('Valid token found', { tokenLength: storedToken.length });
      setToken(storedToken);
    } else {
      authDebug.log('No valid token found');
      setLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Verify token when token changes
  useEffect(() => {
    if (token && !isInitialized) {
      authDebug.log('Token changed, verifying', { tokenLength: token.length });
      verifyToken(token);
    }
  }, [token, isInitialized]);

  const verifyToken = async (tokenToVerify) => {
    if (!tokenToVerify) {
      console.log('❌ No token to verify');
      setLoading(false);
      setIsInitialized(true);
      return false;
    }

    try {
      console.log('🔍 Verifying token...');
      setLoading(true);

      // First check if token is valid format and not expired
      if (!tokenUtils.isValidToken(tokenToVerify)) {
        throw new Error('Token is invalid or expired');
      }

      // Get user data from token
      let userData = tokenUtils.getUserFromToken(tokenToVerify);
      
      if (!userData) {
        console.log('⚠️ Could not extract user data from token, trying server verification');
        
        // If token decode fails, try server verification
        try {
          const response = await authAPI.refreshToken(tokenToVerify);
          if (response.data?.user) {
            userData = response.data.user;
            console.log('✅ Server token verification successful');
          } else {
            throw new Error('Invalid user data from server');
          }
        } catch (serverError) {
          console.error('❌ Server token verification failed:', serverError);
          throw serverError;
        }
      }

      if (userData) {
        setUser(userData);
        setToken(tokenToVerify);
        tokenUtils.setToken(tokenToVerify);
        console.log('✅ User authenticated:', userData.email);
        return true;
      } else {
        throw new Error('No user data available');
      }

    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      
      // Clear invalid token
      setUser(null);
      setToken(null);
      tokenUtils.removeToken();
      
      return false;
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔍 Login attempt for:', email);
      setLoading(true);
      
      const response = await authAPI.login(email, password);
      console.log('✅ Login API response received');
      
      const { user: userData, token: userToken, verification } = response.data;
      
      if (!userData || !userToken) {
        throw new Error('Invalid login response - missing user data or token');
      }

      console.log('✅ Login successful for:', userData.email, 'Role:', userData.role);
      
      // Store token and user data
      tokenUtils.setToken(userToken);
      setToken(userToken);
      setUser(userData);
      
      // Show verification warning if needed
      if (verification && !verification.verified) {
        toast.warning(verification.message, {
          duration: 6000,
          icon: '⚠️',
        });
      } else {
        toast.success(`Welcome back, ${userData.name}!`);
      }
      
      console.log('✅ Login process completed successfully');
      return userData;
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Clear any partial state
      setUser(null);
      setToken(null);
      tokenUtils.removeToken();
      
      const message = error.response?.data?.message || 
                     error.response?.data?.error?.message || 
                     error.message || 
                     'Login failed';
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

  const logout = (showMessage = true) => {
    console.log('🔍 Logging out user');
    
    setUser(null);
    setToken(null);
    tokenUtils.removeToken();
    
    if (showMessage) {
      toast.success('Logged out successfully');
    }
    
    console.log('✅ Logout completed');
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
    isInitialized,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    updateUser,
    resendVerification,
    verifyToken,
    isVerified: user?.isVerified || false
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};