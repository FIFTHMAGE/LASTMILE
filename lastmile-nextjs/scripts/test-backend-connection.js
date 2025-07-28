#!/usr/bin/env node

/**
 * Backend Connection Diagnostic Script
 * Tests various aspects of the deployed backend
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://lastmile.vercel.app';

// Test endpoints to check
const TEST_ENDPOINTS = [
  '/api/health',
  '/api/auth/login',
  '/api/offers',
  '/api/user/profile'
];

/**
 * Make HTTP request
 */
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Backend-Test-Script/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody,
            rawBody: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: body,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test a single endpoint
 */
async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🔍 Testing: ${url}`);
  
  try {
    const response = await makeRequest(url);
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type'] || 'Not set'}`);
    
    if (response.status === 200) {
      console.log('   ✅ SUCCESS');
      if (response.body) {
        console.log('   Response:', JSON.stringify(response.body, null, 2));
      }
    } else if (response.status === 404) {
      console.log('   ⚠️  NOT FOUND - Endpoint may not exist');
    } else if (response.status === 405) {
      console.log('   ⚠️  METHOD NOT ALLOWED - Try different HTTP method');
    } else if (response.status >= 500) {
      console.log('   ❌ SERVER ERROR');
      console.log('   Error:', response.rawBody);
    } else {
      console.log('   ⚠️  UNEXPECTED STATUS');
      console.log('   Response:', response.rawBody);
    }
    
    return response;
  } catch (error) {
    console.log('   ❌ CONNECTION FAILED');
    console.log('   Error:', error.message);
    return null;
  }
}

/**
 * Test basic connectivity
 */
async function testBasicConnectivity() {
  console.log('🌐 Testing basic connectivity...');
  
  try {
    const response = await makeRequest(BASE_URL);
    console.log(`✅ Base URL accessible (Status: ${response.status})`);
    return true;
  } catch (error) {
    console.log(`❌ Base URL not accessible: ${error.message}`);
    return false;
  }
}

/**
 * Test CORS headers
 */
async function testCORS() {
  console.log('\n🔒 Testing CORS configuration...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/health`, 'OPTIONS');
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };
    
    console.log('CORS Headers:', corsHeaders);
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log('✅ CORS configured');
    } else {
      console.log('⚠️  CORS may not be configured properly');
    }
    
  } catch (error) {
    console.log('❌ CORS test failed:', error.message);
  }
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
  console.log('🚀 LastMile Backend Connection Diagnostics');
  console.log('==========================================');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  // Test basic connectivity
  const isConnectable = await testBasicConnectivity();
  
  if (!isConnectable) {
    console.log('\n❌ Cannot reach the base URL. Check if the deployment is successful.');
    process.exit(1);
  }
  
  // Test CORS
  await testCORS();
  
  // Test each endpoint
  console.log('\n📡 Testing API Endpoints:');
  console.log('========================');
  
  const results = {};
  
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results[endpoint] = result;
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('===========');
  
  const working = Object.entries(results).filter(([_, result]) => 
    result && result.status === 200
  ).length;
  
  const total = TEST_ENDPOINTS.length;
  
  console.log(`Working endpoints: ${working}/${total}`);
  
  if (working === 0) {
    console.log('\n❌ No endpoints are working. Possible issues:');
    console.log('   - Environment variables not set in Vercel');
    console.log('   - Database connection issues');
    console.log('   - Build/deployment errors');
    console.log('   - API routes not properly configured');
  } else if (working < total) {
    console.log('\n⚠️  Some endpoints are not working. Check individual errors above.');
  } else {
    console.log('\n✅ All endpoints are working correctly!');
  }
  
  // Specific recommendations
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('========================');
  console.log('1. Check Vercel deployment logs');
  console.log('2. Verify environment variables in Vercel dashboard');
  console.log('3. Test database connectivity');
  console.log('4. Check API route file structure');
  console.log('5. Verify Next.js configuration');
}

// Run diagnostics
runDiagnostics().catch(console.error);