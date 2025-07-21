const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Last Mile API is running',
    timestamp: new Date().toISOString() 
  });
});

// Test API
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Simple auth endpoints for testing
app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'Registration endpoint working',
    data: req.body
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login endpoint working',
    token: 'demo-token-123'
  });
});

// Catch all API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Export for Vercel
module.exports = app;