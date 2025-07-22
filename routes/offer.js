const express = require('express');
const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const LocationService = require('../services/LocationService');
const { cacheStrategies } = require('../services/CacheStrategies');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');
const { 
  auth, 
  requireRole, 
  requireVerification 
} = require('../middleware/auth');

const router = express.Router();
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Business: Post offer (enhanced)
router.post('/', auth, requireRole('business'), requireVerification(), cacheMiddleware.invalidateOffers, async (req, res) => {
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

    // Invalidate related caches after creating new offer
    await cacheStrategies.invalidateBusinessOffers(req.user.id);
    await cacheStrategies.cache.clearPattern('offers:nearby:*');

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

// Rider: Get offers near location with enhanced filtering and sorting
router.get('/nearby', auth, cacheMiddleware.nearbyOffers, async (req, res) => {
  if (req.user.role !== 'rider') return res.status(403).json({ message: 'Only riders can view offers' });
  
  const { 
    lng, 
    lat, 
    maxDistance = 10000,
    minDistance = 0,
    minPayment,
    maxPayment,
    packageType,
    vehicleType,
    sortBy = 'distance',
    sortOrder = 'asc',
    limit = 50,
    page = 1,
    fragile,
    maxWeight,
    maxDimensions,
    availableFrom,
    availableUntil,
    deliverBy,
    paymentMethod,
    businessId,
    createdAfter,
    createdBefore
  } = req.query;
  
  if (!lng || !lat) {
    return res.status(400).json({ 
      message: 'Longitude and latitude are required',
      example: '/api/offers/nearby?lng=-74.006&lat=40.7128&maxDistance=5000&minPayment=10&sortBy=payment'
    });
  }

  try {
    // Create filters object for caching
    const filters = {
      minDistance, minPayment, maxPayment, packageType, vehicleType,
      sortBy, sortOrder, limit, page, fragile, maxWeight, maxDimensions,
      availableFrom, availableUntil, deliverBy, paymentMethod, businessId,
      createdAfter, createdBefore
    };

    // Try to get from cache first
    const cachedOffers = await cacheStrategies.getNearbyOffers(
      parseFloat(lat), 
      parseFloat(lng), 
      parseInt(maxDistance), 
      filters
    );

    if (cachedOffers) {
      return res.json(cachedOffers);
    }
    const coordinates = [parseFloat(lng), parseFloat(lat)];
    const radiusInMeters = parseInt(maxDistance);
    const minRadiusInMeters = parseInt(minDistance);
    const limitNum = Math.min(parseInt(limit), 200); // Max 200 results
    const skip = (parseInt(page) - 1) * limitNum;

    // Build comprehensive aggregation pipeline
    const pipeline = [
      // Geospatial matching
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: coordinates
          },
          distanceField: 'distanceFromRider',
          maxDistance: radiusInMeters,
          minDistance: minRadiusInMeters,
          spherical: true,
          query: { status: 'open' }
        }
      },
      // Lookup business information
      {
        $lookup: {
          from: 'users',
          localField: 'business',
          foreignField: '_id',
          as: 'businessInfo'
        }
      },
      // Add calculated fields
      {
        $addFields: {
          businessInfo: { $arrayElemAt: ['$businessInfo', 0] },
          packageVolume: {
            $multiply: [
              { $ifNull: ['$packageDetails.dimensions.length', 0] },
              { $ifNull: ['$packageDetails.dimensions.width', 0] },
              { $ifNull: ['$packageDetails.dimensions.height', 0] }
            ]
          }
        }
      }
    ];

    // Add filtering stages
    const matchConditions = {};

    // Payment filters
    if (minPayment) matchConditions['payment.amount'] = { $gte: parseFloat(minPayment) };
    if (maxPayment) matchConditions['payment.amount'] = { ...matchConditions['payment.amount'], $lte: parseFloat(maxPayment) };
    if (paymentMethod) matchConditions['payment.paymentMethod'] = paymentMethod;

    // Package filters
    if (fragile !== undefined) matchConditions['packageDetails.fragile'] = fragile === 'true';
    if (maxWeight) matchConditions['packageDetails.weight'] = { $lte: parseFloat(maxWeight) };
    
    // Vehicle compatibility filter
    if (vehicleType) {
      const vehicleConstraints = getVehicleConstraints(vehicleType);
      if (vehicleConstraints.maxWeight) {
        matchConditions['packageDetails.weight'] = { 
          ...matchConditions['packageDetails.weight'], 
          $lte: vehicleConstraints.maxWeight 
        };
      }
      if (vehicleConstraints.maxVolume) {
        matchConditions.packageVolume = { $lte: vehicleConstraints.maxVolume };
      }
    }

    // Dimension filters
    if (maxDimensions) {
      const [maxL, maxW, maxH] = maxDimensions.split(',').map(d => parseFloat(d));
      if (maxL) matchConditions['packageDetails.dimensions.length'] = { $lte: maxL };
      if (maxW) matchConditions['packageDetails.dimensions.width'] = { $lte: maxW };
      if (maxH) matchConditions['packageDetails.dimensions.height'] = { $lte: maxH };
    }

    // Time filters
    if (availableFrom) matchConditions['pickup.availableFrom'] = { $gte: new Date(availableFrom) };
    if (availableUntil) matchConditions['pickup.availableUntil'] = { $lte: new Date(availableUntil) };
    if (deliverBy) matchConditions['delivery.deliverBy'] = { $lte: new Date(deliverBy) };

    // Business filter
    if (businessId) matchConditions.business = new mongoose.Types.ObjectId(businessId);

    // Creation date filters
    if (createdAfter) matchConditions.createdAt = { $gte: new Date(createdAfter) };
    if (createdBefore) matchConditions.createdAt = { ...matchConditions.createdAt, $lte: new Date(createdBefore) };

    // Add match stage if we have conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add sorting
    const sortStage = {};
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'distance':
        sortStage.distanceFromRider = sortDirection;
        break;
      case 'payment':
        sortStage['payment.amount'] = sortDirection;
        break;
      case 'created':
        sortStage.createdAt = sortDirection;
        break;
      case 'weight':
        sortStage['packageDetails.weight'] = sortDirection;
        break;
      case 'deliverBy':
        sortStage['delivery.deliverBy'] = sortDirection;
        break;
      case 'estimatedDuration':
        sortStage.estimatedDuration = sortDirection;
        break;
      default:
        sortStage.distanceFromRider = 1; // Default to distance ascending
    }
    pipeline.push({ $sort: sortStage });

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Execute aggregation
    const offers = await Offer.aggregate(pipeline);

    // Get total count for pagination (run same pipeline without skip/limit)
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit
    countPipeline.push({ $count: 'total' });
    const countResult = await Offer.aggregate(countPipeline);
    const totalOffers = countResult.length > 0 ? countResult[0].total : 0;

    // Format response
    const formattedOffers = offers.map(offer => ({
      ...offer,
      id: offer._id,
      distanceFromRider: Math.round(offer.distanceFromRider),
      business: {
        id: offer.businessInfo._id,
        name: offer.businessInfo.name,
        businessName: offer.businessInfo.profile?.businessName,
        businessPhone: offer.businessInfo.profile?.businessPhone
      }
    }));

    const response = {
      offers: formattedOffers,
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
        minDistance: minRadiusInMeters,
        minPayment: minPayment ? parseFloat(minPayment) : undefined,
        maxPayment: maxPayment ? parseFloat(maxPayment) : undefined,
        packageType,
        vehicleType,
        fragile: fragile !== undefined ? fragile === 'true' : undefined,
        maxWeight: maxWeight ? parseFloat(maxWeight) : undefined,
        maxDimensions,
        paymentMethod,
        businessId,
        sortBy,
        sortOrder,
        availableFrom,
        availableUntil,
        deliverBy,
        createdAfter,
        createdBefore
      },
      availableFilters: {
        sortOptions: ['distance', 'payment', 'created', 'weight', 'deliverBy', 'estimatedDuration'],
        sortOrders: ['asc', 'desc'],
        paymentMethods: ['cash', 'card', 'digital'],
        vehicleTypes: ['bike', 'scooter', 'car', 'van'],
        packageTypes: ['fragile', 'regular']
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Nearby offers error:', err);
    res.status(500).json({ message: 'Server error fetching nearby offers' });
  }
});

// Helper function to get vehicle constraints
function getVehicleConstraints(vehicleType) {
  const constraints = {
    bike: { maxWeight: 5, maxVolume: 50000 }, // 5kg, 50L (50x50x20cm)
    scooter: { maxWeight: 15, maxVolume: 150000 }, // 15kg, 150L
    car: { maxWeight: 50, maxVolume: 500000 }, // 50kg, 500L
    van: { maxWeight: 200, maxVolume: 2000000 } // 200kg, 2000L
  };
  return constraints[vehicleType] || constraints.bike;
}

// Rider: Accept offer (enhanced with status workflow)
router.post('/:id/accept', auth, requireRole('rider'), requireVerification(), async (req, res) => {
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
router.get('/my-offers', auth, cacheMiddleware.userOffers, async (req, res) => {
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
    // Try to get from cache first (only for simple queries without date filters)
    if (!dateFrom && !dateTo && page === '1') {
      const cachedOffers = await cacheStrategies.getBusinessOffers(req.user.id, status);
      if (cachedOffers) {
        return res.json(cachedOffers);
      }
    }
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