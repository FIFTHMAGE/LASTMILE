const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LocationTracking = require('../models/LocationTracking');
const { 
  auth, 
  requireRole, 
  dashboardRouter, 
  generateToken, 
  authRateLimit 
} = require('../middleware/auth');
const { cacheStrategies } = require('../services/CacheStrategies');

const router = express.Router();

// Business Registration
router.post('/register/business', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      businessName, 
      businessAddress, 
      businessPhone 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !businessName || !businessAddress || !businessPhone) {
      return res.status(400).json({ 
        message: 'All fields are required',
        required: ['name', 'email', 'password', 'businessName', 'businessAddress', 'businessPhone']
      });
    }

    // Validate business address structure
    if (!businessAddress.street || !businessAddress.city || !businessAddress.state || !businessAddress.zipCode) {
      return res.status(400).json({ 
        message: 'Complete business address is required',
        required: ['street', 'city', 'state', 'zipCode']
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create business user
    const user = new User({ 
      name, 
      email, 
      password: hashed, 
      role: 'business',
      profile: {
        businessName,
        businessAddress: {
          street: businessAddress.street,
          city: businessAddress.city,
          state: businessAddress.state,
          zipCode: businessAddress.zipCode,
          coordinates: businessAddress.coordinates || []
        },
        businessPhone
      }
    });

    // Validate profile before saving
    const validationErrors = user.validateProfile();
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Profile validation failed',
        errors: validationErrors
      });
    }

    await user.save();
    
    res.status(201).json({ 
      message: 'Business registered successfully',
      user: user.getProfileData()
    });
  } catch (err) {
    console.error('Business registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Rider Registration
router.post('/register/rider', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      vehicleType,
      currentLocation
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !vehicleType) {
      return res.status(400).json({ 
        message: 'All fields are required',
        required: ['name', 'email', 'password', 'phone', 'vehicleType']
      });
    }

    // Validate vehicle type
    const validVehicleTypes = ['bike', 'scooter', 'car', 'van'];
    if (!validVehicleTypes.includes(vehicleType)) {
      return res.status(400).json({ 
        message: 'Invalid vehicle type',
        validTypes: validVehicleTypes
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create rider user
    const user = new User({ 
      name, 
      email, 
      password: hashed, 
      role: 'rider',
      profile: {
        phone,
        vehicleType,
        currentLocation: currentLocation || {
          type: 'Point',
          coordinates: []
        },
        isAvailable: true,
        rating: 5.0,
        completedDeliveries: 0
      }
    });

    // Validate profile before saving
    const validationErrors = user.validateProfile();
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Profile validation failed',
        errors: validationErrors
      });
    }

    await user.save();
    
    res.status(201).json({ 
      message: 'Rider registered successfully',
      user: user.getProfileData()
    });
  } catch (err) {
    console.error('Rider registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Generic Register (for backward compatibility)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        message: 'All fields are required. For complete registration, use /register/business or /register/rider endpoints',
        endpoints: {
          business: '/api/auth/register/business',
          rider: '/api/auth/register/rider'
        }
      });
    }
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, role });
    await user.save();
    
    res.status(201).json({ 
      message: 'Basic user registered. Please complete your profile.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      nextStep: `Complete your profile at /api/auth/register/${role}`
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login with enhanced role-specific dashboard data and rate limiting
router.post('/login', authRateLimit(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required',
        error: 'MISSING_CREDENTIALS'
      });
    }

    // Try to get user from cache first
    let user = await cacheStrategies.getUserAuth(email);
    if (!user) {
      // If not in cache, get from database
      user = await User.findOne({ email });
      if (user) {
        // Cache the user auth data for future logins
        await cacheStrategies.setUserAuth(email, {
          _id: user._id,
          email: user.email,
          password: user.password,
          role: user.role,
          isVerified: user.isVerified,
          name: user.name
        });
      }
    }
    
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ 
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }
    
    // Generate enhanced JWT token with role-specific claims
    const token = generateToken(user);
    
    // Get role-specific profile data
    const profileData = user.getProfileData();
    
    // Enhanced role-specific dashboard routing information
    const dashboardInfo = {
      business: {
        defaultRoute: '/business/dashboard',
        availableRoutes: [
          '/business/dashboard',
          '/business/offers',
          '/business/offers/create',
          '/business/offers/:id',
          '/business/payments',
          '/business/profile',
          '/business/notifications'
        ],
        permissions: {
          canCreateOffers: true,
          canViewOwnOffers: true,
          canTrackDeliveries: true,
          canMakePayments: true,
          canViewPaymentHistory: true
        },
        quickActions: [
          { label: 'Post New Offer', route: '/business/offers/create', icon: 'plus' },
          { label: 'View Active Offers', route: '/business/offers', icon: 'list' },
          { label: 'Payment History', route: '/business/payments', icon: 'credit-card' },
          { label: 'Update Profile', route: '/business/profile', icon: 'user' }
        ]
      },
      rider: {
        defaultRoute: '/rider/dashboard',
        availableRoutes: [
          '/rider/dashboard',
          '/rider/offers',
          '/rider/deliveries',
          '/rider/earnings',
          '/rider/profile',
          '/rider/notifications',
          '/rider/tracking'
        ],
        permissions: {
          canViewOffers: true,
          canAcceptOffers: true,
          canUpdateDeliveryStatus: true,
          canUpdateLocation: true,
          canViewEarnings: true
        },
        quickActions: [
          { label: 'Find Offers', route: '/rider/offers', icon: 'search' },
          { label: 'View Deliveries', route: '/rider/deliveries', icon: 'truck' },
          { label: 'Check Earnings', route: '/rider/earnings', icon: 'dollar-sign' },
          { label: 'Update Availability', route: '/rider/profile', icon: 'toggle-on' }
        ]
      }
    };
    
    // Role-specific welcome message and next steps
    const welcomeData = {
      business: {
        message: `Welcome back, ${user.name}! Ready to manage your deliveries?`,
        nextSteps: [
          'Check your active offers',
          'Review recent delivery updates',
          'Post new delivery requests'
        ]
      },
      rider: {
        message: `Welcome back, ${user.name}! Ready to start earning?`,
        nextSteps: [
          'Update your availability status',
          'Check nearby delivery offers',
          'Review your recent earnings'
        ]
      }
    };
    
    res.json({ 
      success: true,
      token,
      user: profileData,
      dashboard: dashboardInfo[user.role],
      welcome: welcomeData[user.role],
      loginTime: new Date().toISOString(),
      sessionInfo: {
        expiresIn: '7 days',
        tokenType: 'Bearer',
        refreshAvailable: true
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      message: 'Server error during login',
      error: 'LOGIN_SERVER_ERROR'
    });
  }
});

