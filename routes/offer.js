const express = require('express');
const Offer = require('../models/Offer');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');
const LocationService = require('../services/LocationService');

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

// Business: Post offer (enhanced)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ message: 'Only businesses can post offers' });
  }

  const {
    title,
    description,
    packageDetails,
    pickup,
    delivery,
    payment
  } = req.body;

  // Validate required fields
  if (!title || !pickup || !delivery || !payment) {
    return res.status(400).json({
      message: 'Missing required fields',
      required: ['title', 'pickup', 'delivery', 'payment'],
      example: {
        title: 'Document Delivery',
        pickup: {
          address: '123 Main St, New York, NY',
          coordinates: [-74.006, 40.7128],
          contactName: 'John Doe',
          contactPhone: '555-0001'
        },
        delivery: {
          address: '456 Oak Ave, Brooklyn, NY',
          coordinates: [-73.9857, 40.6892],
          contactName: 'Jane Smith',
          contactPhone: '555-0002'
        },
        payment: { amount: 25.50 }
      }
    });
  }

  try {
    const locationService = new LocationService();
    
    // Validate and geocode addresses if coordinates are not provided
    let pickupCoordinates = pickup.coordinates;
    let deliveryCoordinates = delivery.coordinates;
    
    // Geocode pickup address if coordinates are missing
    if (!pickupCoordinates || pickupCoordinates.length !== 2) {
      if (!pickup.address) {
        return res.status(400).json({
          message: 'Either pickup coordinates or address is required for geocoding'
        });
      }
      
      try {
        const pickupGeocode = await locationService.geocodeAddress(pickup.address);
        pickupCoordinates = pickupGeocode.coordinates;
      } catch (geocodeError) {
        return res.status(400).json({
          message: 'Failed to geocode pickup address',
          error: geocodeError.message,
          address: pickup.address
        });
      }
    }
    
    // Geocode delivery address if coordinates are missing
    if (!deliveryCoordinates || deliveryCoordinates.length !== 2) {
      if (!delivery.address) {
        return res.status(400).json({
          message: 'Either delivery coordinates or address is required for geocoding'
        });
      }
      
      try {
        const deliveryGeocode = await locationService.geocodeAddress(delivery.address);
        deliveryCoordinates = deliveryGeocode.coordinates;
      } catch (geocodeError) {
        return res.status(400).json({
          message: 'Failed to geocode delivery address',
          error: geocodeError.message,
          address: delivery.address
        });
      }
    }

    const offer = new Offer({
      business: req.user.id,
      title,
      description,
      packageDetails,
      pickup: {
        ...pickup,
        coordinates: pickupCoordinates
      },
      delivery: {
        ...delivery,
        coordinates: deliveryCoordinates
      },
      payment
    });

    // Validate the offer using the model's validation method
    const validationErrors = offer.validateOffer();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Offer validation failed',
        errors: validationErrors
      });
    }

    // Calculate estimated distance and duration
    offer.updateEstimates();

    await offer.save();

    res.status(201).json({
      message: 'Offer created successfully',
      offer: offer.getSummary(),
      geocoding: {
        pickupGeocoded: pickup.coordinates !== pickupCoordinates,
        deliveryGeocoded: delivery.coordinates !== deliveryCoordinates
      }
    });
  } catch (err) {
    console.error('Create offer error:', err);
    res.status(500).json({ message: 'Server error creating offer' });
  }
});

