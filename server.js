require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
// const ErrorHandler = require('./middleware/errorHandler').ErrorHandler;
const { sanitizeInput } = require('./middleware/validation');
const { rateLimiters } = require('./middleware/rateLimiter');
const CompressionMiddleware = require('./middleware/compression');
const { cacheStrategies } = require('./services/CacheStrategies');
const { warmCache } = require('./middleware/cacheMiddleware');
const { detectVersion, handleCompatibility, getVersionInfo, getMigrationGuide, versionedRoute } = require('./middleware/versioning');

const app = express();

// Security and parsing middleware
app.use(cors());

// Response compression
app.use(CompressionMiddleware.api());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Apply versioning middleware
app.use('/api', detectVersion);
app.use('/api', handleCompatibility);

// Apply rate limiting
app.use('/api/', rateLimiters.general);

// MongoDB connection
if (process.env.NODE_ENV !== 'test') {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));
}

// Initialize Redis cache connection
if (process.env.NODE_ENV !== 'test') {
  cacheStrategies.cache.connect()
    .then(async () => {
      console.log('✅ Redis cache connected');
      
      // Initialize cache integration and warm-up
      try {
        const { cacheIntegration } = require('./services/CacheIntegration');
        await cacheIntegration.warmUpFrequentData();
        console.log('🔥 Cache warm-up completed');
        
        // Set up periodic cache maintenance (every 30 minutes)
        setInterval(async () => {
          try {
            const { performCacheMaintenance } = require('./scripts/initializeCache');
            await performCacheMaintenance();
          } catch (maintenanceError) {
            console.warn('⚠️  Cache maintenance failed:', maintenanceError.message);
          }
        }, 30 * 60 * 1000);
        
      } catch (warmupError) {
        console.warn('⚠️  Cache warm-up failed:', warmupError.message);
      }
    })
    .catch((err) => console.error('Redis connection error:', err));
}

// Load current version routes
const authRoutes = require('./routes/auth');
const offerRoutes = require('./routes/offer');
const notificationRoutes = require('./routes/notification');
const earningsRoutes = require('./routes/earnings');
const deliveryRoutes = require('./routes/delivery');
const adminRoutes = require('./routes/admin');
const businessDashboardRoutes = require('./routes/businessDashboard');
const riderDashboardRoutes = require('./routes/riderDashboard');

// Load version-specific routes
const authV1Routes = require('./routes/versions/v1/auth');
const authV2Routes = require('./routes/versions/v2/auth');
const offerV1Routes = require('./routes/versions/v1/offer');
const offerV2Routes = require('./routes/versions/v2/offer');

// Version information and migration endpoints
app.get('/api/version', getVersionInfo);
app.get('/api/migration', getMigrationGuide);

// Version-specific authentication routes
app.use('/api/v1/auth', authV1Routes);
app.use('/api/v2/auth', authV2Routes);

// Version-specific offer routes
app.use('/api/v1/offers', offerV1Routes);
app.use('/api/v2/offers', offerV2Routes);

// Default routes (fallback to current routes)
app.use('/api/auth', authRoutes);
app.use('/api/offers', offerRoutes);

// Current version routes (default to v1)
app.use('/api/offers', warmCache, offerRoutes);
app.use('/api/notifications', warmCache, notificationRoutes);
app.use('/api/earnings', warmCache, earningsRoutes);
app.use('/api/delivery', warmCache, deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', warmCache, businessDashboardRoutes);
app.use('/api/rider', warmCache, riderDashboardRoutes);

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
app.use('/api/*', (req, res, next) => {
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

// Serve React app for all non-API routes (must be after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  const response = {
    success: false,
    error: {
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
      code: err.code || 'INTERNAL_SERVER_ERROR',
      statusCode: err.statusCode || 500,
      timestamp: new Date().toISOString()
    }
  };

  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(err.statusCode || 500).json(response);
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app; 