// Enhanced Business dashboard data endpoint with role-specific routing
router.get('/dashboard/business', auth, requireRole('business'), dashboardRouter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get business-specific dashboard data
    const dashboardData = {
      profile: user.getProfileData(),
      stats: {
        totalOffers: 0, // Will be populated when we implement offers
        activeOffers: 0,
        completedOffers: 0,
        totalSpent: 0
      },
      recentActivity: [],
      quickActions: [
        { label: 'Post New Offer', route: '/business/offers/create' },
        { label: 'View Active Offers', route: '/business/offers' },
        { label: 'Payment History', route: '/business/payments' },
        { label: 'Update Profile', route: '/business/profile' }
      ]
    };

    res.json(dashboardData);
  } catch (err) {
    console.error('Business dashboard error:', err);
    res.status(500).json({ message: 'Server error loading dashboard' });
  }
});

// Enhanced Rider dashboard data endpoint with role-specific routing
router.get('/dashboard/rider', auth, requireRole('rider'), dashboardRouter, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get rider-specific dashboard data
    const dashboardData = {
      profile: user.getProfileData(),
      stats: {
        totalEarnings: 0, // Will be populated when we implement payments
        completedDeliveries: user.profile.completedDeliveries || 0,
        currentRating: user.profile.rating || 5.0,
        availableOffers: 0 // Will be populated when we implement nearby offers
      },
      availability: {
        isAvailable: user.profile.isAvailable || false,
        currentLocation: user.profile.currentLocation
      },
      recentActivity: [],
      quickActions: [
        { label: 'Find Offers', route: '/rider/offers' },
        { label: 'View Deliveries', route: '/rider/deliveries' },
        { label: 'Check Earnings', route: '/rider/earnings' },
        { label: 'Update Availability', route: '/rider/profile' }
      ]
    };

    res.json(dashboardData);
  } catch (err) {
    console.error('Rider dashboard error:', err);
    res.status(500).json({ message: 'Server error loading dashboard' });
  }
});

