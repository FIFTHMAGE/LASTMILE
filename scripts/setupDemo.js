/**
 * Setup script to create demo users via API endpoints
 * This bypasses database connection issues by using the registration API
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Demo user data for API registration
const demoUsers = [
  {
    name: 'Demo Business',
    email: 'business@demo.com',
    password: 'password123',
    role: 'business',
    profile: {
      businessName: 'Demo Delivery Company',
      businessAddress: {
        street: '123 Business Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        coordinates: [-74.006, 40.7128]
      },
      businessPhone: '(555) 123-4567'
    }
  },
  {
    name: 'Demo Rider',
    email: 'rider@demo.com',
    password: 'password123',
    role: 'rider',
    profile: {
      phone: '(555) 987-6543',
      vehicleType: 'bike',
      currentLocation: {
        type: 'Point',
        coordinates: [-74.006, 40.7128]
      }
    }
  },
  {
    name: 'Demo Admin',
    email: 'admin@demo.com',
    password: 'password123',
    role: 'admin',
    profile: {}
  }
];

async function setupDemoUsers() {
  console.log('🚀 Setting up demo users via API...\n');

  for (const userData of demoUsers) {
    try {
      console.log(`Creating ${userData.role}: ${userData.email}`);
      
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log(`✅ Created: ${userData.email}`);
      } else {
        console.log(`⚠️  Issue with ${userData.email}:`, response.data.message);
      }

    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`ℹ️  User ${userData.email} already exists`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Cannot connect to API server at ${API_BASE_URL}`);
        console.log('   Make sure the backend server is running with: npm start');
        break;
      } else {
        console.log(`❌ Error creating ${userData.email}:`, error.response?.data?.error?.message || error.message);
      }
    }
  }

  console.log('\n🎉 Demo setup complete!');
  console.log('\nDemo Credentials:');
  console.log('📧 Business: business@demo.com / password123');
  console.log('🚴 Rider: rider@demo.com / password123');
  console.log('👨‍💼 Admin: admin@demo.com / password123');
  console.log('\nYou can now test the frontend at http://localhost:3000');
}

// Test API connection first
async function testConnection() {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/`, { timeout: 5000 });
    console.log('✅ Backend server is running');
    return true;
  } catch (error) {
    console.log('❌ Backend server is not running');
    console.log('   Please start the backend server first with: npm start');
    console.log('   Then run this script again.');
    return false;
  }
}

// Run the setup
async function main() {
  console.log('🔍 Checking backend server connection...');
  const isConnected = await testConnection();
  
  if (isConnected) {
    await setupDemoUsers();
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupDemoUsers, testConnection };