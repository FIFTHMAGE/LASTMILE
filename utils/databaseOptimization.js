/**
 * Database Query Optimization Utilities
 * Provides comprehensive database optimization including indexes, query optimization, and performance monitoring
 */

const mongoose = require('mongoose');

/**
 * Database Optimization Manager
 * Handles index creation, query optimization, and performance monitoring
 */
class DatabaseOptimization {
  constructor() {
    this.indexCreationResults = [];
    this.performanceMetrics = {};
  }

  /**
   * Create all optimized indexes for the application
   */
  async createOptimizedIndexes() {
    console.log('Creating optimized database indexes...');
    
    try {
      // Get all models
      const User = require('../models/User');
      const Offer = require('../models/Offer');
      const Payment = require('../models/Payment');
      const Notification = require('../models/Notification');

      // User model indexes
      await this.createUserIndexes(User);
      
      // Offer model indexes
      await this.createOfferIndexes(Offer);
      
      // Payment model indexes
      await this.createPaymentIndexes(Payment);
      
      // Notification model indexes
      await this.createNotificationIndexes(Notification);

      console.log('Database indexes created successfully');
      return this.indexCreationResults;
    } catch (error) {
      console.error('Error creating database indexes:', error);
      throw error;
    }
  }

  /**
   * Create optimized indexes for User model
   */
  async createUserIndexes(User) {
    const indexes = [
      // Authentication and lookup indexes
      { fields: { email: 1 }, options: { unique: true, name: 'email_unique' } },
      { fields: { role: 1 }, options: { name: 'role_index' } },
      { fields: { isVerified: 1 }, options: { name: 'verified_index' } },
      
      // Compound indexes for common queries
      { fields: { role: 1, isVerified: 1 }, options: { name: 'role_verified_compound' } },
      { fields: { role: 1, createdAt: -1 }, options: { name: 'role_created_compound' } },
      
      // Rider-specific indexes
      { fields: { 'profile.isAvailable': 1, role: 1 }, options: { name: 'rider_availability', partialFilterExpression: { role: 'rider' } } },
      { fields: { 'profile.vehicleType': 1, role: 1 }, options: { name: 'rider_vehicle_type', partialFilterExpression: { role: 'rider' } } },
      { fields: { 'profile.rating': -1, role: 1 }, options: { name: 'rider_rating', partialFilterExpression: { role: 'rider' } } },
      { fields: { 'profile.completedDeliveries': -1, role: 1 }, options: { name: 'rider_deliveries', partialFilterExpression: { role: 'rider' } } },
      
      // Business-specific indexes
      { fields: { 'profile.businessName': 1, role: 1 }, options: { name: 'business_name', partialFilterExpression: { role: 'business' } } },
      { fields: { 'profile.businessAddress.city': 1, role: 1 }, options: { name: 'business_city', partialFilterExpression: { role: 'business' } } },
      { fields: { 'profile.businessAddress.state': 1, role: 1 }, options: { name: 'business_state', partialFilterExpression: { role: 'business' } } },
      
      // Geospatial indexes
      { fields: { 'profile.currentLocation': '2dsphere' }, options: { name: 'rider_location_geo' } },
      { fields: { 'profile.businessAddress.coordinates': '2dsphere' }, options: { name: 'business_location_geo' } },
      
      // Time-based indexes
      { fields: { createdAt: -1 }, options: { name: 'created_time' } },
      { fields: { updatedAt: -1 }, options: { name: 'updated_time' } },
      
      // Text search index for user names and business names
      { fields: { name: 'text', 'profile.businessName': 'text' }, options: { name: 'user_text_search' } }
    ];

    await this.createIndexes(User, 'User', indexes);
  }

