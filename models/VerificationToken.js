const mongoose = require('mongoose');
const crypto = require('crypto');

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
verificationTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

// Create a new verification token for a user
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

// Find a token by its value and type
verificationTokenSchema.statics.findByToken = function(token, type = 'email_verification') {
  return this.findOne({ token, type });
};

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);