#!/usr/bin/env node
/**
 * Simple Test Server for Login Debugging
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  isVerified: { type: Boolean, default: false },
  profile: Object
});

const User = mongoose.model('User', userSchema);

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  console.log('\n🔍 LOGIN REQUEST RECEIVED');
  console.log('Body:', req.body);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        message: 'Email and password are required',
        error: 'MISSING_CREDENTIALS'
      });
    }

    console.log('Looking for user:', email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      // List all users for debugging
      const allUsers = await User.find({}, 'email role');
      console.log('Available users:', allUsers.map(u => ({ email: u.email, role: u.role })));
      
      return res.status(400).json({ 
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ User found:', {
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    console.log('Checking password...');
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch');
      return res.status(400).json({ 
        message: 'Invalid credentials',
        error: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✅ Password matches');

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    console.log('✅ Token generated');

    const response = {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      }
    };

    console.log('✅ Login successful for:', email);
    res.json(response);

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: 'LOGIN_SERVER_ERROR'
    });
  }
});

// List all users (for debugging)
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email role isVerified');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create demo user endpoint
app.post('/api/debug/create-demo', async (req, res) => {
  try {
    // Clear existing demo users
    await User.deleteMany({ 
      email: { $in: ['business@demo.com', 'rider@demo.com', 'admin@demo.com'] }
    });

    const demoUsers = [
      {
        name: 'Demo Business',
        email: 'business@demo.com',
        password: await bcrypt.hash('demo123', 10),
        role: 'business',
        isVerified: true,
        profile: { businessName: 'Demo Co' }
      },
      {
        name: 'Demo Rider',
        email: 'rider@demo.com',
        password: await bcrypt.hash('demo123', 10),
        role: 'rider',
        isVerified: true,
        profile: { phone: '+1-555-RIDE', vehicleType: 'bike' }
      }
    ];

    const createdUsers = await User.insertMany(demoUsers);
    
    res.json({ 
      message: 'Demo users created',
      users: createdUsers.map(u => ({ email: u.email, role: u.role }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Test server running on http://localhost:${PORT}`);
    console.log(`📋 Test endpoints:`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Login: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   Users: http://localhost:${PORT}/api/debug/users`);
    console.log(`   Create Demo: POST http://localhost:${PORT}/api/debug/create-demo`);
    console.log('');
    console.log('📧 Demo credentials:');
    console.log('   business@demo.com / demo123');
    console.log('   rider@demo.com / demo123');
  });
}

startServer().catch(console.error);