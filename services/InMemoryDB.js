/**
 * In-memory database for development purposes
 * This is a simple implementation that stores data in memory
 * It's not meant for production use
 */

class InMemoryDB {
  constructor() {
    this.users = [];
    this.verificationTokens = [];
    this.offers = [];
    this.nextId = 1;
  }

  // User methods
  async findUserById(id) {
    return this.users.find(user => user._id === id);
  }

  async findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  async createUser(userData) {
    const user = {
      _id: `user_${this.nextId++}`,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  async updateUser(id, updates) {
    const userIndex = this.users.findIndex(user => user._id === id);
    if (userIndex === -1) return null;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    return this.users[userIndex];
  }

  // Verification token methods
  async createVerificationToken(userId, token, type = 'email_verification') {
    const verificationToken = {
      _id: `token_${this.nextId++}`,
      userId,
      token,
      type,
      createdAt: new Date()
    };
    this.verificationTokens.push(verificationToken);
    return verificationToken;
  }

  async findVerificationToken(token, type = 'email_verification') {
    return this.verificationTokens.find(t => t.token === token && t.type === type);
  }

  async deleteVerificationToken(id) {
    const tokenIndex = this.verificationTokens.findIndex(token => token._id === id);
    if (tokenIndex === -1) return false;
    
    this.verificationTokens.splice(tokenIndex, 1);
    return true;
  }

  async deleteVerificationTokensByUser(userId, type) {
    this.verificationTokens = this.verificationTokens.filter(
      token => !(token.userId === userId && token.type === type)
    );
    return true;
  }

  // Offer methods
  async createOffer(offerData) {
    const offer = {
      _id: `offer_${this.nextId++}`,
      ...offerData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.offers.push(offer);
    return offer;
  }

  async findOfferById(id) {
    return this.offers.find(offer => offer._id === id);
  }

  async findOffersByBusiness(businessId) {
    return this.offers.filter(offer => offer.business === businessId);
  }

  async updateOffer(id, updates) {
    const offerIndex = this.offers.findIndex(offer => offer._id === id);
    if (offerIndex === -1) return null;
    
    this.offers[offerIndex] = {
      ...this.offers[offerIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    return this.offers[offerIndex];
  }
}

// Create a singleton instance
const inMemoryDB = new InMemoryDB();

module.exports = inMemoryDB;