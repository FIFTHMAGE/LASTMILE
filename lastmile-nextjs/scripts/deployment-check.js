#!/usr/bin/env node

/**
 * Post-deployment health check script
 */

const https = require('https');
const http = require('http');

const DEPLOYMENT_URL = process.env.VERCEL_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

console.log('🔍 LastMile Delivery - Deployment Health Check\n');
console.log(`Checking deployment at: ${DEPLOYMENT_URL}\n`);

const healthChecks = [
  {
    name: 'Homepage',
    path: '/',
    expectedStatus: 200
  },
  {
    name: 'Health Check API',
    path: '/api/health',
    expectedStatus: 200
  },
  {
    name: 'Login Page',
    path: '/login',
    expectedStatus: 200
  },
  {
    name: 'Register Page',
    path: '/register',
    expectedStatus: 200
  },
  {
    name: 'Auth API',
    path: '/api/auth/login',
    expectedStatus: 405, // Method not allowed for GET
    method: 'GET'
  }
];

function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      timeout: 10000,
      headers: {
        'User-Agent': 'LastMile-Deployment-Check/1.0'
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runHealthChecks() {
  const results = [];
  
  for (const check of healthChecks) {
    try {
      console.log(`Checking ${check.name}...`);
      const url = `${DEPLOYMENT_URL}${check.path}`;
      const response = await makeRequest(url, check.method || 'GET');
      
      const passed = response.statusCode === check.expectedStatus;
      results.push({
        ...check,
        passed,
        actualStatus: response.statusCode,
        responseTime: Date.now()
      });
      
      console.log(`  ${passed ? '✅' : '❌'} ${check.name} - Status: ${response.statusCode} (expected: ${check.expectedStatus})`);
      
    } catch (error) {
      results.push({
        ...check,
        passed: false,
        error: error.message
      });
      
      console.log(`  ❌ ${check.name} - Error: ${error.message}`);
    }
  }

  return results;
}

async function checkDatabaseConnection() {
  try {
    console.log('\nChecking database connection...');
    const url = `${DEPLOYMENT_URL}/api/health`;
    const response = await makeRequest(url);
    
    if (response.statusCode === 200) {
      console.log('  ✅ Database connection check passed');
      return true;
    } else {
      console.log('  ❌ Database connection check failed');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Database connection check error: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    const healthResults = await runHealthChecks();
    const dbResult = await checkDatabaseConnection();
    
    console.log('\n📊 Deployment Health Summary');
    console.log('=' .repeat(50));
    
    const passedChecks = healthResults.filter(result => result.passed).length;
    const totalChecks = healthResults.length;
    const successRate = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`✅ Health Checks: ${passedChecks}/${totalChecks} passed (${successRate}%)`);
    console.log(`${dbResult ? '✅' : '❌'} Database Connection: ${dbResult ? 'OK' : 'Failed'}`);
    
    if (passedChecks === totalChecks && dbResult) {
      console.log('\n🎉 Deployment is healthy and ready!');
      console.log(`🌐 Your app is live at: ${DEPLOYMENT_URL}`);
      
      console.log('\n📋 Next Steps:');
      console.log('1. Test user registration and login');
      console.log('2. Create test offers and deliveries');
      console.log('3. Verify email notifications');
      console.log('4. Test payment processing (if configured)');
      console.log('5. Monitor error rates and performance');
      
      process.exit(0);
    } else {
      console.log('\n⚠️  Some health checks failed. Please investigate:');
      
      healthResults.filter(result => !result.passed).forEach(result => {
        console.log(`  ❌ ${result.name}: ${result.error || `Status ${result.actualStatus} (expected ${result.expectedStatus})`}`);
      });
      
      if (!dbResult) {
        console.log('  ❌ Database connection failed');
      }
      
      console.log('\n🔧 Troubleshooting Tips:');
      console.log('- Check environment variables in Vercel dashboard');
      console.log('- Verify MongoDB connection string and IP whitelist');
      console.log('- Check Vercel function logs for errors');
      console.log('- Ensure all required dependencies are installed');
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

main();