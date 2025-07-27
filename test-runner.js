#!/usr/bin/env node

/**
 * Test Runner for LastMile Delivery Platform
 * Runs tests without starting the main server to avoid port conflicts
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 LastMile Delivery Platform - Test Runner\n');

// Test categories
const testCategories = {
  unit: [
    'tests/user.test.js',
    'tests/offer.model.test.js',
    'tests/payment.test.js',
    'tests/notification.test.js'
  ],
  integration: [
    'tests/auth.test.js',
    'tests/offer.test.js',
    'tests/earnings.test.js'
  ],
  api: [
    'tests/validation.test.js',
    'tests/error-handler.test.js'
  ],
  performance: [
    'tests/performance/databasePerformance.test.js'
  ]
};

// Helper function to run tests
function runTests(category, testFiles) {
  console.log(`\n📋 Running ${category.toUpperCase()} tests...\n`);
  
  try {
    const testPattern = testFiles.join(' ');
    const command = `npx jest ${testPattern} --maxWorkers=1 --forceExit --detectOpenHandles`;
    
    execSync(command, { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '0', // Use random port
        JWT_SECRET: 'test-jwt-secret-key-for-testing-only'
      }
    });
    
    console.log(`✅ ${category.toUpperCase()} tests completed successfully\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${category.toUpperCase()} tests failed\n`);
    return false;
  }
}

// Main test runner
async function main() {
  const args = process.argv.slice(2);
  const category = args[0];
  
  if (category && testCategories[category]) {
    // Run specific category
    const success = runTests(category, testCategories[category]);
    process.exit(success ? 0 : 1);
  } else if (category === 'all') {
    // Run all test categories
    let allPassed = true;
    
    for (const [cat, files] of Object.entries(testCategories)) {
      const success = runTests(cat, files);
      if (!success) allPassed = false;
    }
    
    console.log(allPassed ? '🎉 All tests passed!' : '❌ Some tests failed');
    process.exit(allPassed ? 0 : 1);
  } else {
    // Show usage
    console.log('Usage: node test-runner.js [category]');
    console.log('\nAvailable categories:');
    Object.keys(testCategories).forEach(cat => {
      console.log(`  ${cat} - ${testCategories[cat].length} test files`);
    });
    console.log('  all - Run all test categories');
    console.log('\nExamples:');
    console.log('  node test-runner.js unit');
    console.log('  node test-runner.js integration');
    console.log('  node test-runner.js all');
  }
}

main().catch(console.error);