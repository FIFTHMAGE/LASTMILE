/**
 * Script to create demo users for testing the frontend
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Demo user data
const demoUsers = [
  {
    name: 'Demo Business',
    email: 'business@demo.com',
    password: 'password123',
    role: 'business',
    profile: {
      businessName: 'Demo Delivery Company',
      businessAddress: {
        street: '123 Business Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        coordinates: [-74.006, 40.7128]
      },
      businessPhone: '(555) 123-4567'
    },
    isVerified: true
  },
  {
    name: 'Demo Rider',
    email: 'rider@demo.com',
    password: 'password123',
    role: 'rider',
    profile: {
      phone: '(555) 987-6543',
      vehicleType: 'bike',
      currentLocation: {
        type: 'Point',
        coordinates: [-74.006, 40.7128]
      },
      isAvailable: true,
      rating: 4.8,
      completedDeliveries: 25
    },
    isVerified: true
  },
  {
    name: 'Demo Admin',
    email: 'admin@demo.com',
    password: 'password123',
    role: 'admin',
    profile: {},
    isVerified: true
  }
];

async function createDemoUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/lastmile';
    console.log('Connecting to MongoDB:', mongoUri);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if demo users already exist
    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`Demo user ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user with proper structure
      const userDoc = {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        isVerified: userData.isVerified,
        profile: {}
      };

      // Add role-specific profile data
      if (userData.role === 'business') {
        userDoc.profile = {
          businessName: userData.profile.businessName,
          businessAddress: userData.profile.businessAddress,
          businessPhone: userData.profile.businessPhone
        };
      } else if (userData.role === 'rider') {
        userDoc.profile = {
          phone: userData.profile.phone,
          vehicleType: userData.profile.vehicleType,
          currentLocation: userData.profile.currentLocation,
          isAvailable: userData.profile.isAvailable,
          rating: userData.profile.rating,
          completedDeliveries: userData.profile.completedDeliveries
        };
      }

      const user = new User(userDoc);
      await user.save();
      console.log(`✅ Created demo user: ${userData.email} (${userData.role})`);
    }

    console.log('\n🎉 Demo users created successfully!');
    console.log('\nYou can now use these credentials to test the frontend:');
    console.log('📧 Business: business@demo.com / password123');
    console.log('🚴 Rider: rider@demo.com / password123');
    console.log('👨‍💼 Admin: admin@demo.com / password123');

  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB Connection Issue:');
      console.log('It looks like MongoDB is not running locally.');
      console.log('\nOptions to fix this:');
      console.log('1. Install and start MongoDB locally:');
      console.log('   - Download from: https://www.mongodb.com/try/download/community');
      console.log('   - Start with: mongod');
      console.log('\n2. Use MongoDB Atlas (cloud):');
      console.log('   - Sign up at: https://www.mongodb.com/atlas');
      console.log('   - Update MONGO_URI in .env file');
      console.log('\n3. Use Docker:');
      console.log('   - Run: docker run -d -p 27017:27017 --name mongodb mongo');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\nDisconnected from MongoDB');
    }
  }
}

// Run the script
if (require.main === module) {
  createDemoUsers();
}

module.exports = createDemoUsers;