// Rider: Get offers near location with filtering and sorting
router.get('/nearby', auth, async (req, res) => {
  if (req.user.role !== 'rider') return res.status(403).json({ message: 'Only riders can view offers' });
  
  const { 
    lng, 
    lat, 
    maxDistance = 10000,
    minPayment,
    maxPayment,
    packageType,
    vehicleType,
    sortBy = 'distance',
    limit = 50,
    page = 1
  } = req.query;
  
  if (!lng || !lat) {
    return res.status(400).json({ 
      message: 'Longitude and latitude are required',
      example: '/api/offers/nearby?lng=-74.006&lat=40.7128'
    });
  }

  try {
    const coordinates = [parseFloat(lng), parseFloat(lat)];
    const radiusInMeters = parseInt(maxDistance);
    const limitNum = Math.min(parseInt(limit), 200); // Max 200 results
    const skip = (parseInt(page) - 1) * limitNum;

    // Build filters object
    const filters = {
      sortBy,
      limit: limitNum
    };

    if (minPayment) filters.minPayment = parseFloat(minPayment);
    if (maxPayment) filters.maxPayment = parseFloat(maxPayment);
    if (packageType) filters.packageType = packageType;
    if (vehicleType) filters.vehicleType = vehicleType;

    // Use the enhanced geospatial query method
    let offers = await Offer.findWithinRadius(coordinates, radiusInMeters, filters);

    // Apply pagination if needed
    if (skip > 0) {
      offers = offers.slice(skip);
    }

    // Get total count for pagination info
    const totalOffers = await Offer.countDocuments({
      status: 'open',
      'pickup.coordinates': {
        $near: {
          $geometry: { type: 'Point', coordinates: coordinates },
          $maxDistance: radiusInMeters
        }
      }
    });

    const response = {
      offers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOffers / limitNum),
        totalOffers,
        hasNextPage: skip + limitNum < totalOffers,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        location: { lng: parseFloat(lng), lat: parseFloat(lat) },
        maxDistance: radiusInMeters,
        minPayment: filters.minPayment,
        maxPayment: filters.maxPayment,
        packageType: filters.packageType,
        vehicleType: filters.vehicleType,
        sortBy: filters.sortBy
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Nearby offers error:', err);
    res.status(500).json({ message: 'Server error fetching nearby offers' });
  }
});

// Rider: Accept offer (enhanced with status workflow)
router.post('/:id/accept', auth, async (req, res) => {
  if (req.user.role !== 'rider') {
    return res.status(403).json({ message: 'Only riders can accept offers' });
  }

  try {
    const { notes, location } = req.body;
    
    const offer = await Offer.findById(req.params.id)
      .populate('business', 'name profile.businessName profile.businessPhone');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Use the new status workflow system
    try {
      const statusUpdate = offer.updateStatus('accepted', req.user.id, { notes, location });
      await offer.save();

      // Create notification for business
      await Notification.create({
        user: offer.business._id,
        offer: offer._id,
        type: 'offer_accepted',
        message: `Your offer "${offer.title}" was accepted by a rider.`,
      });

      res.json({
        message: 'Offer accepted successfully',
        offer: offer.getSummary(),
        statusUpdate,
        business: offer.business
      });
    } catch (statusError) {
      return res.status(400).json({ 
        message: 'Cannot accept offer',
        error: statusError.message 
      });
    }
  } catch (err) {
    console.error('Accept offer error:', err);
    res.status(500).json({ message: 'Server error accepting offer' });
  }
});

// Business: Get own offers with filtering and sorting
router.get('/my-offers', auth, async (req, res) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({ message: 'Only businesses can view their offers' });
  }

  const {
    status,
    minPayment,
    maxPayment,
    sortBy = 'created',
    sortOrder = 'desc',
    limit = 50,
    page = 1,
    dateFrom,
    dateTo
  } = req.query;

  try {
    const limitNum = Math.min(parseInt(limit), 200);
    const skip = (parseInt(page) - 1) * limitNum;

    // Build query
    const query = { business: req.user.id };

    if (status) {
      const validStatuses = ['open', 'accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (minPayment) query['payment.amount'] = { $gte: parseFloat(minPayment) };
    if (maxPayment) query['payment.amount'] = { ...query['payment.amount'], $lte: parseFloat(maxPayment) };

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Build sort
    const sortOptions = {};
    switch (sortBy) {
      case 'payment':
        sortOptions['payment.amount'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'status':
        sortOptions.status = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'distance':
        sortOptions.estimatedDistance = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'created':
      default:
        sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
    }

    const offers = await Offer.find(query)
      .populate('acceptedBy', 'name profile.phone profile.vehicleType profile.rating')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalOffers = await Offer.countDocuments(query);

    const response = {
      offers: offers.map(offer => offer.getSummary()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOffers / limitNum),
        totalOffers,
        hasNextPage: skip + limitNum < totalOffers,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        status,
        minPayment: minPayment ? parseFloat(minPayment) : undefined,
        maxPayment: maxPayment ? parseFloat(maxPayment) : undefined,
        sortBy,
        sortOrder,
        dateFrom,
        dateTo
      }
    };

    res.json(response);
  } catch (err) {
    console.error('My offers error:', err);
    res.status(500).json({ message: 'Server error fetching offers' });
  }
});

