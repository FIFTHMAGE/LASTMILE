const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const DeliveryTracking = require('../models/DeliveryTracking');
const Offer = require('../models/Offer');
const LocationTracking = require('../models/LocationTracking');
const { auth, requireRole } = require('../middleware/auth');

/**
 * @route    POST /api/delivery/start/:offerId
 * @desc     Start delivery tracking for an accepted offer
 * @access   Private (Rider only)
 */
router.post('/start/:offerId', auth, requireRole('rider'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId);
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }
    
    if (offer.acceptedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this offer'
      });
    }
    
    if (offer.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Offer must be in accepted status to start tracking'
      });
    }
    
    const tracking = await DeliveryTracking.createForOffer(offer);
    
    res.json({
      success: true,
      message: 'Delivery tracking started',
      tracking: tracking.getTrackingData()
    });
  } catch (error) {
    console.error('Error starting delivery tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting delivery tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/track/:offerId
 * @desc     Get delivery tracking information
 * @access   Private (Business owner or assigned rider)
 */
router.get('/track/:offerId', auth, async (req, res) => {
  try {
    const tracking = await DeliveryTracking.getByOfferId(req.params.offerId);
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    // Check if user has permission to view this tracking
    const isBusinessOwner = tracking.business.toString() === req.user.id;
    const isAssignedRider = tracking.rider.toString() === req.user.id;
    
    if (!isBusinessOwner && !isAssignedRider) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Get recent location data if available
    const recentLocation = await LocationTracking.findOne({
      rider: tracking.rider,
      offer: tracking.offer,
      isActive: true
    }).sort({ timestamp: -1 });
    
    const trackingData = tracking.getTrackingData();
    if (recentLocation) {
      trackingData.currentLocation = {
        coordinates: recentLocation.currentLocation.coordinates,
        timestamp: recentLocation.timestamp,
        accuracy: recentLocation.accuracy,
        heading: recentLocation.heading,
        speed: recentLocation.speed
      };
    }
    
    res.json({
      success: true,
      tracking: trackingData
    });
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching delivery tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/delivery/:offerId/event
 * @desc     Add delivery event
 * @access   Private (Assigned rider only)
 */
router.post('/:offerId/event', [
  auth,
  requireRole('rider'),
  check('eventType', 'Event type is required').notEmpty(),
  check('eventType', 'Invalid event type').isIn([
    'heading_to_pickup',
    'arrived_at_pickup',
    'pickup_attempted',
    'package_picked_up',
    'departure_from_pickup',
    'in_transit',
    'arrived_at_delivery',
    'delivery_attempted',
    'package_delivered',
    'delivery_completed',
    'delivery_cancelled',
    'issue_reported',
    'customer_contacted',
    'route_deviated',
    'delay_reported'
  ])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { eventType, notes, location, metadata } = req.body;
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId });
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    if (!tracking.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Delivery tracking is not active'
      });
    }
    
    await tracking.addEvent(eventType, {
      location,
      notes,
      metadata,
      reportedBy: req.user.id
    });
    
    // Update the related offer status if needed
    const offer = await Offer.findById(req.params.offerId);
    if (offer && eventType === 'package_delivered') {
      offer.status = 'delivered';
      offer.deliveredAt = new Date();
      await offer.save();
    } else if (offer && eventType === 'delivery_completed') {
      offer.status = 'completed';
      offer.completedAt = new Date();
      await offer.save();
    }
    
    res.json({
      success: true,
      message: 'Event added successfully',
      tracking: tracking.getTrackingData()
    });
  } catch (error) {
    console.error('Error adding delivery event:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding delivery event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/delivery/:offerId/pickup-attempt
 * @desc     Record pickup attempt
 * @access   Private (Assigned rider only)
 */
router.post('/:offerId/pickup-attempt', [
  auth,
  requireRole('rider'),
  check('successful', 'Successful status is required').isBoolean(),
  check('notes', 'Notes are required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { successful, notes, contactAttempts } = req.body;
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId });
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    await tracking.addPickupAttempt({
      successful,
      notes,
      contactAttempts: contactAttempts || []
    });
    
    res.json({
      success: true,
      message: 'Pickup attempt recorded',
      tracking: tracking.getTrackingData()
    });
  } catch (error) {
    console.error('Error recording pickup attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording pickup attempt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/delivery/:offerId/delivery-attempt
 * @desc     Record delivery attempt
 * @access   Private (Assigned rider only)
 */
router.post('/:offerId/delivery-attempt', [
  auth,
  requireRole('rider'),
  check('successful', 'Successful status is required').isBoolean(),
  check('notes', 'Notes are required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const {
      successful,
      notes,
      deliveryMethod,
      signatureRequired,
      signatureObtained,
      photoTaken,
      contactAttempts
    } = req.body;
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId });
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    await tracking.addDeliveryAttempt({
      successful,
      notes,
      deliveryMethod,
      signatureRequired: signatureRequired || false,
      signatureObtained: signatureObtained || false,
      photoTaken: photoTaken || false,
      contactAttempts: contactAttempts || []
    });
    
    res.json({
      success: true,
      message: 'Delivery attempt recorded',
      tracking: tracking.getTrackingData()
    });
  } catch (error) {
    console.error('Error recording delivery attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording delivery attempt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/delivery/:offerId/issue
 * @desc     Report delivery issue
 * @access   Private (Assigned rider only)
 */
router.post('/:offerId/issue', [
  auth,
  requireRole('rider'),
  check('type', 'Issue type is required').isIn([
    'traffic_delay',
    'weather_delay',
    'vehicle_breakdown',
    'package_damaged',
    'wrong_address',
    'customer_unavailable',
    'access_denied',
    'safety_concern',
    'other'
  ]),
  check('description', 'Description is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { type, description, impactOnDelivery } = req.body;
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId });
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    await tracking.reportIssue({
      type,
      description,
      reportedBy: req.user.id,
      impactOnDelivery: impactOnDelivery || 'minor_delay'
    });
    
    res.json({
      success: true,
      message: 'Issue reported successfully',
      tracking: tracking.getTrackingData()
    });
  } catch (error) {
    console.error('Error reporting issue:', error);
    res.status(500).json({
      success: false,
      message: 'Server error reporting issue',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    PUT /api/delivery/:offerId/eta
 * @desc     Update estimated arrival time
 * @access   Private (Assigned rider only)
 */
router.put('/:offerId/eta', [
  auth,
  requireRole('rider'),
  check('estimatedArrivalTime', 'Estimated arrival time is required').isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { estimatedArrivalTime } = req.body;
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId });
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    await tracking.updateETA(new Date(estimatedArrivalTime));
    
    res.json({
      success: true,
      message: 'ETA updated successfully',
      estimatedArrivalTime: tracking.estimatedArrivalTime,
      estimatedTimeRemaining: tracking.estimatedTimeRemaining
    });
  } catch (error) {
    console.error('Error updating ETA:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating ETA',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/rider/active
 * @desc     Get active deliveries for rider
 * @access   Private (Rider only)
 */
router.get('/rider/active', auth, requireRole('rider'), async (req, res) => {
  try {
    const activeDeliveries = await DeliveryTracking.getActiveDeliveriesForRider(req.user.id);
    
    const deliveriesWithLocation = await Promise.all(
      activeDeliveries.map(async (delivery) => {
        const recentLocation = await LocationTracking.findOne({
          rider: delivery.rider,
          offer: delivery.offer,
          isActive: true
        }).sort({ timestamp: -1 });
        
        const deliveryData = delivery.getTrackingData();
        if (recentLocation) {
          deliveryData.currentLocation = {
            coordinates: recentLocation.currentLocation.coordinates,
            timestamp: recentLocation.timestamp
          };
        }
        
        return deliveryData;
      })
    );
    
    res.json({
      success: true,
      activeDeliveries: deliveriesWithLocation,
      count: deliveriesWithLocation.length
    });
  } catch (error) {
    console.error('Error fetching active deliveries:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching active deliveries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/business/active
 * @desc     Get active deliveries for business
 * @access   Private (Business only)
 */
router.get('/business/active', auth, requireRole('business'), async (req, res) => {
  try {
    const activeDeliveries = await DeliveryTracking.find({
      business: req.user.id,
      isActive: true
    })
      .populate('offer', 'title pickup delivery payment')
      .populate('rider', 'name profile.phone profile.vehicleType')
      .sort({ acceptedAt: -1 });
    
    const deliveriesWithLocation = await Promise.all(
      activeDeliveries.map(async (delivery) => {
        const recentLocation = await LocationTracking.findOne({
          rider: delivery.rider,
          offer: delivery.offer,
          isActive: true
        }).sort({ timestamp: -1 });
        
        const deliveryData = delivery.getTrackingData();
        if (recentLocation) {
          deliveryData.currentLocation = {
            coordinates: recentLocation.currentLocation.coordinates,
            timestamp: recentLocation.timestamp
          };
        }
        
        return deliveryData;
      })
    );
    
    res.json({
      success: true,
      activeDeliveries: deliveriesWithLocation,
      count: deliveriesWithLocation.length
    });
  } catch (error) {
    console.error('Error fetching business active deliveries:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching active deliveries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/status/:status
 * @desc     Get deliveries by status
 * @access   Private (Admin only)
 */
router.get('/status/:status', auth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const deliveries = await DeliveryTracking.getByStatus(status, {
      limit: parseInt(limit),
      skip
    });
    
    const total = await DeliveryTracking.countDocuments({
      currentStatus: status,
      isActive: status !== 'completed' && status !== 'cancelled'
    });
    
    res.json({
      success: true,
      deliveries: deliveries.map(d => d.getTrackingData()),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching deliveries by status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching deliveries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/stats
 * @desc     Get delivery statistics
 * @access   Private (Admin only)
 */
router.get('/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate, riderId, businessId } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (riderId) filters.riderId = riderId;
    if (businessId) filters.businessId = businessId;
    
    const stats = await DeliveryTracking.getDeliveryStats(filters);
    
    // Get current active deliveries count
    const activeCount = await DeliveryTracking.countDocuments({ isActive: true });
    
    // Get status breakdown
    const statusBreakdown = await DeliveryTracking.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: {
        ...stats,
        activeDeliveries: activeCount,
        statusBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching delivery stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching delivery statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/:offerId/history
 * @desc     Get delivery event history
 * @access   Private (Business owner or assigned rider)
 */
router.get('/:offerId/history', auth, async (req, res) => {
  try {
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId })
      .populate('rider', 'name profile.phone')
      .populate('business', 'name profile.businessName');
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    // Check permissions
    const isBusinessOwner = tracking.business._id.toString() === req.user.id;
    const isAssignedRider = tracking.rider._id.toString() === req.user.id;
    
    if (!isBusinessOwner && !isAssignedRider) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      history: {
        offer: req.params.offerId,
        rider: tracking.rider,
        business: tracking.business,
        currentStatus: tracking.currentStatus,
        events: tracking.events,
        pickupAttempts: tracking.pickupAttempts,
        deliveryAttempts: tracking.deliveryAttempts,
        issues: tracking.issues,
        metrics: tracking.calculateMetrics()
      }
    });
  } catch (error) {
    console.error('Error fetching delivery history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching delivery history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/delivery/:offerId/calculate-eta
 * @desc     Calculate estimated arrival time based on current location and traffic
 * @access   Private (Assigned rider only)
 */
router.post('/:offerId/calculate-eta', [
  auth,
  requireRole('rider'),
  check('currentLocation', 'Current location is required').notEmpty(),
  check('currentLocation.coordinates', 'Valid coordinates are required').isArray({ min: 2, max: 2 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { currentLocation, vehicleType = 'bike', trafficFactor = 1.0 } = req.body;
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId })
      .populate('offer', 'pickup delivery estimatedDistance');
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    // Calculate ETA based on current status and location
    let destinationCoords;
    let estimatedMinutes = 0;
    
    if (['accepted', 'heading_to_pickup'].includes(tracking.currentStatus)) {
      // Going to pickup location
      destinationCoords = tracking.offer.pickup.coordinates;
    } else if (['picked_up', 'in_transit', 'heading_to_delivery'].includes(tracking.currentStatus)) {
      // Going to delivery location
      destinationCoords = tracking.offer.delivery.coordinates;
    } else {
      return res.status(400).json({
        success: false,
        message: 'ETA calculation not applicable for current delivery status'
      });
    }
    
    // Calculate distance using Haversine formula
    const distance = calculateDistance(currentLocation.coordinates, destinationCoords);
    
    // Calculate time based on vehicle type and traffic
    const speeds = {
      bike: 15,      // km/h
      scooter: 25,   // km/h
      car: 30,       // km/h
      van: 25        // km/h
    };
    
    const baseSpeed = speeds[vehicleType] || speeds.bike;
    const adjustedSpeed = baseSpeed / trafficFactor; // Adjust for traffic
    const timeInHours = (distance / 1000) / adjustedSpeed;
    estimatedMinutes = Math.round(timeInHours * 60);
    
    // Add buffer time (5-15 minutes depending on distance)
    const bufferTime = Math.max(5, Math.min(15, estimatedMinutes * 0.2));
    estimatedMinutes += bufferTime;
    
    // Calculate ETA
    const estimatedArrivalTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
    
    // Update tracking with new ETA
    await tracking.updateETA(estimatedArrivalTime);
    
    res.json({
      success: true,
      eta: {
        estimatedArrivalTime,
        estimatedMinutes,
        distance: Math.round(distance),
        currentLocation: currentLocation.coordinates,
        destination: destinationCoords,
        vehicleType,
        trafficFactor
      }
    });
  } catch (error) {
    console.error('Error calculating ETA:', error);
    res.status(500).json({
      success: false,
      message: 'Server error calculating ETA',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/:offerId/route-optimization
 * @desc     Get route optimization suggestions
 * @access   Private (Assigned rider only)
 */
router.get('/:offerId/route-optimization', auth, requireRole('rider'), async (req, res) => {
  try {
    const { currentLocation } = req.query;
    
    if (!currentLocation) {
      return res.status(400).json({
        success: false,
        message: 'Current location is required'
      });
    }
    
    const coords = currentLocation.split(',').map(Number);
    if (coords.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location format. Use: lng,lat'
      });
    }
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId })
      .populate('offer', 'pickup delivery');
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    // Simple route optimization (in a real app, you'd use Google Maps API or similar)
    const pickupCoords = tracking.offer.pickup.coordinates;
    const deliveryCoords = tracking.offer.delivery.coordinates;
    
    const distanceToPickup = calculateDistance(coords, pickupCoords);
    const distanceToDelivery = calculateDistance(coords, deliveryCoords);
    const pickupToDelivery = calculateDistance(pickupCoords, deliveryCoords);
    
    // Calculate optimal route
    let routeSuggestion;
    if (tracking.currentStatus === 'accepted' || tracking.currentStatus === 'heading_to_pickup') {
      routeSuggestion = {
        nextDestination: 'pickup',
        coordinates: pickupCoords,
        address: tracking.offer.pickup.address,
        distance: Math.round(distanceToPickup),
        estimatedTime: Math.round((distanceToPickup / 1000) / 15 * 60), // Assuming 15 km/h
        instructions: 'Head to pickup location'
      };
    } else if (tracking.currentStatus === 'picked_up' || tracking.currentStatus === 'in_transit') {
      routeSuggestion = {
        nextDestination: 'delivery',
        coordinates: deliveryCoords,
        address: tracking.offer.delivery.address,
        distance: Math.round(distanceToDelivery),
        estimatedTime: Math.round((distanceToDelivery / 1000) / 15 * 60),
        instructions: 'Head to delivery location'
      };
    }
    
    res.json({
      success: true,
      routeOptimization: {
        currentLocation: coords,
        suggestion: routeSuggestion,
        totalDistance: Math.round(distanceToPickup + pickupToDelivery),
        alternativeRoutes: [
          {
            name: 'Fastest Route',
            description: 'Direct route with minimal stops',
            estimatedTime: routeSuggestion ? routeSuggestion.estimatedTime : 0
          },
          {
            name: 'Scenic Route',
            description: 'Longer but more pleasant route',
            estimatedTime: routeSuggestion ? Math.round(routeSuggestion.estimatedTime * 1.2) : 0
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error getting route optimization:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting route optimization',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    POST /api/delivery/:offerId/location-update
 * @desc     Update rider location and recalculate ETA
 * @access   Private (Assigned rider only)
 */
router.post('/:offerId/location-update', [
  auth,
  requireRole('rider'),
  check('coordinates', 'Valid coordinates are required').isArray({ min: 2, max: 2 }),
  check('coordinates.*', 'Coordinates must be numbers').isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { coordinates, accuracy, heading, speed, batteryLevel } = req.body;
    
    const tracking = await DeliveryTracking.findOne({ offer: req.params.offerId })
      .populate('offer', 'pickup delivery');
    
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }
    
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this delivery'
      });
    }
    
    // Update location in LocationTracking
    await LocationTracking.updateRiderLocation(req.user.id, {
      coordinates,
      accuracy,
      heading,
      speed,
      batteryLevel,
      offerId: req.params.offerId,
      trackingType: getTrackingTypeFromStatus(tracking.currentStatus)
    });
    
    // Recalculate ETA if delivery is active
    if (tracking.isActive && ['heading_to_pickup', 'picked_up', 'in_transit'].includes(tracking.currentStatus)) {
      let destinationCoords;
      if (['heading_to_pickup'].includes(tracking.currentStatus)) {
        destinationCoords = tracking.offer.pickup.coordinates;
      } else {
        destinationCoords = tracking.offer.delivery.coordinates;
      }
      
      const distance = calculateDistance(coordinates, destinationCoords);
      const estimatedMinutes = Math.round((distance / 1000) / 15 * 60) + 10; // 15 km/h + 10 min buffer
      const estimatedArrivalTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);
      
      await tracking.updateETA(estimatedArrivalTime);
    }
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      location: {
        coordinates,
        timestamp: new Date(),
        accuracy,
        heading,
        speed
      },
      estimatedArrivalTime: tracking.estimatedArrivalTime,
      estimatedTimeRemaining: tracking.estimatedTimeRemaining
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route    GET /api/delivery/analytics/performance
 * @desc     Get delivery performance analytics
 * @access   Private (Admin only)
 */
router.get('/analytics/performance', auth, requireRole('admin'), async (req, res) => {
  try {
    const { period = 'week', riderId, businessId } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    const match = {
      completedAt: { $gte: startDate, $lte: now },
      isActive: false
    };
    
    if (riderId) match.rider = new mongoose.Types.ObjectId(riderId);
    if (businessId) match.business = new mongoose.Types.ObjectId(businessId);
    
    // Performance analytics aggregation
    const analytics = await DeliveryTracking.aggregate([
      { $match: match },
      {
        $addFields: {
          totalDuration: {
            $divide: [
              { $subtract: ['$completedAt', '$acceptedAt'] },
              1000 * 60 // Convert to minutes
            ]
          },
          isOnTime: {
            $lte: ['$actualDeliveryTime', '$estimatedDeliveryTime']
          },
          hasIssues: {
            $gt: [{ $size: { $ifNull: ['$issues', []] } }, 0]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          averageDuration: { $avg: '$totalDuration' },
          onTimeDeliveries: { $sum: { $cond: ['$isOnTime', 1, 0] } },
          deliveriesWithIssues: { $sum: { $cond: ['$hasIssues', 1, 0] } },
          completedDeliveries: {
            $sum: { $cond: [{ $eq: ['$currentStatus', 'completed'] }, 1, 0] }
          },
          cancelledDeliveries: {
            $sum: { $cond: [{ $eq: ['$currentStatus', 'cancelled'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalDeliveries: 1,
          averageDuration: { $round: ['$averageDuration', 2] },
          onTimeRate: {
            $round: [
              { $multiply: [{ $divide: ['$onTimeDeliveries', '$totalDeliveries'] }, 100] },
              2
            ]
          },
          issueRate: {
            $round: [
              { $multiply: [{ $divide: ['$deliveriesWithIssues', '$totalDeliveries'] }, 100] },
              2
            ]
          },
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completedDeliveries', '$totalDeliveries'] }, 100] },
              2
            ]
          },
          cancellationRate: {
            $round: [
              { $multiply: [{ $divide: ['$cancelledDeliveries', '$totalDeliveries'] }, 100] },
              2
            ]
          }
        }
      }
    ]);
    
    // Daily performance trend
    const dailyTrend = await DeliveryTracking.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          deliveries: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$currentStatus', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          deliveries: 1,
          completed: 1,
          completionRate: {
            $round: [
              { $multiply: [{ $divide: ['$completed', '$deliveries'] }, 100] },
              2
            ]
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      analytics: {
        period,
        summary: analytics.length > 0 ? analytics[0] : {
          totalDeliveries: 0,
          averageDuration: 0,
          onTimeRate: 0,
          issueRate: 0,
          completionRate: 0,
          cancellationRate: 0
        },
        dailyTrend
      }
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching performance analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions

/**
 * Calculate distance between two coordinate points using Haversine formula
 * @param {Array} coords1 - [lng, lat]
 * @param {Array} coords2 - [lng, lat]
 * @returns {Number} Distance in meters
 */
function calculateDistance(coords1, coords2) {
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Get tracking type based on delivery status
 * @param {String} status - Delivery status
 * @returns {String} Tracking type
 */
function getTrackingTypeFromStatus(status) {
  const mapping = {
    'accepted': 'idle',
    'heading_to_pickup': 'heading_to_pickup',
    'arrived_at_pickup': 'at_pickup',
    'picked_up': 'heading_to_delivery',
    'in_transit': 'heading_to_delivery',
    'arrived_at_delivery': 'at_delivery',
    'delivered': 'idle',
    'completed': 'idle',
    'cancelled': 'idle'
  };
  
  return mapping[status] || 'idle';
}

module.exports = router;