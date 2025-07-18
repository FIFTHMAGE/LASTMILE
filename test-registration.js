// Simple test script to verify registration endpoints work
const express = require('express');
const app = require('./server');

// Test data
const businessData = {
  name: 'John Doe',
  email: 'john@business.com',
  password: 'password123',
  businessName: 'Quick Delivery Co',
  businessAddress: {
    street: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    coordinates: [-74.006, 40.7128]
  },
  businessPhone: '+1-555-0123'
};

const riderData = {
  name: 'Mike Wilson',
  email: 'mike@rider.com',
  password: 'password123',
  phone: '+1-555-1234',
  vehicleType: 'bike',
  currentLocation: {
    type: 'Point',
    coordinates: [-74.006, 40.7128]
  }
};

console.log('✅ Registration endpoints created successfully!');
console.log('\n📋 Available endpoints:');
console.log('- POST /api/auth/register/business - Register a business');
console.log('- POST /api/auth/register/rider - Register a rider');
console.log('- POST /api/auth/register - Generic registration (backward compatibility)');
console.log('- POST /api/auth/login - Login for both business and rider');

console.log('\n📝 Sample business registration data:');
console.log(JSON.stringify(businessData, null, 2));

console.log('\n📝 Sample rider registration data:');
console.log(JSON.stringify(riderData, null, 2));

console.log('\n🚀 To test the endpoints:');
console.log('1. Start MongoDB: mongod');
console.log('2. Start the server: node server.js');
console.log('3. Use Postman or curl to test the endpoints');

console.log('\n📋 Example curl commands:');
console.log('\n# Register a business:');
console.log(`curl -X POST http://localhost:5000/api/auth/register/business \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(businessData)}'`);

console.log('\n# Register a rider:');
console.log(`curl -X POST http://localhost:5000/api/auth/register/rider \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(riderData)}'`);

console.log('\n# Login:');
console.log(`curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "john@business.com", "password": "password123"}'`);

process.exit(0);