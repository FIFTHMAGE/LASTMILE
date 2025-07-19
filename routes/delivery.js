const express = require('express');
const router = express.Router();
const DeliveryTracking = require('../models/DeliveryTracking');
const Offer = require('../models/Offer');
const NotificationService = require('../services/NotificationService');
const auth = require('../middleware/auth');

// Initialize notification service
const notificationService = new NotificationService();

/**
 * @route POST /api/delivery/tracking
 * @desc Create delivery tracking for an accepted offer
 * @access Private (Rider only)
 */
router.post('/tracking', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can create delivery tracking'
      });
    }

    const { offerId, initialLocation, metadata = {} } = req.body;

    // Validate required fields
    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: 'Offer ID is required'
      });
    }

    // Verify offer exists and is accepted by this rider
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found'
      });
    }

    if (offer.acceptedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only create tracking for your own accepted offers'
      });
    }

    if (offer.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Can only create tracking for accepted offers'
      });
    }

    // Check if tracking already exists
    const existingTracking = await DeliveryTracking.findOne({ offer: offerId });
    if (existingTracking) {
      return res.status(409).json({
        success: false,
        message: 'Delivery tracking already exists for this offer'
      });
    }

    // Create delivery tracking
    const tracking = await DeliveryTracking.createForOffer(
      offerId,
      req.user.id,
      offer.business,
      { initialLocation, metadata }
    );

    res.status(201).json({
      success: true,
      message: 'Delivery tracking created successfully',
      data: {
        tracking: tracking.getSummary()
      }
    });
  } catch (error) {
    console.error('Create delivery tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create delivery tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/delivery/:trackingId/status
 * @desc Update delivery status
 * @access Private (Rider only)
 */
router.put('/:trackingId/status', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can update delivery status'
      });
    }

    const { trackingId } = req.params;
    const { status, location, description, metadata = {} } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Find delivery tracking
    const tracking = await DeliveryTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }

    // Verify rider owns this delivery
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own deliveries'
      });
    }

    // Update status
    await tracking.updateStatus(status, {
      location,
      description,
      reportedBy: req.user.id,
      metadata
    });

    // Update offer status if needed
    const offer = await Offer.findById(tracking.offer);
    if (offer && offer.status !== status) {
      offer.status = status;
      await offer.save();
    }

    // Send notifications
    if (notificationService) {
      try {
        await notificationService.sendOfferNotification(
          tracking.offer,
          `offer_${status}`,
          { 
            data: { 
              trackingId: tracking._id,
              location,
              timestamp: new Date()
            }
          }
        );
      } catch (notificationError) {
        console.error('Failed to send status update notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.json({
      success: true,
      message: `Delivery status updated to ${status}`,
      data: {
        tracking: tracking.getSummary()
      }
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    
    if (error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/delivery/:trackingId/location
 * @desc Update current location
 * @access Private (Rider only)
 */
router.put('/:trackingId/location', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can update delivery location'
      });
    }

    const { trackingId } = req.params;
    const { coordinates, address, accuracy, speed, heading } = req.body;

    // Validate required fields
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid coordinates [longitude, latitude] are required'
      });
    }

    // Find delivery tracking
    const tracking = await DeliveryTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }

    // Verify rider owns this delivery
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update location for your own deliveries'
      });
    }

    // Update location
    await tracking.updateLocation(coordinates, {
      address,
      accuracy,
      speed,
      heading
    });

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        currentLocation: tracking.currentLocation,
        lastUpdated: tracking.currentLocation.lastUpdated
      }
    });
  } catch (error) {
    console.error('Update delivery location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery location',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/delivery/:trackingId/issues
 * @desc Report an issue during delivery
 * @access Private (Rider only)
 */
router.post('/:trackingId/issues', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can report delivery issues'
      });
    }

    const { trackingId } = req.params;
    const { type, description, location, severity, photos } = req.body;

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Issue type and description are required'
      });
    }

    // Find delivery tracking
    const tracking = await DeliveryTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }

    // Verify rider owns this delivery
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only report issues for your own deliveries'
      });
    }

    // Report issue
    await tracking.reportIssue({
      type,
      description,
      reportedBy: req.user.id,
      location,
      severity,
      photos
    });

    // Send notification to business
    if (notificationService) {
      try {
        await notificationService.send({
          userId: tracking.business,
          type: 'delivery_issue',
          title: 'Delivery Issue Reported',
          message: `An issue has been reported for your delivery: ${description}`,
          data: {
            trackingId: tracking._id,
            offerId: tracking.offer,
            issueType: type,
            severity: severity || 'medium'
          }
        });
      } catch (notificationError) {
        console.error('Failed to send issue notification:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      data: {
        issue: tracking.issues[tracking.issues.length - 1],
        tracking: tracking.getSummary()
      }
    });
  } catch (error) {
    console.error('Report delivery issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report delivery issue',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/delivery/:trackingId/confirm
 * @desc Confirm delivery completion
 * @access Private (Rider only)
 */
router.post('/:trackingId/confirm', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can confirm deliveries'
      });
    }

    const { trackingId } = req.params;
    const { confirmationType, confirmationData, deliveryLocation, notes } = req.body;

    // Validate required fields
    if (!confirmationType) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation type is required'
      });
    }

    // Find delivery tracking
    const tracking = await DeliveryTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }

    // Verify rider owns this delivery
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only confirm your own deliveries'
      });
    }

    // Confirm delivery
    await tracking.confirmDelivery({
      confirmationType,
      confirmationData,
      deliveryLocation,
      notes
    });

    // Send notification to business
    if (notificationService) {
      try {
        await notificationService.sendOfferNotification(
          tracking.offer,
          'delivered',
          { 
            data: { 
              trackingId: tracking._id,
              confirmationType,
              deliveredAt: new Date()
            }
          }
        );
      } catch (notificationError) {
        console.error('Failed to send delivery confirmation notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Delivery confirmed successfully',
      data: {
        deliveryConfirmation: tracking.deliveryConfirmation,
        tracking: tracking.getSummary()
      }
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/delivery/:trackingId
 * @desc Get delivery tracking details
 * @access Private (Business owner or Rider)
 */
router.get('/:trackingId', auth, async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { detailed = false } = req.query;

    // Find delivery tracking
    const tracking = await DeliveryTracking.findById(trackingId)
      .populate('offer', 'title pickup delivery payment')
      .populate('rider', 'name email profile.phone')
      .populate('business', 'businessName email profile.phone');

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }

    // Verify user has access to this tracking
    const userId = req.user.id;
    if (tracking.rider._id.toString() !== userId && tracking.business._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Return appropriate level of detail
    const trackingData = detailed === 'true' ? 
      tracking.getDetailedTracking() : 
      tracking.getSummary();

    res.json({
      success: true,
      data: {
        tracking: trackingData,
        offer: tracking.offer,
        rider: tracking.rider,
        business: tracking.business
      }
    });
  } catch (error) {
    console.error('Get delivery tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/delivery/offer/:offerId
 * @desc Get delivery tracking by offer ID
 * @access Private (Business owner or Rider)
 */
router.get('/offer/:offerId', auth, async (req, res) => {
  try {
    const { offerId } = req.params;

    // Find delivery tracking by offer
    const tracking = await DeliveryTracking.getByOfferId(offerId);

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found for this offer'
      });
    }

    // Verify user has access to this tracking
    const userId = req.user.id;
    if (tracking.rider._id.toString() !== userId && tracking.business._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        tracking: tracking.getSummary(),
        offer: tracking.offer,
        rider: tracking.rider,
        business: tracking.business
      }
    });
  } catch (error) {
    console.error('Get delivery tracking by offer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery tracking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/delivery/rider/active
 * @desc Get active deliveries for the authenticated rider
 * @access Private (Rider only)
 */
router.get('/rider/active', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can access active deliveries'
      });
    }

    // Get active deliveries
    const activeDeliveries = await DeliveryTracking.getActiveDeliveries(req.user.id);

    res.json({
      success: true,
      data: {
        activeDeliveries: activeDeliveries.map(tracking => ({
          ...tracking.getSummary(),
          offer: tracking.offer,
          business: tracking.business
        })),
        count: activeDeliveries.length
      }
    });
  } catch (error) {
    console.error('Get active deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active deliveries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/delivery/business/deliveries
 * @desc Get deliveries for the authenticated business
 * @access Private (Business only)
 */
router.get('/business/deliveries', auth, async (req, res) => {
  try {
    // Verify user is business
    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        message: 'Only businesses can access delivery list'
      });
    }

    const {
      status,
      page = 1,
      limit = 20
    } = req.query;

    const skip = (page - 1) * limit;
    const options = {
      status,
      limit: parseInt(limit),
      skip
    };

    // Get business deliveries
    const deliveries = await DeliveryTracking.getBusinessDeliveries(req.user.id, options);

    res.json({
      success: true,
      data: {
        deliveries: deliveries.map(tracking => ({
          ...tracking.getSummary(),
          offer: tracking.offer,
          rider: tracking.rider
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: deliveries.length
        }
      }
    });
  } catch (error) {
    console.error('Get business deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve business deliveries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route PUT /api/delivery/:trackingId/estimate
 * @desc Update estimated delivery time
 * @access Private (Rider only)
 */
router.put('/:trackingId/estimate', auth, async (req, res) => {
  try {
    // Verify user is rider
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        message: 'Only riders can update delivery estimates'
      });
    }

    const { trackingId } = req.params;
    const { distance, traffic, weather, timeOfDay } = req.body;

    // Find delivery tracking
    const tracking = await DeliveryTracking.findById(trackingId);
    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Delivery tracking not found'
      });
    }

    // Verify rider owns this delivery
    if (tracking.rider.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update estimates for your own deliveries'
      });
    }

    // Update estimated delivery
    await tracking.updateEstimatedDelivery({
      distance,
      traffic,
      weather,
      timeOfDay
    });

    res.json({
      success: true,
      message: 'Delivery estimate updated successfully',
      data: {
        estimatedDelivery: tracking.estimatedDelivery,
        estimatedTimeRemaining: tracking.estimatedTimeRemaining
      }
    });
  } catch (error) {
    console.error('Update delivery estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery estimate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/delivery/stats
 * @desc Get delivery statistics
 * @access Private
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const {
      startDate,
      endDate
    } = req.query;

    // Build filters based on user role
    const filters = {
      startDate,
      endDate
    };

    if (req.user.role === 'rider') {
      filters.riderId = req.user.id;
    } else if (req.user.role === 'business') {
      filters.businessId = req.user.id;
    }

    // Get delivery statistics
    const stats = await DeliveryTracking.getDeliveryStats(filters);

    res.json({
      success: true,
      data: {
        stats,
        period: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve delivery statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;