// Rider: Get accepted offers with filtering and sorting
router.get('/my-deliveries', auth, async (req, res) => {
  if (req.user.role !== 'rider') {
    return res.status(403).json({ message: 'Only riders can view their deliveries' });
  }

  const {
    status,
    sortBy = 'accepted',
    sortOrder = 'desc',
    limit = 50,
    page = 1,
    dateFrom,
    dateTo
  } = req.query;

  try {
    const limitNum = Math.min(parseInt(limit), 200);
    const skip = (parseInt(page) - 1) * limitNum;

    // Build query
    const query = { acceptedBy: req.user.id };

    if (status) {
      const validStatuses = ['accepted', 'picked_up', 'in_transit', 'delivered', 'completed'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (dateFrom || dateTo) {
      query.acceptedAt = {};
      if (dateFrom) query.acceptedAt.$gte = new Date(dateFrom);
      if (dateTo) query.acceptedAt.$lte = new Date(dateTo);
    }

    // Build sort
    const sortOptions = {};
    switch (sortBy) {
      case 'payment':
        sortOptions['payment.amount'] = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'distance':
        sortOptions.estimatedDistance = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'accepted':
      default:
        sortOptions.acceptedAt = sortOrder === 'desc' ? -1 : 1;
    }

    const offers = await Offer.find(query)
      .populate('business', 'name profile.businessName profile.businessPhone')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalOffers = await Offer.countDocuments(query);

    const response = {
      offers: offers.map(offer => offer.getSummary()),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOffers / limitNum),
        totalOffers,
        hasNextPage: skip + limitNum < totalOffers,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        status,
        sortBy,
        sortOrder,
        dateFrom,
        dateTo
      }
    };

    res.json(response);
  } catch (err) {
    console.error('My deliveries error:', err);
    res.status(500).json({ message: 'Server error fetching deliveries' });
  }
});

// Get offer details by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('business', 'name profile.businessName profile.businessPhone profile.businessAddress')
      .populate('acceptedBy', 'name profile.phone profile.vehicleType profile.rating');

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check if user has permission to view this offer
    const canView = 
      (req.user.role === 'business' && offer.business._id.toString() === req.user.id) ||
      (req.user.role === 'rider' && (
        offer.status === 'open' || 
        (offer.acceptedBy && offer.acceptedBy._id.toString() === req.user.id)
      ));

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized to view this offer' });
    }

    res.json({
      offer: {
        ...offer.getSummary(),
        business: offer.business,
        acceptedBy: offer.acceptedBy
      }
    });
  } catch (err) {
    console.error('Get offer error:', err);
    res.status(500).json({ message: 'Server error fetching offer' });
  }
});

