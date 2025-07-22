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
  const notifications = [
    {
      id: 1,
      type: 'offer_accepted',
      title: 'Offer Accepted',
      message: 'Your delivery offer has been accepted by a rider',
      read: false,
      createdAt: new Date().toISOString()
    }
  ];
  
  res.json({
    success: true,
    notifications
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