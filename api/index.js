const express = require('express');
const cors = require('cors');
const app = express();

// Basic middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://lastmile-delivery-platform.vercel.app', /\.vercel\.app$/] 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Last Mile API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Test API
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'GET /health'
    ]
  });
});

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, businessName, phone, vehicleType } = req.body;
  
  // Simulate user creation
  const user = {
    id: Date.now(),
    name,
    email,
    role,
    profile: role === 'business' ? { businessName } : { phone, vehicleType },
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'User registered successfully',
    user,
    token: `demo-token-${user.id}`
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Check if credentials match demo accounts
  if (email === 'business@demo.com' && password === 'password123') {
    const user = {
      id: 1001,
      name: 'Demo Business',
      email: 'business@demo.com',
      role: 'business',
      profile: { businessName: 'Demo Business Inc.' }
    };
    
    // Create a simple JWT-like token (for demo purposes)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours expiry
    };
    
    // Base64 encode the token payload to simulate a JWT
    const tokenString = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const token = `demo.${tokenString}.token`;
    
    return res.json({
      success: true,
      message: 'Login successful',
      user,
      token
    });
  } 
  else if (email === 'rider@demo.com' && password === 'password123') {
    const user = {
      id: 1002,
      name: 'Demo Rider',
      email: 'rider@demo.com',
      role: 'rider',
      profile: { phone: '+1234567890', vehicleType: 'bike' }
    };
    
    // Create a simple JWT-like token (for demo purposes)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours expiry
    };
    
    // Base64 encode the token payload to simulate a JWT
    const tokenString = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const token = `demo.${tokenString}.token`;
    
    return res.json({
      success: true,
      message: 'Login successful',
      user,
      token
    });
  }
  else if (email === 'admin@demo.com' && password === 'password123') {
    const user = {
      id: 1003,
      name: 'Demo Admin',
      email: 'admin@demo.com',
      role: 'admin',
      profile: { adminLevel: 'super' }
    };
    
    // Create a simple JWT-like token (for demo purposes)
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours expiry
    };
    
    // Base64 encode the token payload to simulate a JWT
    const tokenString = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const token = `demo.${tokenString}.token`;
    
    return res.json({
      success: true,
      message: 'Login successful',
      user,
      token
    });
  }
  else {
    // Invalid credentials
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  try {
    // For demo tokens, extract the payload
    if (token.startsWith('demo.')) {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // Decode the payload
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Check if token is expired
      if (payload.exp * 1000 < Date.now()) {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      }
      
      // Return user info from token
      const user = {
        id: payload.userId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        profile: payload.role === 'business' 
          ? { businessName: 'Demo Business Inc.' } 
          : payload.role === 'rider'
            ? { phone: '+1234567890', vehicleType: 'bike' }
            : { adminLevel: 'super' }
      };
      
      return res.json({
        success: true,
        user
      });
    } else {
      // For non-demo tokens (should not happen in this demo)
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Offers endpoints
app.get('/api/offers', (req, res) => {
  const offers = [
    {
      id: 1,
      title: 'Package Delivery - Downtown',
      pickup: { address: '123 Main St', coordinates: [-122.4194, 37.7749] },
      delivery: { address: '456 Oak Ave', coordinates: [-122.4094, 37.7849] },
      payment: { amount: 25.00, currency: 'USD' },
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: 'Document Delivery - Urgent',
      pickup: { address: '789 Pine St', coordinates: [-122.4294, 37.7649] },
      delivery: { address: '321 Elm St', coordinates: [-122.4394, 37.7549] },
      payment: { amount: 15.00, currency: 'USD' },
      status: 'open',
      createdAt: new Date().toISOString()
    }
  ];
  
  res.json({
    success: true,
    offers
  });
});

app.post('/api/offers', (req, res) => {
  const offer = {
    id: Date.now(),
    ...req.body,
    status: 'open',
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Offer created successfully',
    offer
  });
});

// Notifications endpoint
app.get('/api/notifications', (req, res) => {
  // Extract user role from token
  const token = req.headers.authorization?.replace('Bearer ', '');
  let userRole = 'business'; // Default role
  
  if (token && token.startsWith('demo.')) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        userRole = payload.role;
      }
    } catch (error) {
      console.error('Error parsing token:', error);
    }
  }
  
  // Current date for timestamps
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  // Generate notifications based on user role
  let notifications = [];
  
  if (userRole === 'admin') {
    // Admin-specific notifications
    notifications = [
      {
        id: 101,
        type: 'system_announcement',
        title: 'System Update Completed',
        message: 'The platform has been updated to version 2.3.0 with new features and bug fixes.',
        read: false,
        createdAt: now.toISOString(),
        priority: 'high'
      },
      {
        id: 102,
        type: 'user_registration',
        title: 'New Business Registration',
        message: 'A new business "Express Logistics" has registered and requires verification.',
        read: false,
        createdAt: yesterday.toISOString(),
        user: {
          id: 2001,
          name: 'Express Logistics',
          email: 'contact@expresslogistics.com'
        }
      },
      {
        id: 103,
        type: 'payment_issue',
        title: 'Payment Processing Error',
        message: 'Multiple failed payment attempts detected for transaction #38291.',
        read: false,
        createdAt: yesterday.toISOString(),
        payment: {
          id: 38291,
          amount: 125.50,
          method: 'credit_card'
        }
      },
      {
        id: 104,
        type: 'platform_metrics',
        title: 'Weekly Performance Report',
        message: 'Platform usage increased by 15% this week. View the full analytics report.',
        read: true,
        createdAt: twoDaysAgo.toISOString(),
        readAt: yesterday.toISOString()
      },
      {
        id: 105,
        type: 'support_ticket',
        title: 'Urgent Support Request',
        message: 'A rider has reported an issue with the GPS tracking feature. Ticket #4582.',
        read: true,
        createdAt: twoDaysAgo.toISOString(),
        readAt: yesterday.toISOString(),
        ticket: {
          id: 4582,
          priority: 'high'
        }
      },
      {
        id: 106,
        type: 'security_alert',
        title: 'Multiple Failed Login Attempts',
        message: 'Multiple failed login attempts detected for admin account. IP: 192.168.1.254',
        read: true,
        createdAt: threeDaysAgo.toISOString(),
        readAt: twoDaysAgo.toISOString(),
        priority: 'critical'
      },
      {
        id: 107,
        type: 'system_announcement',
        title: 'Scheduled Maintenance',
        message: 'The platform will undergo scheduled maintenance on July 25, 2025, from 2:00 AM to 4:00 AM UTC.',
        read: true,
        createdAt: threeDaysAgo.toISOString(),
        readAt: twoDaysAgo.toISOString()
      }
    ];
  } else if (userRole === 'business') {
    // Business-specific notifications
    notifications = [
      {
        id: 1,
        type: 'offer_accepted',
        title: 'Offer Accepted',
        message: 'Your delivery offer has been accepted by a rider',
        read: false,
        createdAt: now.toISOString(),
        offer: {
          id: 12345,
          pickup: 'Downtown',
          delivery: 'Uptown',
          amount: 25.00
        }
      },
      {
        id: 2,
        type: 'delivery_completed',
        title: 'Delivery Completed',
        message: 'Your package has been successfully delivered',
        read: false,
        createdAt: yesterday.toISOString(),
        offer: {
          id: 12344,
          pickup: 'Midtown',
          delivery: 'Suburb',
          amount: 35.50
        }
      },
      {
        id: 3,
        type: 'payment_processed',
        title: 'Payment Processed',
        message: 'Your payment of $35.50 has been processed successfully',
        read: true,
        createdAt: twoDaysAgo.toISOString(),
        readAt: yesterday.toISOString()
      }
    ];
  } else if (userRole === 'rider') {
    // Rider-specific notifications
    notifications = [
      {
        id: 1,
        type: 'new_offer',
        title: 'New Delivery Offer',
        message: 'A new delivery offer is available in your area',
        read: false,
        createdAt: now.toISOString(),
        offer: {
          id: 12345,
          pickup: 'Downtown',
          delivery: 'Uptown',
          amount: 25.00
        }
      },
      {
        id: 2,
        type: 'earnings_update',
        title: 'Weekly Earnings',
        message: 'Your earnings this week: $235.50',
        read: false,
        createdAt: yesterday.toISOString()
      },
      {
        id: 3,
        type: 'system_announcement',
        title: 'App Update Available',
        message: 'A new version of the rider app is available with improved GPS tracking',
        read: true,
        createdAt: twoDaysAgo.toISOString(),
        readAt: yesterday.toISOString()
      }
    ];
  }
  
  // Pagination simulation
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const paginatedNotifications = notifications.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    notifications: paginatedNotifications,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(notifications.length / limit),
      totalNotifications: notifications.length,
      hasNext: endIndex < notifications.length,
      hasPrev: page > 1
    }
  });
});

