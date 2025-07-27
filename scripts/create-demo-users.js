#!/usr/bin/env node
/**
 * Create Demo Users for Local Testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function createDemoUsers() {
  console.log('🚀 Creating demo users for local testing...\n');

  // Demo users data
  const demoUsers = [
    {
      name: 'Demo Business Owner',
      email: 'business@demo.com',
      password: 'demo123',
      role: 'business',
      isVerified: true,
      profile: {
        businessName: 'Demo Delivery Co',
        businessAddress: {
          street: '123 Demo Street',
          city: 'Demo City',
          state: 'DC',
          zipCode: '12345',
          coordinates: [-74.006, 40.7128]
        },
        businessPhone: '+1-555-DEMO'
      }
    },
    {
      name: 'Demo Rider',
      email: 'rider@demo.com',
      password: 'demo123',
      role: 'rider',
      isVerified: true,
      profile: {
        phone: '+1-555-RIDE',
        vehicleType: 'bike',
        isAvailable: true,
        rating: 5.0,
        completedDeliveries: 0
      }
    },
    {
      name: 'Demo Admin',
      email: 'admin@demo.com',
      password: 'demo123',
      role: 'admin',
      isVerified: true,
      profile: {}
    }
  ];

  try {
    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`✅ User ${userData.email} already exists`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword
      });

      console.log(`✅ Created ${userData.role} user: ${userData.email}`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Verified: ${userData.isVerified}`);
      console.log('');
    }

    console.log('🎉 Demo users created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('Business: business@demo.com / demo123');
    console.log('Rider: rider@demo.com / demo123');
    console.log('Admin: admin@demo.com / demo123');
    console.log('');
    console.log('🌐 You can now test login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error creating demo users:', error);
  }
}

// Run if called directly
if (require.main === module) {
  connectDB().then(() => {
    return createDemoUsers();
  }).then(() => {
    console.log('✨ Demo setup complete!');
    mongoose.connection.close();
    process.exit(0);
  }).catch(error => {
    console.error('💥 Setup failed:', error);
    mongoose.connection.close();
    process.exit(1);
  });
}

module.exports = { createDemoUsers };