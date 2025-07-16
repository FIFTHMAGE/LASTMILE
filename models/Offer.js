const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  details: { type: String },
  location: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  status: { type: String, enum: ['open', 'accepted', 'completed'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

offerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Offer', offerSchema); 