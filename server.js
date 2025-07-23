require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
if (process.env.NODE_ENV !== 'test') {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri) {
    mongoose.connect(mongoUri)
      .then(() => console.log('✅ MongoDB connected successfully'))
      .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        console.log('⚠️ Using in-memory database instead');
      });
  } else {
    console.log('⚠️ No MongoDB URI provided, using in-memory database');
  }
}

// Load routes
const authRoutes = require('./routes/auth');
const offerRoutes = require('./routes/offer');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/offers', offerRoutes);

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'frontend/build')));

// API health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Last Mile API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API 404 handler (only for API routes)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `API route ${req.originalUrl} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString()
    }
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      code: err.code || 'INTERNAL_SERVER_ERROR',
      statusCode: err.statusCode || 500,
      timestamp: new Date().toISOString()
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;