// General status update endpoint
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes, location } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        message: 'Status is required',
        validStatuses: ['accepted', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled']
      });
    }

    const offer = await Offer.findById(req.params.id)
      .populate('business', 'name profile.businessName profile.businessPhone')
      .populate('acceptedBy', 'name profile.phone profile.vehicleType');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Use the new status workflow system
    try {
      const statusUpdate = offer.updateStatus(status, req.user.id, { notes, location });
      await offer.save();

      // Create appropriate notification
      let notificationMessage = '';
      let notificationUser = null;
      
      switch (status) {
        case 'accepted':
          notificationMessage = `Your offer "${offer.title}" was accepted by a rider.`;
          notificationUser = offer.business._id;
          break;
        case 'picked_up':
          notificationMessage = `Package for "${offer.title}" has been picked up.`;
          notificationUser = offer.business._id;
          break;
        case 'in_transit':
          notificationMessage = `Package for "${offer.title}" is now in transit.`;
          notificationUser = offer.business._id;
          break;
        case 'delivered':
          notificationMessage = `Package for "${offer.title}" has been delivered.`;
          notificationUser = offer.business._id;
          break;
        case 'completed':
          notificationMessage = `Offer "${offer.title}" has been completed.`;
          notificationUser = req.user.role === 'business' ? offer.acceptedBy : offer.business._id;
          break;
        case 'cancelled':
          notificationMessage = `Offer "${offer.title}" has been cancelled.`;
          notificationUser = req.user.role === 'business' ? offer.acceptedBy : offer.business._id;
          break;
      }

      if (notificationUser) {
        await Notification.create({
          user: notificationUser,
          offer: offer._id,
          type: `offer_${status}`,
          message: notificationMessage,
        });
      }

      res.json({
        message: `Offer status updated to ${status}`,
        offer: offer.getSummary(),
        statusUpdate,
        statusInfo: offer.getCurrentStatusInfo()
      });
    } catch (statusError) {
      return res.status(400).json({ 
        message: 'Cannot update offer status',
        error: statusError.message,
        currentStatus: offer.status,
        validNextStates: offer.getValidStatusTransitions()[offer.status] || []
      });
    }
  } catch (err) {
    console.error('Update offer status error:', err);
    res.status(500).json({ message: 'Server error updating offer status' });
  }
});

// Rider: Update delivery status (convenience endpoints)
router.post('/:id/pickup', auth, async (req, res) => {
  if (req.user.role !== 'rider') {
    return res.status(403).json({ message: 'Only riders can update pickup status' });
  }

  try {
    const { notes, location } = req.body;
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const statusUpdate = offer.updateStatus('picked_up', req.user.id, { notes, location });
    await offer.save();

    // Notify business
    await Notification.create({
      user: offer.business,
      offer: offer._id,
      type: 'offer_picked_up',
      message: `Package for "${offer.title}" has been picked up.`,
    });

    res.json({
      message: 'Package marked as picked up',
      offer: offer.getSummary(),
      statusUpdate
    });
  } catch (err) {
    if (err.message.includes('Invalid status transition') || err.message.includes('Only the assigned rider')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Pickup status error:', err);
    res.status(500).json({ message: 'Server error updating pickup status' });
  }
});

router.post('/:id/in-transit', auth, async (req, res) => {
  if (req.user.role !== 'rider') {
    return res.status(403).json({ message: 'Only riders can update transit status' });
  }

  try {
    const { notes, location } = req.body;
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const statusUpdate = offer.updateStatus('in_transit', req.user.id, { notes, location });
    await offer.save();

    // Notify business
    await Notification.create({
      user: offer.business,
      offer: offer._id,
      type: 'offer_in_transit',
      message: `Package for "${offer.title}" is now in transit.`,
    });

    res.json({
      message: 'Package marked as in transit',
      offer: offer.getSummary(),
      statusUpdate
    });
  } catch (err) {
    if (err.message.includes('Invalid status transition') || err.message.includes('Only the assigned rider')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Transit status error:', err);
    res.status(500).json({ message: 'Server error updating transit status' });
  }
});

router.post('/:id/delivered', auth, async (req, res) => {
  if (req.user.role !== 'rider') {
    return res.status(403).json({ message: 'Only riders can update delivery status' });
  }

  try {
    const { notes, location } = req.body;
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const statusUpdate = offer.updateStatus('delivered', req.user.id, { notes, location });
    await offer.save();

    // Notify business
    await Notification.create({
      user: offer.business,
      offer: offer._id,
      type: 'offer_delivered',
      message: `Package for "${offer.title}" has been delivered.`,
    });

    res.json({
      message: 'Package marked as delivered',
      offer: offer.getSummary(),
      statusUpdate
    });
  } catch (err) {
    if (err.message.includes('Invalid status transition') || err.message.includes('Only the assigned rider')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Delivery status error:', err);
    res.status(500).json({ message: 'Server error updating delivery status' });
  }
});

// Complete offer (enhanced with status workflow)
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const { notes, location } = req.body;
    const offer = await Offer.findById(req.params.id)
      .populate('business', 'name profile.businessName')
      .populate('acceptedBy', 'name profile.phone');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Use the new status workflow system
    try {
      const statusUpdate = offer.updateStatus('completed', req.user.id, { notes, location });
      await offer.save();

      // Notify the other party
      const notifyUser = req.user.role === 'business' ? offer.acceptedBy._id : offer.business._id;
      if (notifyUser) {
        await Notification.create({
          user: notifyUser,
          offer: offer._id,
          type: 'offer_completed',
          message: `Offer "${offer.title}" has been completed.`,
        });
      }

      res.json({
        message: 'Offer marked as completed',
        offer: offer.getSummary(),
        statusUpdate,
        completedBy: req.user.role
      });
    } catch (statusError) {
      return res.status(400).json({ 
        message: 'Cannot complete offer',
        error: statusError.message 
      });
    }
  } catch (err) {
    console.error('Complete offer error:', err);
    res.status(500).json({ message: 'Server error completing offer' });
  }
});

