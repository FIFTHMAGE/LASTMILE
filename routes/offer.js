const express = require('express');
const Offer = require('../models/Offer');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

const router = express.Router();

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Business: Post offer
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'business') return res.status(403).json({ message: 'Only businesses can post offers' });
  const { amount, details, location } = req.body;
  if (!amount || !location || !location.coordinates) return res.status(400).json({ message: 'Amount and location required' });
  try {
    const offer = new Offer({
      business: req.user.id,
      amount,
      details,
      location: { type: 'Point', coordinates: location.coordinates },
    });
    await offer.save();
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Rider: Get offers near location
router.get('/nearby', auth, async (req, res) => {
  if (req.user.role !== 'rider') return res.status(403).json({ message: 'Only riders can view offers' });
  const { lng, lat, maxDistance = 5000 } = req.query;
  if (!lng || !lat) return res.status(400).json({ message: 'lng and lat required' });
  try {
    const offers = await Offer.find({
      status: 'open',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance),
        },
      },
    }).populate('business', 'name email');
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Rider: Accept offer
router.post('/:id/accept', auth, async (req, res) => {
  if (req.user.role !== 'rider') return res.status(403).json({ message: 'Only riders can accept offers' });
  try {
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, status: 'open' },
      { status: 'accepted', acceptedBy: req.user.id },
      { new: true }
    ).populate('business', 'name email');
    if (!offer) return res.status(404).json({ message: 'Offer not found or already accepted' });
    // Create notification for business
    await Notification.create({
      user: offer.business._id,
      offer: offer._id,
      type: 'offer_accepted',
      message: `Your offer was accepted by a rider.`,
    });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark offer as completed (by rider or business)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    // Only business or assigned rider can complete
    if (
      (req.user.role === 'business' && offer.business.toString() === req.user.id) ||
      (req.user.role === 'rider' && offer.acceptedBy && offer.acceptedBy.toString() === req.user.id)
    ) {
      offer.status = 'completed';
      await offer.save();
      // Notify the other party
      const notifyUser = req.user.role === 'business' ? offer.acceptedBy : offer.business;
      if (notifyUser) {
        await Notification.create({
          user: notifyUser,
          offer: offer._id,
          type: 'offer_completed',
          message: `Offer has been marked as completed.`,
        });
      }
      res.json({ message: 'Offer marked as completed', offer });
    } else {
      res.status(403).json({ message: 'Not authorized to complete this offer' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 