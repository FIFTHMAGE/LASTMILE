const mongoose = require('mongoose');
const inMemoryDB = require('../services/InMemoryDB');

// Check if MongoDB is available
const isMongoAvailable = process.env.MONGODB_URI || process.env.MONGO_URI;

// Define the schema for MongoDB
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['business', 'rider', 'admin'], required: true },
  profile: {
    // Business-specific fields
    businessName: { 
      type: String, 
      required: function() { return this.role === 'business'; }
    },
    businessAddress: {
      street: { 
        type: String, 
        required: function() { return this.role === 'business'; }
      },
      city: { 
        type: String, 
        required: function() { return this.role === 'business'; }
      },
      state: { 
        type: String, 
        required: function() { return this.role === 'business'; }
      },
      zipCode: { 
        type: String, 
        required: function() { return this.role === 'business'; }
      },
      coordinates: {
        type: [Number] // [lng, lat]
      }
    },
    businessPhone: { 
      type: String, 
      required: function() { return this.role === 'business'; }
    },
    
    // Rider-specific fields
    phone: { 
      type: String, 
      required: function() { return this.role === 'rider'; }
    },
    vehicleType: { 
      type: String, 
      enum: ['bike', 'scooter', 'car', 'van'],
      required: function() { return this.role === 'rider'; }
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number] // [lng, lat]
      }
    },
    isAvailable: { 
      type: Boolean, 
      default: true,
      required: function() { return this.role === 'rider'; }
    },
    rating: { 
      type: Number, 
      default: 5.0,
      min: 1,
      max: 5
    },
    completedDeliveries: { 
      type: Number, 
      default: 0,
      min: 0
    }
  },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create geospatial indexes
userSchema.index({ 'profile.businessAddress.coordinates': '2dsphere' });
userSchema.index({ 'profile.currentLocation': '2dsphere' });

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validation method for role-specific fields
userSchema.methods.validateProfile = function() {
  const errors = [];
  
  if (this.role === 'business') {
    if (!this.profile.businessName) errors.push('Business name is required');
    if (!this.profile.businessAddress.street) errors.push('Business street address is required');
    if (!this.profile.businessAddress.city) errors.push('Business city is required');
    if (!this.profile.businessAddress.state) errors.push('Business state is required');
    if (!this.profile.businessAddress.zipCode) errors.push('Business zip code is required');
    if (!this.profile.businessPhone) errors.push('Business phone is required');
  }
  
  if (this.role === 'rider') {
    if (!this.profile.phone) errors.push('Phone number is required');
    if (!this.profile.vehicleType) errors.push('Vehicle type is required');
  }
  
  return errors;
};

// Method to get role-specific profile data
userSchema.methods.getProfileData = function() {
  const baseProfile = {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isVerified: this.isVerified,
    createdAt: this.createdAt
  };

  if (this.role === 'business') {
    return {
      ...baseProfile,
      businessName: this.profile.businessName,
      businessAddress: this.profile.businessAddress,
      businessPhone: this.profile.businessPhone
    };
  }

  if (this.role === 'rider') {
    return {
      ...baseProfile,
      phone: this.profile.phone,
      vehicleType: this.profile.vehicleType,
      currentLocation: this.profile.currentLocation,
      isAvailable: this.profile.isAvailable,
      rating: this.profile.rating,
      completedDeliveries: this.profile.completedDeliveries
    };
  }

  if (this.role === 'admin') {
    return {
      ...baseProfile,
      permissions: ['read', 'write', 'delete', 'manage_users', 'view_analytics']
    };
  }

  return baseProfile;
};

// Create a hybrid model that uses MongoDB if available, otherwise uses in-memory DB
const User = {
  findOne: async function(query) {
    if (isMongoAvailable) {
      return await mongoose.model('User', userSchema).findOne(query);
    } else {
      console.log('Using in-memory DB for User.findOne', query);
      if (query.email) {
        return await inMemoryDB.findUserByEmail(query.email);
      } else if (query._id) {
        return await inMemoryDB.findUserById(query._id);
      }
      return null;
    }
  },
  
  findById: async function(id) {
    if (isMongoAvailable) {
      return await mongoose.model('User', userSchema).findById(id);
    } else {
      console.log('Using in-memory DB for User.findById', id);
      return await inMemoryDB.findUserById(id);
    }
  },
  
  findByIdAndUpdate: async function(id, updates, options) {
    if (isMongoAvailable) {
      return await mongoose.model('User', userSchema).findByIdAndUpdate(id, updates, options);
    } else {
      console.log('Using in-memory DB for User.findByIdAndUpdate', id, updates);
      return await inMemoryDB.updateUser(id, updates);
    }
  },
  
  create: async function(userData) {
    if (isMongoAvailable) {
      return await mongoose.model('User', userSchema).create(userData);
    } else {
      console.log('Using in-memory DB for User.create', userData);
      const user = await inMemoryDB.createUser(userData);
      
      // Add methods to the user object
      user.validateProfile = userSchema.methods.validateProfile;
      user.getProfileData = userSchema.methods.getProfileData;
      
      return user;
    }
  }
};

module.exports = isMongoAvailable ? mongoose.model('User', userSchema) : User;