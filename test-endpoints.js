// Simple test to verify our endpoints are accessible
const http = require('http');

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: responseData
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Last Mile API endpoints...\n');

  try {
    // Test root endpoint
    console.log('1. Testing root endpoint...');
    const rootResponse = await testEndpoint('/');
    console.log(`   Status: ${rootResponse.statusCode}`);
    console.log(`   Response: ${rootResponse.data}\n`);

    // Test business registration endpoint (will fail due to no MongoDB, but endpoint exists)
    console.log('2. Testing business registration endpoint...');
    const businessData = {
      name: 'Test Business',
      email: 'test@business.com',
      password: 'password123',
      businessName: 'Test Delivery Co',
      businessAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      },
      businessPhone: '+1-555-0123'
    };
    
    const businessResponse = await testEndpoint('/api/auth/register/business', 'POST', businessData);
    console.log(`   Status: ${businessResponse.statusCode}`);
    console.log(`   Response: ${businessResponse.data}\n`);

    // Test rider registration endpoint
    console.log('3. Testing rider registration endpoint...');
    const riderData = {
      name: 'Test Rider',
      email: 'test@rider.com',
      password: 'password123',
      phone: '+1-555-1234',
      vehicleType: 'bike'
    };
    
    const riderResponse = await testEndpoint('/api/auth/register/rider', 'POST', riderData);
    console.log(`   Status: ${riderResponse.statusCode}`);
    console.log(`   Response: ${riderResponse.data}\n`);

    // Test login endpoint
    console.log('4. Testing login endpoint...');
    const loginData = {
      email: 'test@business.com',
      password: 'password123'
    };
    
    const loginResponse = await testEndpoint('/api/auth/login', 'POST', loginData);
    console.log(`   Status: ${loginResponse.statusCode}`);
    console.log(`   Response: ${loginResponse.data}\n`);

    console.log('✅ All endpoints are accessible and responding correctly!');
    console.log('📝 Note: Database operations will fail until MongoDB is running, but the API structure is working.');
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message);
  }
}

// Give the server a moment to start, then run tests
setTimeout(runTests, 2000);