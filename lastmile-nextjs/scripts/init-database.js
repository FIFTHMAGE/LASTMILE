#!/usr/bin/env node

/**
 * Database Initialization Script for LastMile Delivery Platform
 * This script sets up the MongoDB database with proper indexes and initial data
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lastmile-delivery';

async function initializeDatabase() {
  console.log('🗄️  LastMile Delivery Platform - Database Initialization');
  console.log('======================================================\n');

  let client;
  
  try {
    console.log('📡 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    console.log('✅ Connected to MongoDB successfully\n');

    // Create collections and indexes
    console.log('🔧 Setting up collections and indexes...\n');

    // Users collection
    console.log('👥 Setting up users collection...');
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ role: 1 });
    await usersCollection.createIndex({ 'profile.currentLocation': '2dsphere' });
    console.log('✅ Users collection configured');

    // Offers collection
    console.log('📦 Setting up offers collection...');
    const offersCollection = db.collection('offers');
    await offersCollection.createIndex({ business: 1 });
    await offersCollection.createIndex({ acceptedBy: 1 });
    await offersCollection.createIndex({ status: 1 });
    await offersCollection.createIndex({ 'pickup.coordinates': '2dsphere' });
    await offersCollection.createIndex({ 'delivery.coordinates': '2dsphere' });
    await offersCollection.createIndex({ createdAt: -1 });
    console.log('✅ Offers collection configured');

    // Notifications collection
    console.log('🔔 Setting up notifications collection...');
    const notificationsCollection = db.collection('notifications');
    await notificationsCollection.createIndex({ user: 1 });
    await notificationsCollection.createIndex({ read: 1 });
    await notificationsCollection.createIndex({ createdAt: -1 });
    await notificationsCollection.createIndex({ type: 1 });
    console.log('✅ Notifications collection configured');

    // Payments collection
    console.log('💳 Setting up payments collection...');
    const paymentsCollection = db.collection('payments');
    await paymentsCollection.createIndex({ offer: 1 });
    await paymentsCollection.createIndex({ business: 1 });
    await paymentsCollection.createIndex({ rider: 1 });
    await paymentsCollection.createIndex({ status: 1 });
    await paymentsCollection.createIndex({ createdAt: -1 });
    console.log('✅ Payments collection configured');

    // Delivery tracking collection
    console.log('🚚 Setting up delivery tracking collection...');
    const trackingCollection = db.collection('delivery_tracking');
    await trackingCollection.createIndex({ offer: 1 }, { unique: true });
    await trackingCollection.createIndex({ rider: 1 });
    await trackingCollection.createIndex({ 'currentLocation': '2dsphere' });
    await trackingCollection.createIndex({ updatedAt: -1 });
    console.log('✅ Delivery tracking collection configured');

    // Verification tokens collection
    console.log('🔐 Setting up verification tokens collection...');
    const tokensCollection = db.collection('verification_tokens');
    await tokensCollection.createIndex({ token: 1 }, { unique: true });
    await tokensCollection.createIndex({ email: 1 });
    await tokensCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('✅ Verification tokens collection configured');

    // Create admin user if it doesn't exist
    console.log('\n👤 Setting up admin user...');
    const bcrypt = require('bcrypt');
    const adminEmail = 'admin@lastmile.com';
    const adminPassword = 'admin123'; // Change this in production!
    
    const existingAdmin = await usersCollection.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await usersCollection.insertOne({
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        profile: {
          businessName: 'LastMile Admin',
          businessAddress: {
            street: '123 Admin Street',
            city: 'Admin City',
            state: 'Admin State',
            zipCode: '12345',
            coordinates: [-74.006, 40.7128] // Mock coordinates (New York)
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Admin user created');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log('⚠️  Please change the admin password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create sample data for development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🎭 Creating sample development data...');
      
      // Sample business user
      const businessEmail = 'business@example.com';
      const existingBusiness = await usersCollection.findOne({ email: businessEmail });
      
      if (!existingBusiness) {
        const hashedPassword = await bcrypt.hash('business123', 12);
        const businessUser = await usersCollection.insertOne({
          name: 'Sample Business',
          email: businessEmail,
          password: hashedPassword,
          role: 'business',
          isVerified: true,
          profile: {
            businessName: 'Quick Delivery Co.',
            businessAddress: {
              street: '456 Business Ave',
              city: 'Business City',
              state: 'NY',
              zipCode: '10001',
              coordinates: [-73.9857, 40.7484] // Mock coordinates
            },
            businessPhone: '+1-555-0123'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Sample business user created');
      }

      // Sample rider user
      const riderEmail = 'rider@example.com';
      const existingRider = await usersCollection.findOne({ email: riderEmail });
      
      if (!existingRider) {
        const hashedPassword = await bcrypt.hash('rider123', 12);
        const riderUser = await usersCollection.insertOne({
          name: 'Sample Rider',
          email: riderEmail,
          password: hashedPassword,
          role: 'rider',
          isVerified: true,
          profile: {
            phone: '+1-555-0456',
            vehicleType: 'bike',
            currentLocation: {
              type: 'Point',
              coordinates: [-73.9857, 40.7484] // Mock coordinates
            },
            isAvailable: true,
            rating: 4.8,
            completedDeliveries: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('✅ Sample rider user created');
      }
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📊 Database Statistics:');
    
    const collections = ['users', 'offers', 'notifications', 'payments', 'delivery_tracking'];
    for (const collectionName of collections) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`   ${collectionName}: ${count} documents`);
    }

    console.log('\n🚀 Your LastMile Delivery Platform database is ready!');
    console.log('   You can now start the application with: npm run dev');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n📡 Database connection closed');
    }
  }
}

// Run the initialization
initializeDatabase();