// Update rider availability
router.patch('/rider/availability', auth, requireRole('rider'), async (req, res) => {
  try {
    const { isAvailable, currentLocation } = req.body;
    
    const updateData = {};
    if (typeof isAvailable === 'boolean') {
      updateData['profile.isAvailable'] = isAvailable;
    }
    if (currentLocation && currentLocation.coordinates) {
      updateData['profile.currentLocation'] = currentLocation;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      message: 'Availability updated successfully',
      availability: {
        isAvailable: user.profile.isAvailable,
        currentLocation: user.profile.currentLocation
      }
    });
  } catch (err) {
    console.error('Update availability error:', err);
    res.status(500).json({ message: 'Server error updating availability' });
  }
});

// Real-time location tracking endpoints

// Update rider location with detailed tracking
router.post('/rider/location', auth, requireRole('rider'), async (req, res) => {
  try {
    const {
      coordinates,
      accuracy,
      altitude,
      heading,
      speed,
      batteryLevel,
      deviceInfo,
      offerId,
      trackingType
    } = req.body;

    // Validate required fields
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        message: 'Valid coordinates array [lng, lat] is required',
        example: { coordinates: [-74.006, 40.7128] }
      });
    }

    const locationData = {
      coordinates,
      accuracy,
      altitude,
      heading,
      speed,
      batteryLevel,
      deviceInfo,
      offerId,
      trackingType
    };

    const locationRecord = await LocationTracking.updateRiderLocation(req.user.id, locationData);

    res.json({
      message: 'Location updated successfully',
      location: locationRecord.getLocationSummary(),
      timestamp: locationRecord.timestamp
    });
  } catch (err) {
    console.error('Location update error:', err);
    res.status(500).json({ 
      message: 'Server error updating location',
      error: err.message 
    });
  }
});

// Get rider's location history
router.get('/rider/location/history', auth, requireRole('rider'), async (req, res) => {
  try {
    const {
      limit = 50,
      startTime,
      endTime,
      offerId
    } = req.query;

    const options = {
      limit: Math.min(parseInt(limit), 200), // Max 200 records
      startTime,
      endTime,
      offerId
    };

    const locationHistory = await LocationTracking.getRiderLocationHistory(req.user.id, options);

    res.json({
      locations: locationHistory.map(loc => loc.getLocationSummary()),
      count: locationHistory.length,
      filters: options
    });
  } catch (err) {
    console.error('Location history error:', err);
    res.status(500).json({ message: 'Server error fetching location history' });
  }
});

// Start tracking for a specific delivery
router.post('/rider/tracking/start/:offerId', auth, requireRole('rider'), async (req, res) => {
  try {
    const { offerId } = req.params;
    const { coordinates, trackingType = 'heading_to_pickup' } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        message: 'Valid coordinates array [lng, lat] is required to start tracking'
      });
    }

    const locationData = {
      coordinates,
      offerId,
      trackingType,
      deviceInfo: {
        platform: req.headers['x-platform'] || 'unknown',
        version: req.headers['x-app-version'] || 'unknown',
        userAgent: req.headers['user-agent']
      }
    };

    const locationRecord = await LocationTracking.updateRiderLocation(req.user.id, locationData);

    res.json({
      message: 'Delivery tracking started',
      tracking: locationRecord.getLocationSummary(),
      offerId
    });
  } catch (err) {
    console.error('Start tracking error:', err);
    res.status(500).json({ message: 'Server error starting tracking' });
  }
});

// Stop tracking for a specific delivery
router.post('/rider/tracking/stop/:offerId', auth, requireRole('rider'), async (req, res) => {
  try {
    const { offerId } = req.params;

    await LocationTracking.deactivateTracking(req.user.id, offerId);

    res.json({
      message: 'Delivery tracking stopped',
      offerId
    });
  } catch (err) {
    console.error('Stop tracking error:', err);
    res.status(500).json({ message: 'Server error stopping tracking' });
  }
});

// Update tracking status during delivery
router.patch('/rider/tracking/status/:offerId', auth, requireRole('rider'), async (req, res) => {
  try {
    const { offerId } = req.params;
    const { trackingType, coordinates } = req.body;

    const validTrackingTypes = ['idle', 'heading_to_pickup', 'at_pickup', 'heading_to_delivery', 'at_delivery'];
    if (!validTrackingTypes.includes(trackingType)) {
      return res.status(400).json({
        message: 'Invalid tracking type',
        validTypes: validTrackingTypes
      });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        message: 'Valid coordinates array [lng, lat] is required'
      });
    }

    const locationData = {
      coordinates,
      offerId,
      trackingType
    };

    const locationRecord = await LocationTracking.updateRiderLocation(req.user.id, locationData);

    res.json({
      message: 'Tracking status updated',
      tracking: locationRecord.getLocationSummary()
    });
  } catch (err) {
    console.error('Update tracking status error:', err);
    res.status(500).json({ message: 'Server error updating tracking status' });
  }
});

