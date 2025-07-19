#!/usr/bin/env node

/**
 * Database Initialization Script
 * Sets up optimized indexes and prepares the database for production use
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DatabaseOptimization = require('../utils/databaseOptimization');

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lastmile';
    console.log(`📡 Connecting to MongoDB: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Initialize database optimizer
    const dbOptimizer = new DatabaseOptimization();
    
    // Create all optimized indexes
    console.log('🔧 Creating optimized database indexes...');
    const indexResults = await dbOptimizer.createOptimizedIndexes();
    
    // Display results
    console.log('\n📊 Index Creation Results:');
    console.log('=' .repeat(60));
    
    const resultsByModel = {};
    indexResults.forEach(result => {
      if (!resultsByModel[result.model]) {
        resultsByModel[result.model] = { created: 0, exists: 0, errors: 0 };
      }
      resultsByModel[result.model][result.status]++;
    });
    
    Object.entries(resultsByModel).forEach(([model, counts]) => {
      console.log(`${model}:`);
      console.log(`  ✅ Created: ${counts.created || 0}`);
      console.log(`  ℹ️  Already exists: ${counts.exists || 0}`);
      console.log(`  ❌ Errors: ${counts.errors || 0}`);
    });
    
    // Get database statistics
    console.log('\n📈 Database Statistics:');
    console.log('=' .repeat(60));
    
    const dbStats = await dbOptimizer.getDatabaseStats();
    console.log(`Collections: ${dbStats.collections}`);
    console.log(`Documents: ${dbStats.documents.toLocaleString()}`);
    console.log(`Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Indexes: ${dbStats.indexes}`);
    console.log(`Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    
    // Get collection-specific statistics
    const collections = ['users', 'offers', 'payments', 'notifications'];
    console.log('\n📋 Collection Statistics:');
    console.log('=' .repeat(60));
    
    for (const collectionName of collections) {
      try {
        const collStats = await dbOptimizer.getCollectionStats(collectionName);
        console.log(`${collectionName}:`);
        console.log(`  Documents: ${collStats.count.toLocaleString()}`);
        console.log(`  Size: ${(collStats.size / 1024).toFixed(2)} KB`);
        console.log(`  Storage: ${(collStats.storageSize / 1024).toFixed(2)} KB`);
        console.log(`  Index Size: ${(collStats.totalIndexSize / 1024).toFixed(2)} KB`);
        console.log(`  Indexes: ${Object.keys(collStats.indexSizes).join(', ')}`);
        console.log('');
      } catch (error) {
        console.log(`${collectionName}: Collection not found or empty`);
      }
    }
    
    // Validate critical indexes
    console.log('🔍 Validating Critical Indexes:');
    console.log('=' .repeat(60));
    
    const criticalIndexes = [
      { model: 'User', field: 'email', type: 'unique' },
      { model: 'User', field: 'role', type: 'single' },
      { model: 'Offer', field: 'status', type: 'single' },
      { model: 'Offer', field: 'pickup.coordinates', type: '2dsphere' },
      { model: 'Payment', field: 'businessId', type: 'single' },
      { model: 'Notification', field: 'userId', type: 'single' }
    ];
    
    for (const indexInfo of criticalIndexes) {
      const indexExists = indexResults.some(result => 
        result.model === indexInfo.model && 
        (result.status === 'created' || result.status === 'exists')
      );
      
      if (indexExists) {
        console.log(`✅ ${indexInfo.model}.${indexInfo.field} (${indexInfo.type})`);
      } else {
        console.log(`❌ ${indexInfo.model}.${indexInfo.field} (${indexInfo.type}) - MISSING`);
      }
    }
    
    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    console.log('=' .repeat(60));
    
    const recommendations = [
      'Monitor query performance regularly using the DatabaseOptimization.monitorQueryPerformance() method',
      'Use compound indexes for frequently combined query conditions',
      'Consider partial indexes for role-specific queries to reduce index size',
      'Regularly analyze slow queries using the explainQuery() method',
      'Set up TTL indexes for temporary data like sessions or cache entries',
      'Use projection to limit returned fields in large document queries',
      'Consider read preferences for analytics queries to reduce load on primary',
      'Monitor index usage and remove unused indexes to improve write performance'
    ];
    
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log('\n🎉 Database initialization completed successfully!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database initialization script failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;