// Mark notification as read
app.patch('/api/notifications/:notificationId/read', (req, res) => {
  const { notificationId } = req.params;
  
  res.json({
    success: true,
    message: 'Notification marked as read',
    notificationId: parseInt(notificationId)
  });
});

// Mark all notifications as read
app.patch('/api/notifications/mark-all-read', (req, res) => {
  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// Business dashboard endpoint
app.get('/api/business/overview', (req, res) => {
  // Generate realistic business dashboard data
  const currentDate = new Date();
  
  // Overview statistics
  const overview = {
    totalOffers: 42,
    activeOffers: 8,
    newOffersThisMonth: 12,
    completionRate: 92,
    totalSpent: 1250.75,
    thisMonthSpent: 350.25,
    avgDeliveryTime: 32,
    onTimeRate: 95
  };
  
  // Recent offers
  const recentOffers = [
    {
      id: 1001,
      title: 'Urgent Document Delivery',
      status: 'delivered',
      createdAt: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      pickup: { address: 'Downtown Office, New York' },
      payment: { amount: 35.50 },
      rider: { name: 'John Smith', rating: 4.8 }
    },
    {
      id: 1002,
      title: 'Package Delivery to Client',
      status: 'in_transit',
      createdAt: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      pickup: { address: 'Main St Office, Brooklyn' },
      payment: { amount: 28.75 },
      rider: { name: 'Maria Rodriguez', rating: 4.9 }
    },
    {
      id: 1003,
      title: 'Express Parcel Delivery',
      status: 'accepted',
      createdAt: new Date().toISOString(),
      pickup: { address: 'Corporate HQ, Manhattan' },
      payment: { amount: 42.00 }
    },
    {
      id: 1004,
      title: 'Same-day Document Delivery',
      status: 'open',
      createdAt: new Date().toISOString(),
      pickup: { address: 'Financial District, Manhattan' },
      payment: { amount: 30.00 }
    }
  ];
  
  // Monthly trends
  const monthlyTrends = [
    {
      month: 'July',
      offers: 15,
      totalSpent: 425.50,
      completionRate: 93
    },
    {
      month: 'June',
      offers: 12,
      totalSpent: 380.25,
      completionRate: 91
    },
    {
      month: 'May',
      offers: 18,
      totalSpent: 520.75,
      completionRate: 94
    }
  ];
  
  res.json({
    success: true,
    data: {
      overview,
      recentOffers,
      monthlyTrends
    }
  });
});

// Admin endpoints
app.get('/api/admin/stats', (req, res) => {
  // Generate realistic statistics for the admin dashboard
  const currentDate = new Date();
  const days = 7;
  
  // Generate daily data for the past week
  const dailyData = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - i);
    
    // Generate increasing trend with some randomness
    const baseRevenue = 600 + (i * 200);
    const revenue = i === days - 1 
      ? baseRevenue + 600 // Big jump on last day
      : baseRevenue + Math.floor(Math.random() * 100);
    
    const baseOffers = 20 + (i * 5);
    const offers = baseOffers + Math.floor(Math.random() * 10);
    
    dailyData.push({
      date: date.toISOString().split('T')[0],
      formattedDate: format(date, 'MMM dd'),
      offers,
      revenue,
      users: Math.floor(Math.random() * 10) + 5
    });
  }
  
  // Format date function
  function format(date, formatStr) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    return formatStr.replace('MMM', months[date.getMonth()]).replace('dd', day);
  }
  
  const stats = {
    users: {
      total: 256,
      businesses: 87,
      riders: 169,
      active: 142,
      newThisMonth: 24
    },
    offers: {
      total: 1893,
      open: 42,
      inProgress: 28,
      completed: 1782,
      cancelled: 41,
      completionRate: 94
    },
    payments: {
      totalVolume: 47850,
      thisMonth: 12450,
      avgOrderValue: 25.28,
      platformRevenue: 4785
    },
    performance: {
      avgDeliveryTime: 28,
      avgRiderRating: 4.7,
      avgBusinessRating: 4.5
    },
    charts: {
      daily: dailyData
    }
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// Catch all API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.originalUrl} not found`
  });
});

// Export for Vercel
module.exports = app;