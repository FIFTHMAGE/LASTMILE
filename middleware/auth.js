const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Enhanced authentication middleware with role-specific JWT token validation
 */
const auth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Access denied. No valid token provided.',
        error: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Enhanced token validation - check if user still exists and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        message: 'Access denied. User not found.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Add enhanced user data to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      isVerified: decoded.isVerified,
      email: user.email,
      name: user.name,
      profile: user.profile
    };

    // Add role-specific context
    req.userContext = {
      isDashboardAccess: req.path.includes('/dashboard'),
      isApiAccess: req.path.includes('/api'),
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Access denied. Token has expired.',
        error: 'TOKEN_EXPIRED'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Access denied. Invalid token.',
        error: 'INVALID_TOKEN'
      });
    }

    console.error('Auth middleware error:', err);
    res.status(500).json({ 
      message: 'Server error during authentication',
      error: 'AUTH_SERVER_ERROR'
    });
  }
};

/**
 * Role-specific middleware factory with enhanced validation
 */
const requireRole = (requiredRole, options = {}) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    // Check role requirement
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        message: `Access denied. ${requiredRole} role required.`,
        userRole: req.user.role,
        requiredRole: requiredRole,
        error: 'INSUFFICIENT_ROLE'
      });
    }

    // Optional: Check if user is verified (for sensitive operations)
    if (options.requireVerified && !req.user.isVerified) {
      return res.status(403).json({ 
        message: 'Account verification required for this action.',
        error: 'VERIFICATION_REQUIRED'
      });
    }

    // Add role-specific permissions to request
    req.permissions = getRolePermissions(requiredRole);
    
    next();
  };
};

/**
 * Multiple roles middleware - allows access if user has any of the specified roles
 */
const requireAnyRole = (allowedRoles, options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. One of these roles required: ${allowedRoles.join(', ')}`,
        userRole: req.user.role,
        allowedRoles: allowedRoles,
        error: 'INSUFFICIENT_ROLE'
      });
    }

    if (options.requireVerified && !req.user.isVerified) {
      return res.status(403).json({ 
        message: 'Account verification required for this action.',
        error: 'VERIFICATION_REQUIRED'
      });
    }

    req.permissions = getRolePermissions(req.user.role);
    next();
  };
};

/**
 * Dashboard routing middleware - ensures users access appropriate dashboards
 */
const dashboardRouter = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required for dashboard access',
      error: 'NOT_AUTHENTICATED'
    });
  }

  // Define role-specific dashboard routes
  const dashboardRoutes = {
    business: {
      defaultRoute: '/business/dashboard',
      allowedRoutes: [
        '/business/dashboard',
        '/business/offers',
        '/business/offers/create',
        '/business/offers/:id',
        '/business/payments',
        '/business/profile',
        '/business/notifications'
      ]
    },
    rider: {
      defaultRoute: '/rider/dashboard',
      allowedRoutes: [
        '/rider/dashboard',
        '/rider/offers',
        '/rider/deliveries',
        '/rider/earnings',
        '/rider/profile',
        '/rider/notifications',
        '/rider/tracking'
      ]
    }
  };

  // Add dashboard routing info to request
  req.dashboardInfo = dashboardRoutes[req.user.role];
  
  // Check if current route is allowed for user's role
  const currentPath = req.path;
  const userRoutes = dashboardRoutes[req.user.role];
  
  if (userRoutes) {
    const isAllowedRoute = userRoutes.allowedRoutes.some(route => {
      // Handle parameterized routes
      const routePattern = route.replace(':id', '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(currentPath);
    });

    if (!isAllowedRoute && currentPath.startsWith(`/${req.user.role}/`)) {
      return res.status(403).json({
        message: `Access denied. Route not allowed for ${req.user.role} role.`,
        allowedRoutes: userRoutes.allowedRoutes,
        error: 'ROUTE_NOT_ALLOWED'
      });
    }
  }

  next();
};

/**
 * Get role-specific permissions
 */
function getRolePermissions(role) {
  const permissions = {
    business: {
      canCreateOffers: true,
      canViewOwnOffers: true,
      canTrackDeliveries: true,
      canMakePayments: true,
      canViewPaymentHistory: true,
      canUpdateProfile: true,
      canViewNotifications: true
    },
    rider: {
      canViewOffers: true,
      canAcceptOffers: true,
      canUpdateDeliveryStatus: true,
      canUpdateLocation: true,
      canViewEarnings: true,
      canUpdateAvailability: true,
      canUpdateProfile: true,
      canViewNotifications: true
    },
    admin: {
      canViewAllUsers: true,
      canViewAllOffers: true,
      canViewSystemStats: true,
      canManageUsers: true,
      canResolveDisputes: true,
      canAccessAdminPanel: true
    }
  };

  return permissions[role] || {};
}

/**
 * Permission check middleware
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.permissions || !req.permissions[permission]) {
      return res.status(403).json({
        message: `Access denied. Permission '${permission}' required.`,
        userRole: req.user?.role,
        error: 'INSUFFICIENT_PERMISSION'
      });
    }
    next();
  };
};

/**
 * Enhanced token generation with role-specific claims
 */
const generateToken = (user, options = {}) => {
  const payload = {
    id: user._id,
    role: user.role,
    isVerified: user.isVerified,
    email: user.email,
    permissions: getRolePermissions(user.role),
    iat: Math.floor(Date.now() / 1000)
  };

  // Add role-specific claims
  if (user.role === 'rider') {
    payload.riderInfo = {
      vehicleType: user.profile?.vehicleType,
      isAvailable: user.profile?.isAvailable,
      rating: user.profile?.rating
    };
  } else if (user.role === 'business') {
    payload.businessInfo = {
      businessName: user.profile?.businessName,
      businessPhone: user.profile?.businessPhone
    };
  }

  const tokenOptions = {
    expiresIn: options.expiresIn || '7d',
    issuer: 'lastmile-platform',
    audience: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

/**
 * Refresh token middleware
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        message: 'Refresh token is required',
        error: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Get user and generate new access token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: 'Invalid refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new access token
    const newAccessToken = generateToken(user);
    
    req.newToken = newAccessToken;
    req.user = {
      id: user._id,
      role: user.role,
      isVerified: user.isVerified,
      email: user.email,
      name: user.name
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Invalid refresh token',
      error: 'INVALID_REFRESH_TOKEN'
    });
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + ':' + (req.body.email || 'unknown');
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > windowMs) {
        attempts.delete(k);
      }
    }

    const userAttempts = attempts.get(key);
    
    if (!userAttempts) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      const timeLeft = Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000 / 60);
      return res.status(429).json({
        message: `Too many authentication attempts. Try again in ${timeLeft} minutes.`,
        error: 'RATE_LIMIT_EXCEEDED',
        retryAfter: timeLeft
      });
    }

    userAttempts.count++;
    next();
  };
};

module.exports = {
  auth,
  requireRole,
  requireAnyRole,
  dashboardRouter,
  requirePermission,
  generateToken,
  refreshToken,
  authRateLimit,
  getRolePermissions
};