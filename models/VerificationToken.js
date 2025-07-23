const mongoose = require('mongoose');
const crypto = require('crypto');
const inMemoryDB = require('../services/InMemoryDB');

// Check if MongoDB is available
const isMongoAvailable = process.env.MONGODB_URI || process.env.MONGO_URI;

const verificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    default: 'email_verification'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 43200 // Token expires after 12 hours (in seconds)
  }
});

// Generate a random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Create a hybrid model that uses MongoDB if available, otherwise uses in-memory DB
const VerificationToken = {
  generateToken: generateToken,
  
  createToken: async function(userId, type = 'email_verification') {
    if (isMongoAvailable) {
      // Delete any existing tokens for this user and type
      await mongoose.model('VerificationToken', verificationTokenSchema).deleteMany({ userId, type });
      
      // Create a new token
      const token = generateToken();
      const verificationToken = await mongoose.model('VerificationToken', verificationTokenSchema).create({
        userId,
        token,
        type
      });
      
      return verificationToken;
    } else {
      console.log('Using in-memory DB for VerificationToken.createToken', userId, type);
      // Delete any existing tokens for this user and type
      await inMemoryDB.deleteVerificationTokensByUser(userId, type);
      
      // Create a new token
      const token = generateToken();
      return await inMemoryDB.createVerificationToken(userId, token, type);
    }
  },
  
  findByToken: async function(token, type = 'email_verification') {
    if (isMongoAvailable) {
      return await mongoose.model('VerificationToken', verificationTokenSchema).findOne({ token, type });
    } else {
      console.log('Using in-memory DB for VerificationToken.findByToken', token, type);
      return await inMemoryDB.findVerificationToken(token, type);
    }
  },
  
  deleteOne: async function(query) {
    if (isMongoAvailable) {
      return await mongoose.model('VerificationToken', verificationTokenSchema).deleteOne(query);
    } else {
      console.log('Using in-memory DB for VerificationToken.deleteOne', query);
      if (query._id) {
        return await inMemoryDB.deleteVerificationToken(query._id);
      }
      return false;
    }
  },
  
  deleteMany: async function(query) {
    if (isMongoAvailable) {
      return await mongoose.model('VerificationToken', verificationTokenSchema).deleteMany(query);
    } else {
      console.log('Using in-memory DB for VerificationToken.deleteMany', query);
      if (query.userId && query.type) {
        return await inMemoryDB.deleteVerificationTokensByUser(query.userId, query.type);
      }
      return false;
    }
  }
};

// Set up statics for MongoDB model
verificationTokenSchema.statics.generateToken = generateToken;

verificationTokenSchema.statics.createToken = async function(userId, type = 'email_verification') {
  // Delete any existing tokens for this user and type
  await this.deleteMany({ userId, type });
  
  // Create a new token
  const token = this.generateToken();
  const verificationToken = await this.create({
    userId,
    token,
    type
  });
  
  return verificationToken;
};

verificationTokenSchema.statics.findByToken = function(token, type = 'email_verification') {
  return this.findOne({ token, type });
};

module.exports = isMongoAvailable ? mongoose.model('VerificationToken', verificationTokenSchema) : VerificationToken;