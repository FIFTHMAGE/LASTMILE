/**
 * Jest Test Setup
 * Global setup and teardown for all tests
 */

const { setupTestEnvironment, teardownTestEnvironment } = require('./utils/testSetup');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.MONGODB_TEST_URI = 'mongodb://localhost:27017/lastmile_test';

// Global test setup
beforeAll(async () => {
  // Setup test database
  await setupTestEnvironment();
  console.log('Global test setup completed');
}, 30000); // 30 second timeout for database setup

// Global test teardown
afterAll(async () => {
  // Teardown test database
  await teardownTestEnvironment();
  console.log('Global test teardown completed');
}, 30000); // 30 second timeout for database teardown

// Global test configuration
jest.setTimeout(10000); // 10 second default timeout for tests

// Mock console methods in test environment to reduce noise
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    // Uncomment to suppress console.log in tests
    // log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Global test utilities
global.testUtils = {
  TestFactories: require('./utils/testFactories'),
  TestHelpers: require('./utils/testHelpers'),
  testSetup: require('./utils/testSetup').testSetup
};