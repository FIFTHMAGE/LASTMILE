#!/usr/bin/env node
/**
 * Test Login API Directly
 */

const axios = require('axios');

async function testLoginAPI() {
  const baseURL = 'http://localhost:5000';
  
  console.log('🧪 Testing Login API...\n');

  // Test data
  const testCredentials = [
    { email: 'business@demo.com', password: 'demo123', role: 'business' },
    { email: 'rider@demo.com', password: 'demo123', role: 'rider' },
    { email: 'admin@demo.com', password: 'demo123', role: 'admin' }
  ];

  for (const creds of testCredentials) {
    console.log(`Testing ${creds.role} login...`);
    console.log(`Email: ${creds.email}`);
    console.log(`Password: ${creds.password}`);

    try {
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email: creds.email,
        password: creds.password
      });

      console.log('✅ Login successful!');
      console.log('Response:', {
        success: response.data.success,
        user: response.data.user?.email,
        role: response.data.user?.role,
        token: response.data.token ? 'Present' : 'Missing'
      });

    } catch (error) {
      console.log('❌ Login failed!');
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Error:', error.response.data);
      } else {
        console.log('Network Error:', error.message);
      }
    }
    console.log('');
  }

  // Test health endpoint
  console.log('Testing health endpoint...');
  try {
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    await axios.get('http://localhost:5000/api/health');
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:5000');
    console.log('Please start the server first:');
    console.log('  npm start');
    console.log('  or');
    console.log('  node server.js');
    return;
  }

  await testLoginAPI();
}

main().catch(console.error);