require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ErrorHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');
const RateLimiter = require('./middleware/rateLimiter');
const CompressionMiddleware = require('./middleware/compression');
const { cacheStrategies } = require('./services/CacheStrategies');
const { warmCache } = require('./middleware/cacheMiddleware');

const app = express();

// Security and parsing middleware
app.use(cors());

// Response compression
app.use(CompressionMiddleware.api());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Apply rate limiting
const rateLimiter = new RateLimiter({
  trustProxy: process.env.TRUST_PROXY === 'true',
  standardWindowMs: 15 * 60 * 1000, // 15 minutes
  standardMaxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000 // Higher limits in development
});
rateLimiter.applyLimiters(app);

// MongoDB connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));
}

// Initialize Redis cache connection
if (process.env.NODE_ENV !== 'test') {
  cacheStrategies.cache.connect()
    .then(async () => {\n      console.log('✅ Redis cache connected');\n      \n      // Initialize cache integration and warm-up\n      try {\n        const { cacheIntegration } = require('./services/CacheIntegration');\n        await cacheIntegration.warmUpFrequentData();\n        console.log('🔥 Cache warm-up completed');\n        \n        // Set up periodic cache maintenance (every 30 minutes)\n        setInterval(async () => {\n          try {\n            const { performCacheMaintenance } = require('./scripts/initializeCache');\n            await performCacheMaintenance();\n          } catch (maintenanceError) {\n            console.warn('⚠️  Cache maintenance failed:', maintenanceError.message);\n          }\n        }, 30 * 60 * 1000);\n        \n      } catch (warmupError) {\n        console.warn('⚠️  Cache warm-up failed:', warmupError.message);\n      }\n    })
    .catch((err) => console.error('Redis connection error:', err));
}

const authRoutes = require('./routes/auth');
const offerRoutes = require('./routes/offer');
const notificationRoutes = require('./routes/notification');
const earningsRoutes = require('./routes/earnings');
const deliveryRoutes = require('./routes/delivery');
const adminRoutes = require('./routes/admin');
const businessDashboardRoutes = require('./routes/businessDashboard');

app.use('/api/auth', authRoutes);
app.use('/api/offers', warmCache, offerRoutes);
app.use('/api/notifications', warmCache, notificationRoutes);
app.use('/api/earnings', warmCache, earningsRoutes);
app.use('/api/delivery', warmCache, deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', warmCache, businessDashboardRoutes);

app.get('/', (req, res) => {
  res.send('Last Mile API is running');
});

// Error handling middleware (must be last)
const errorHandler = new ErrorHandler();
app.use(ErrorHandler.notFoundHandler()); // Handle 404s
app.use(errorHandler.handle()); // Handle all other errors

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app; 