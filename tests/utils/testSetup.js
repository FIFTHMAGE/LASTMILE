const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * Test Database Setup and Configuration
 * Provides utilities for setting up and tearing down test databases
 */
class TestSetup {
  constructor() {
    this.mongoServer = null;
    this.connection = null;
  }

  /**
   * Set up test database connection
   * Uses in-memory MongoDB for fast, isolated tests
   */
  async setupDatabase() {
    try {
      // Create in-memory MongoDB instance
      this.mongoServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'lastmile_test'
        }
      });

      const mongoUri = this.mongoServer.getUri();
      
      // Connect to the in-memory database
      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('Test database connected successfully');
      return this.connection;
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  /**
   * Clean up all collections in the test database
   * Useful for resetting state between tests
   */
  async cleanDatabase() {
    try {
      if (!this.connection) {
        throw new Error('Database connection not established');
      }

      const collections = await mongoose.connection.db.collections();
      
      // Drop all collections
      await Promise.all(
        collections.map(collection => collection.deleteMany({}))
      );

      console.log('Test database cleaned successfully');
    } catch (error) {
      console.error('Failed to clean test database:', error);
      throw error;
    }
  }

  /**
   * Tear down test database connection
   * Closes connection and stops in-memory MongoDB server
   */
  async teardownDatabase() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.connection = null;
      }

      if (this.mongoServer) {
        await this.mongoServer.stop();
        this.mongoServer = null;
      }

      console.log('Test database torn down successfully');
    } catch (error) {
      console.error('Failed to teardown test database:', error);
      throw error;
    }
  }

  /**
   * Get database connection status
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    if (!this.isConnected()) {
      throw new Error('Database not connected');
    }

    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      documents: stats.objects,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize
    };
  }

  /**
   * Create database indexes for testing
   * Ensures proper indexes are created for test performance
   */
  async createTestIndexes() {
    try {
      if (!this.isConnected()) {
        throw new Error('Database not connected');
      }

      // Wait for models to be registered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Only create indexes if models are available
      const modelNames = mongoose.modelNames();
      
      if (modelNames.includes('User')) {
        const User = mongoose.model('User');
        if (User.collection) {
          await User.collection.createIndex({ email: 1 }, { unique: true });
          await User.collection.createIndex({ role: 1 });
          await User.collection.createIndex({ 'profile.businessAddress.coordinates': '2dsphere' });
          await User.collection.createIndex({ 'profile.currentLocation': '2dsphere' });
        }
      }

      if (modelNames.includes('Offer')) {
        const Offer = mongoose.model('Offer');
        if (Offer.collection) {
          await Offer.collection.createIndex({ businessId: 1 });
          await Offer.collection.createIndex({ riderId: 1 });
          await Offer.collection.createIndex({ status: 1 });
          await Offer.collection.createIndex({ createdAt: -1 });
          await Offer.collection.createIndex({ 'pickup.coordinates': '2dsphere' });
          await Offer.collection.createIndex({ 'delivery.coordinates': '2dsphere' });
        }
      }

      if (modelNames.includes('Payment')) {
        const Payment = mongoose.model('Payment');
        if (Payment.collection) {
          await Payment.collection.createIndex({ businessId: 1 });
          await Payment.collection.createIndex({ riderId: 1 });
          await Payment.collection.createIndex({ status: 1 });
          await Payment.collection.createIndex({ createdAt: -1 });
        }
      }

      if (modelNames.includes('Notification')) {
        const Notification = mongoose.model('Notification');
        if (Notification.collection) {
          await Notification.collection.createIndex({ userId: 1 });
          await Notification.collection.createIndex({ type: 1 });
          await Notification.collection.createIndex({ isRead: 1 });
          await Notification.collection.createIndex({ createdAt: -1 });
        }
      }

      console.log('Test database indexes created successfully');
    } catch (error) {
      console.error('Failed to create test indexes:', error);
      // Don't throw error for index creation failures in tests
    }
  }
}

// Global test setup instance
const testSetup = new TestSetup();

/**
 * Jest setup functions
 */
const setupTestEnvironment = async () => {
  await testSetup.setupDatabase();
  await testSetup.createTestIndexes();
};

const cleanupTestEnvironment = async () => {
  await testSetup.cleanDatabase();
};

const teardownTestEnvironment = async () => {
  await testSetup.teardownDatabase();
};

module.exports = {
  TestSetup,
  testSetup,
  setupTestEnvironment,
  cleanupTestEnvironment,
  teardownTestEnvironment
};