// Cancel offer
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { notes, reason } = req.body;
    const offer = await Offer.findById(req.params.id)
      .populate('business', 'name profile.businessName')
      .populate('acceptedBy', 'name profile.phone');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Use the new status workflow system
    try {
      const statusUpdate = offer.updateStatus('cancelled', req.user.id, { 
        notes: notes || reason 
      });
      await offer.save();

      // Notify the other party
      const notifyUser = req.user.role === 'business' ? 
        (offer.acceptedBy ? offer.acceptedBy._id : null) : 
        offer.business._id;
        
      if (notifyUser) {
        await Notification.create({
          user: notifyUser,
          offer: offer._id,
          type: 'offer_cancelled',
          message: `Offer "${offer.title}" has been cancelled.`,
        });
      }

      res.json({
        message: 'Offer cancelled successfully',
        offer: offer.getSummary(),
        statusUpdate,
        cancelledBy: req.user.role,
        reason: notes || reason
      });
    } catch (statusError) {
      return res.status(400).json({ 
        message: 'Cannot cancel offer',
        error: statusError.message 
      });
    }
  } catch (err) {
    console.error('Cancel offer error:', err);
    res.status(500).json({ message: 'Server error cancelling offer' });
  }
});

// Get offer status history
router.get('/:id/status-history', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('statusHistory.updatedBy', 'name role profile.businessName profile.phone');
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check if user has permission to view this offer
    const canView = 
      (req.user.role === 'business' && offer.business.toString() === req.user.id) ||
      (req.user.role === 'rider' && offer.acceptedBy && offer.acceptedBy.toString() === req.user.id);

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized to view this offer' });
    }

    res.json({
      offerId: offer._id,
      currentStatus: offer.status,
      statusHistory: offer.getStatusHistory(),
      statusInfo: offer.getCurrentStatusInfo()
    });
  } catch (err) {
    console.error('Get status history error:', err);
    res.status(500).json({ message: 'Server error fetching status history' });
  }
});

// Get valid next status transitions
router.get('/:id/valid-transitions', auth, async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Check if user has permission to view this offer
    const canView = 
      (req.user.role === 'business' && offer.business.toString() === req.user.id) ||
      (req.user.role === 'rider' && (
        offer.status === 'open' || 
        (offer.acceptedBy && offer.acceptedBy.toString() === req.user.id)
      ));

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized to view this offer' });
    }

    const statusInfo = offer.getCurrentStatusInfo();
    const modificationInfo = offer.canBeModifiedBy(req.user.id);

    res.json({
      offerId: offer._id,
      currentStatus: offer.status,
      validNextStates: statusInfo.validNextStates,
      isTerminal: statusInfo.isTerminal,
      canModify: modificationInfo.canModify,
      allowedActions: modificationInfo.allowedActions || [],
      reason: modificationInfo.reason
    });
  } catch (err) {
    console.error('Get valid transitions error:', err);
    res.status(500).json({ message: 'Server error fetching valid transitions' });
  }
});

module.exports = router; 