// Business: Get delivery tracking for an offer
router.get('/business/tracking/:offerId', auth, requireRole('business'), async (req, res) => {
  try {
    const { offerId } = req.params;

    // Verify the business owns this offer
    const Offer = require('../models/Offer');
    const offer = await Offer.findOne({ _id: offerId, business: req.user.id });
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found or not authorized' });
    }

    const trackingData = await LocationTracking.getDeliveryTracking(offerId);

    res.json({
      offer: {
        id: offer._id,
        title: offer.title,
        status: offer.status,
        acceptedBy: offer.acceptedBy
      },
      tracking: trackingData.map(loc => loc.getLocationSummary()),
      lastUpdate: trackingData.length > 0 ? trackingData[0].timestamp : null
    });
  } catch (err) {
    console.error('Get delivery tracking error:', err);
    res.status(500).json({ message: 'Server error fetching delivery tracking' });
  }
});

// Get nearby active riders (for businesses or admin)
router.get('/riders/nearby', auth, async (req, res) => {
  try {
    const { lng, lat, radius = 10000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        message: 'Longitude and latitude are required',
        example: '/api/auth/riders/nearby?lng=-74.006&lat=40.7128'
      });
    }

    const coordinates = [parseFloat(lng), parseFloat(lat)];
    const radiusInMeters = parseInt(radius);

    const activeRiders = await LocationTracking.getActiveRiders(coordinates, radiusInMeters);

    res.json({
      riders: activeRiders.map(rider => ({
        id: rider._id,
        riderId: rider.rider,
        riderInfo: rider.riderInfo[0],
        location: {
          coordinates: rider.currentLocation.coordinates,
          accuracy: rider.accuracy,
          heading: rider.heading,
          speed: rider.speed,
          trackingType: rider.trackingType,
          timestamp: rider.timestamp
        },
        distance: Math.round(rider.distance)
      })),
      searchArea: {
        center: coordinates,
        radius: radiusInMeters
      },
      count: activeRiders.length
    });
  } catch (err) {
    console.error('Get nearby riders error:', err);
    res.status(500).json({ message: 'Server error fetching nearby riders' });
  }
});

// Calculate distance traveled for a delivery
router.get('/rider/tracking/distance/:offerId', auth, requireRole('rider'), async (req, res) => {
  try {
    const { offerId } = req.params;
    const { startTime } = req.query;

    if (!startTime) {
      return res.status(400).json({
        message: 'Start time is required',
        example: '?startTime=2024-01-15T10:00:00Z'
      });
    }

    const distanceTraveled = await LocationTracking.calculateDistanceTraveled(
      req.user.id,
      offerId,
      new Date(startTime)
    );

    res.json({
      offerId,
      distanceTraveled,
      unit: 'meters',
      startTime: new Date(startTime)
    });
  } catch (err) {
    console.error('Calculate distance error:', err);
    res.status(500).json({ message: 'Server error calculating distance' });
  }
});

// Token refresh endpoint
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        message: 'Refresh token is required',
        error: 'MISSING_REFRESH_TOKEN'
      });
    }

    // For now, we'll use the same secret. In production, use a separate refresh secret
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Get user and generate new access token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: 'Invalid refresh token - user not found',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new access token
    const newAccessToken = generateToken(user);
    
    res.json({
      success: true,
      token: newAccessToken,
      tokenType: 'Bearer',
      expiresIn: '7 days',
      refreshedAt: new Date().toISOString()
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Refresh token has expired. Please login again.',
        error: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({
      message: 'Invalid refresh token',
      error: 'INVALID_REFRESH_TOKEN'
    });
  }
});

// Role-specific route validation endpoint
router.get('/validate-route', auth, dashboardRouter, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role,
      isVerified: req.user.isVerified
    },
    route: req.path,
    permissions: req.permissions,
    dashboardInfo: req.dashboardInfo,
    message: 'Route access validated successfully'
  });
});

// Get user permissions endpoint
router.get('/permissions', auth, (req, res) => {
  const { getRolePermissions } = require('../middleware/auth');
  
  res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role,
      isVerified: req.user.isVerified
    },
    permissions: getRolePermissions(req.user.role),
    timestamp: new Date().toISOString()
  });
});

// Logout endpoint (for token blacklisting in future)
router.post('/logout', auth, (req, res) => {
  // In a production environment, you would add the token to a blacklist
  // For now, we'll just return a success response
  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 