  /**
   * Create optimized indexes for Offer model
   */
  async createOfferIndexes(Offer) {
    const indexes = [
      // Status and business relationship indexes
      { fields: { status: 1 }, options: { name: 'offer_status' } },
      { fields: { business: 1 }, options: { name: 'offer_business' } },
      { fields: { acceptedBy: 1 }, options: { name: 'offer_rider' } },
      
      // Compound indexes for common queries
      { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created_compound' } },
      { fields: { business: 1, status: 1 }, options: { name: 'business_status_compound' } },
      { fields: { acceptedBy: 1, status: 1 }, options: { name: 'rider_status_compound' } },
      { fields: { status: 1, 'payment.amount': -1 }, options: { name: 'status_payment_compound' } },
      
      // Geospatial indexes for location-based queries
      { fields: { 'pickup.coordinates': '2dsphere' }, options: { name: 'pickup_location_geo' } },
      { fields: { 'delivery.coordinates': '2dsphere' }, options: { name: 'delivery_location_geo' } },
      
      // Payment and filtering indexes
      { fields: { 'payment.amount': -1 }, options: { name: 'payment_amount' } },
      { fields: { 'payment.paymentMethod': 1 }, options: { name: 'payment_method' } },
      { fields: { 'packageDetails.weight': 1 }, options: { name: 'package_weight' } },
      { fields: { 'packageDetails.fragile': 1 }, options: { name: 'package_fragile' } },
      
      // Time-based indexes for scheduling and tracking
      { fields: { createdAt: -1 }, options: { name: 'offer_created' } },
      { fields: { acceptedAt: -1 }, options: { name: 'offer_accepted' } },
      { fields: { deliveredAt: -1 }, options: { name: 'offer_delivered' } },
      { fields: { 'pickup.availableFrom': 1 }, options: { name: 'pickup_available_from' } },
      { fields: { 'pickup.availableUntil': 1 }, options: { name: 'pickup_available_until' } },
      { fields: { 'delivery.deliverBy': 1 }, options: { name: 'delivery_deadline' } },
      
      // Performance optimization indexes
      { fields: { estimatedDistance: 1 }, options: { name: 'estimated_distance' } },
      { fields: { estimatedDuration: 1 }, options: { name: 'estimated_duration' } },
      
      // Compound geospatial and filter indexes
      { fields: { 'pickup.coordinates': '2dsphere', status: 1 }, options: { name: 'pickup_geo_status' } },
      { fields: { 'pickup.coordinates': '2dsphere', 'payment.amount': -1 }, options: { name: 'pickup_geo_payment' } },
      
      // Text search index for offer titles and descriptions
      { fields: { title: 'text', description: 'text' }, options: { name: 'offer_text_search' } },
      
      // Status history optimization
      { fields: { 'statusHistory.timestamp': -1 }, options: { name: 'status_history_time' } },
      { fields: { 'statusHistory.updatedBy': 1 }, options: { name: 'status_history_user' } }
    ];

    await this.createIndexes(Offer, 'Offer', indexes);
  }

  /**
   * Create optimized indexes for Payment model
   */
  async createPaymentIndexes(Payment) {
    const indexes = [
      // User relationship indexes
      { fields: { businessId: 1 }, options: { name: 'payment_business' } },
      { fields: { riderId: 1 }, options: { name: 'payment_rider' } },
      { fields: { offerId: 1 }, options: { name: 'payment_offer' } },
      
      // Status and method indexes
      { fields: { status: 1 }, options: { name: 'payment_status' } },
      { fields: { method: 1 }, options: { name: 'payment_method' } },
      
      // Compound indexes for common queries
      { fields: { businessId: 1, status: 1 }, options: { name: 'business_payment_status' } },
      { fields: { riderId: 1, status: 1 }, options: { name: 'rider_payment_status' } },
      { fields: { status: 1, createdAt: -1 }, options: { name: 'payment_status_time' } },
      { fields: { businessId: 1, createdAt: -1 }, options: { name: 'business_payment_time' } },
      { fields: { riderId: 1, createdAt: -1 }, options: { name: 'rider_payment_time' } },
      
      // Amount and transaction indexes
      { fields: { amount: -1 }, options: { name: 'payment_amount' } },
      { fields: { transactionId: 1 }, options: { unique: true, sparse: true, name: 'transaction_id_unique' } },
      
      // Time-based indexes
      { fields: { createdAt: -1 }, options: { name: 'payment_created' } },
      { fields: { updatedAt: -1 }, options: { name: 'payment_updated' } },
      { fields: { processedAt: -1 }, options: { name: 'payment_processed' } },
      
      // Analytics and reporting indexes
      { fields: { status: 1, amount: -1 }, options: { name: 'payment_status_amount' } },
      { fields: { method: 1, status: 1, createdAt: -1 }, options: { name: 'payment_method_status_time' } }
    ];

    await this.createIndexes(Payment, 'Payment', indexes);
  }

  /**
   * Create optimized indexes for Notification model
   */
  async createNotificationIndexes(Notification) {
    const indexes = [
      // User and type indexes
      { fields: { userId: 1 }, options: { name: 'notification_user' } },
      { fields: { type: 1 }, options: { name: 'notification_type' } },
      
      // Read status and priority indexes
      { fields: { isRead: 1 }, options: { name: 'notification_read_status' } },
      { fields: { priority: 1 }, options: { name: 'notification_priority' } },
      
      // Compound indexes for common queries
      { fields: { userId: 1, isRead: 1 }, options: { name: 'user_read_status' } },
      { fields: { userId: 1, createdAt: -1 }, options: { name: 'user_notification_time' } },
      { fields: { userId: 1, type: 1 }, options: { name: 'user_notification_type' } },
      { fields: { userId: 1, priority: 1, isRead: 1 }, options: { name: 'user_priority_read' } },
      
      // Channel-based indexes
      { fields: { channels: 1 }, options: { name: 'notification_channels' } },
      
      // Time-based indexes
      { fields: { createdAt: -1 }, options: { name: 'notification_created' } },
      { fields: { readAt: -1 }, options: { name: 'notification_read_time' } },
      { fields: { scheduledFor: 1 }, options: { name: 'notification_scheduled' } },
      
      // Cleanup and maintenance indexes
      { fields: { createdAt: 1 }, options: { name: 'notification_cleanup', expireAfterSeconds: 2592000 } }, // 30 days TTL
      
      // Text search for notification content
      { fields: { title: 'text', message: 'text' }, options: { name: 'notification_text_search' } }
    ];

    await this.createIndexes(Notification, 'Notification', indexes);
  }

  /**
   * Helper method to create indexes for a model
   */
  async createIndexes(Model, modelName, indexes) {
    for (const indexDef of indexes) {
      try {
        await Model.collection.createIndex(indexDef.fields, indexDef.options);
        this.indexCreationResults.push({
          model: modelName,
          index: indexDef.options.name || JSON.stringify(indexDef.fields),
          status: 'created',
          fields: indexDef.fields
        });
        console.log(`✓ Created index ${indexDef.options.name} for ${modelName}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          this.indexCreationResults.push({
            model: modelName,
            index: indexDef.options.name || JSON.stringify(indexDef.fields),
            status: 'exists',
            fields: indexDef.fields
          });
          console.log(`- Index ${indexDef.options.name} already exists for ${modelName}`);
        } else {
          this.indexCreationResults.push({
            model: modelName,
            index: indexDef.options.name || JSON.stringify(indexDef.fields),
            status: 'error',
            error: error.message,
            fields: indexDef.fields
          });
          console.error(`✗ Failed to create index ${indexDef.options.name} for ${modelName}:`, error.message);
        }
      }
    }
  }

  /**
   * Optimize geospatial queries with proper indexing and query structure
   */
  static optimizeGeospatialQuery(coordinates, maxDistance, additionalFilters = {}) {
    return {
      ...additionalFilters,
      $and: [
        {
          'pickup.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: coordinates
              },
              $maxDistance: maxDistance
            }
          }
        }
      ]
    };
  }

  /**
   * Create optimized aggregation pipeline for nearby offers
   */
  static createNearbyOffersAggregation(coordinates, maxDistance, filters = {}) {
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: coordinates
          },
          distanceField: 'distanceFromRider',
          maxDistance: maxDistance,
          spherical: true,
          query: {
            status: 'open',
            ...filters.baseQuery
          }
        }
      }
    ];

    // Add filtering stages
    if (filters.paymentRange) {
      pipeline.push({
        $match: {
          'payment.amount': {
            $gte: filters.paymentRange.min || 0,
            $lte: filters.paymentRange.max || Number.MAX_SAFE_INTEGER
          }
        }
      });
    }

    if (filters.packageFilters) {
      const packageMatch = {};
      if (filters.packageFilters.maxWeight) {
        packageMatch['packageDetails.weight'] = { $lte: filters.packageFilters.maxWeight };
      }
      if (filters.packageFilters.fragileOnly !== undefined) {
        packageMatch['packageDetails.fragile'] = filters.packageFilters.fragileOnly;
      }
      if (Object.keys(packageMatch).length > 0) {
        pipeline.push({ $match: packageMatch });
      }
    }

    // Add business information lookup
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'business',
        foreignField: '_id',
        as: 'businessInfo',
        pipeline: [
          {
            $project: {
              name: 1,
              'profile.businessName': 1,
              'profile.businessPhone': 1,
              'profile.businessAddress': 1
            }
          }
        ]
      }
    });

    // Add sorting
    const sortStage = {};
    switch (filters.sortBy) {
      case 'distance':
        sortStage.distanceFromRider = 1;
        break;
      case 'payment':
        sortStage['payment.amount'] = -1;
        break;
      case 'created':
        sortStage.createdAt = -1;
        break;
      default:
        sortStage.distanceFromRider = 1;
    }
    pipeline.push({ $sort: sortStage });

    // Add pagination
    if (filters.skip) pipeline.push({ $skip: filters.skip });
    if (filters.limit) pipeline.push({ $limit: filters.limit });

    return pipeline;
  }

  /**
   * Create optimized query for user earnings
   */
  static createEarningsAggregation(riderId, timeRange = {}) {
    const matchStage = {
      riderId: riderId,
      status: 'completed'
    };

    if (timeRange.start || timeRange.end) {
      matchStage.createdAt = {};
      if (timeRange.start) matchStage.createdAt.$gte = timeRange.start;
      if (timeRange.end) matchStage.createdAt.$lte = timeRange.end;
    }

    return [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          averagePayment: { $avg: '$amount' },
          minPayment: { $min: '$amount' },
          maxPayment: { $max: '$amount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalEarnings: { $round: ['$totalEarnings', 2] },
          totalPayments: 1,
          averagePayment: { $round: ['$averagePayment', 2] },
          minPayment: 1,
          maxPayment: 1
        }
      }
    ];
  }

  /**
   * Monitor query performance
   */
  async monitorQueryPerformance(queryName, queryFunction) {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await queryFunction();
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      if (!this.performanceMetrics[queryName]) {
        this.performanceMetrics[queryName] = {
          totalExecutions: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }

      const metrics = this.performanceMetrics[queryName];
      metrics.totalExecutions++;
      metrics.totalTime += executionTime;
      metrics.averageTime = metrics.totalTime / metrics.totalExecutions;
      metrics.minTime = Math.min(metrics.minTime, executionTime);
      metrics.maxTime = Math.max(metrics.maxTime, executionTime);

      if (executionTime > 1000) { // Log slow queries (> 1 second)
        console.warn(`Slow query detected: ${queryName} took ${executionTime.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      console.error(`Query error in ${queryName}:`, error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMetrics;
  }

  /**
   * Analyze and suggest query optimizations
   */
  async analyzeQueryPerformance() {
    const suggestions = [];

    for (const [queryName, metrics] of Object.entries(this.performanceMetrics)) {
      if (metrics.averageTime > 500) {
        suggestions.push({
          query: queryName,
          issue: 'High average execution time',
          averageTime: metrics.averageTime,
          suggestion: 'Consider adding indexes or optimizing query structure'
        });
      }

      if (metrics.maxTime > 2000) {
        suggestions.push({
          query: queryName,
          issue: 'Very slow maximum execution time',
          maxTime: metrics.maxTime,
          suggestion: 'Investigate query plan and consider query restructuring'
        });
      }
    }

    return suggestions;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      
      return {
        collections: stats.collections,
        documents: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        averageObjectSize: stats.avgObjSize
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Get collection-specific statistics
   */
  async getCollectionStats(collectionName) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      const stats = await collection.stats();
      
      return {
        name: collectionName,
        count: stats.count,
        size: stats.size,
        storageSize: stats.storageSize,
        totalIndexSize: stats.totalIndexSize,
        indexSizes: stats.indexSizes,
        averageObjectSize: stats.avgObjSize
      };
    } catch (error) {
      console.error(`Error getting stats for collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Explain query execution plan
   */
  async explainQuery(Model, query, options = {}) {
    try {
      const explanation = await Model.find(query).explain('executionStats');
      
      return {
        queryPlanner: explanation.queryPlanner,
        executionStats: explanation.executionStats,
        indexUsed: explanation.queryPlanner.winningPlan.inputStage?.indexName || 'No index used',
        documentsExamined: explanation.executionStats.totalDocsExamined,
        documentsReturned: explanation.executionStats.totalDocsReturned,
        executionTime: explanation.executionStats.executionTimeMillis,
        indexHit: explanation.executionStats.totalDocsExamined === explanation.executionStats.totalDocsReturned
      };
    } catch (error) {
      console.error('Error explaining query:', error);
      throw error;
    }
  }
}

module.exports = DatabaseOptimization;