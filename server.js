require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ErrorHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');

const app = express();

// Security and parsing middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// MongoDB connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));
}

const authRoutes = require('./routes/auth');
const offerRoutes = require('./routes/offer');
const notificationRoutes = require('./routes/notification');
const earningsRoutes = require('./routes/earnings');
const deliveryRoutes = require('./routes/delivery');

app.use('/api/auth', authRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/delivery', deliveryRoutes);

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