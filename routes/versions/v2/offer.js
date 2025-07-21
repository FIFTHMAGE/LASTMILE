/**
 * Offer Routes - Version 2.0
 * Enhanced offer management with breaking changes
 */

const express = require('express');
const Offer = require('../../../models/Offer');
const { auth: authenticateToken } = require('../../../middleware/auth');
const { LocationService } = require('../../../services/LocationService');
const { NotificationService } = require('../../../services/NotificationService');

const router = express.Router();

/**
 * V2 Get Nearby Offers
 * Enhanced with advanced filtering and pagination
 */
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const {
      location,
      radius = 10000,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minPayment,
      maxPayment,
      packageType,
      vehicleType,
      urgency
    } = req.query;

    // V2: Enhanced location handling
    let coordinates;
    if (location) {
      try {
        coordinates = JSON.parse(location);
        if (!Array.isArray(coordinates) || coordinates.length !== 2) {
          throw new Error('Invalid location format');
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Location must be a valid JSON array [lng, lat]',
            code: 'INVALID_LOCATION_FORMAT',
            statusCode: 400,
            field: 'location',
            timestamp: new Date().toISOString()
          }
        });
      }
    } else if (req.user.profile?.currentLocation) {
      coordinates = req.user.profile.currentLocation.coordinates;
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Location is required',
          code: 'LOCATION_REQUIRED',
          statusCode: 400,
          field: 'location',
          timestamp: new Date().toISOString()
        }
      });
    }

    // V2: Advanced filtering
    const filter = {
      status: 'open',
      'pickup.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: Number(radius)
        }
      }
    };

    // Payment range filtering
    if (minPayment || maxPayment) {
      filter['payment.amount'] = {};
      if (minPayment) filter['payment.amount'].$gte = Number(minPayment);
      if (maxPayment) filter['payment.amount'].$lte = Number(maxPayment);
    }

    // Package type filtering
    if (packageType) {
      filter['packageDetails.type'] = packageType;
    }

    // Vehicle type filtering (if offer specifies required vehicle)
    if (vehicleType) {
      filter['requirements.vehicleType'] = { $in: [vehicleType, null] };
    }

    // Urgency filtering
    if (urgency) {
      const now = new Date();
      const urgencyHours = {
        'immediate': 1,
        'urgent': 4,
        'standard': 24
      };
      
      if (urgencyHours[urgency]) {
        const deadline = new Date(now.getTime() + urgencyHours[urgency] * 60 * 60 * 1000);
        filter['delivery.deliverBy'] = { $lte: deadline };
      }
    }

    // V2: Enhanced sorting options
    const sortOptions = {};
    const validSortFields = ['createdAt', 'payment.amount', 'estimatedDistance', 'estimatedDuration'];
    
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    // V2: Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const totalCount = await Offer.countDocuments(filter);

    const offers = await Offer.find(filter)
      .populate('business', 'name profile.businessName profile.businessPhone profile.rating')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // V2: Enhanced response format
    const formattedOffers = offers.map(offer => ({
      id: offer._id,
      title: offer.title,
      description: offer.description,
      business: {
        id: offer.business._id,
        name: offer.business.name,
        businessName: offer.business.profile?.businessName,
        phone: offer.business.profile?.businessPhone,
        rating: offer.business.profile?.rating || 0,
        // V2: Enhanced business metadata
        metadata: {
          verified: offer.business.isVerified || false,
          memberSince: offer.business.createdAt
        }
      },
      pickup: {
        address: offer.pickup.address,
        location: {
          type: 'Point',
          coordinates: offer.pickup.coordinates
        },
        contactInfo: {
          name: offer.pickup.contactName,
          phone: offer.pickup.contactPhone
        },
        availability: {
          from: offer.pickup.availableFrom,
          until: offer.pickup.availableUntil
        }
      },
      delivery: {
        address: offer.delivery.address,
        location: {
          type: 'Point',
          coordinates: offer.delivery.coordinates
        },
        contactInfo: {
          name: offer.delivery.contactName,
          phone: offer.delivery.contactPhone
        },
        deadline: offer.delivery.deliverBy
      },
      payment: {
        amount: offer.payment.amount,
        currency: offer.payment.currency || 'USD',
        method: offer.payment.paymentMethod || 'platform'
      },
      packageDetails: {
        ...offer.packageDetails,
        // V2: Enhanced package info
        estimatedWeight: offer.packageDetails.weight,
        dimensions: offer.packageDetails.dimensions,
        specialHandling: {
          fragile: offer.packageDetails.fragile || false,
          temperature: offer.packageDetails.temperature || 'ambient',
          instructions: offer.packageDetails.specialInstructions
        }
      },
      logistics: {
        distance: offer.estimatedDistance,
        estimatedDuration: offer.estimatedDuration,
        difficulty: calculateDifficulty(offer), // V2: New field
        urgency: calculateUrgency(offer)        // V2: New field
      },
      status: offer.status,
      timestamps: {
        created: offer.createdAt,
        updated: offer.updatedAt
      },
      // V2: Enhanced metadata
      metadata: {
        version: 'v2',
        compatibility: ['v1', 'v2'],
        features: ['advanced-filtering', 'enhanced-tracking']
      }
    }));

    // V2: Enhanced pagination response
    const pagination = {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalItems: totalCount,
      itemsPerPage: Number(limit),
      hasNext: Number(page) < Math.ceil(totalCount / Number(limit)),
      hasPrev: Number(page) > 1,
      // V2: Additional pagination metadata
      startIndex: skip + 1,
      endIndex: Math.min(skip + Number(limit), totalCount)
    };

    res.json({
      success: true,
      data: {
        offers: formattedOffers,
        pagination,
        filters: {
          location: {
            coordinates,
            radius: Number(radius)
          },
          applied: {
            minPayment: minPayment ? Number(minPayment) : null,
            maxPayment: maxPayment ? Number(maxPayment) : null,
            packageType,
            vehicleType,
            urgency
          }
        },
        sorting: {
          field: sortBy,
          order: sortOrder
        },
        // V2: Response metadata
        metadata: {
          version: 'v2',
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - req.startTime
        }
      }
    });
  } catch (error) {
    console.error('V2 Get nearby offers error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch nearby offers',
        code: 'FETCH_OFFERS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
});

/**
 * V2 Create Offer
 * Enhanced with validation and features
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'business') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only businesses can create offers',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      title,
      description,
      pickup,
      delivery,
      payment,
      packageDetails,
      requirements,
      preferences
    } = req.body;

    // V2: Enhanced validation
    const validationErrors = [];

    if (!title || title.length < 3) {
      validationErrors.push({
        field: 'title',
        message: 'Title must be at least 3 characters long',
        code: 'TITLE_TOO_SHORT'
      });
    }

    if (!pickup?.address || !delivery?.address) {
      validationErrors.push({
        field: 'addresses',
        message: 'Both pickup and delivery addresses are required',
        code: 'MISSING_ADDRESSES'
      });
    }

    if (!payment?.amount || payment.amount <= 0) {
      validationErrors.push({
        field: 'payment.amount',
        message: 'Payment amount must be greater than 0',
        code: 'INVALID_PAYMENT_AMOUNT'
      });
    }

    // V2: Package weight validation
    if (packageDetails?.weight && packageDetails.weight > 50) {
      validationErrors.push({
        field: 'packageDetails.weight',
        message: 'Package weight cannot exceed 50kg',
        code: 'PACKAGE_TOO_HEAVY'
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details: validationErrors,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Geocode addresses
    const locationService = new LocationService();
    const pickupCoords = await locationService.geocodeAddress(pickup.address);
    const deliveryCoords = await locationService.geocodeAddress(delivery.address);

    if (!pickupCoords || !deliveryCoords) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Unable to geocode one or more addresses',
          code: 'GEOCODING_FAILED',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Calculate enhanced logistics
    const distance = await locationService.calculateDistance(pickupCoords, deliveryCoords);
    const estimatedDuration = calculateEstimatedDuration(distance, packageDetails?.weight);

    const offer = new Offer({
      business: req.user._id,
      title,
      description: description || '',
      pickup: {
        address: pickup.address,
        coordinates: pickupCoords,
        contactName: pickup.contactName || req.user.name,
        contactPhone: pickup.contactPhone || req.user.profile?.businessPhone || '',
        availableFrom: pickup.availableFrom ? new Date(pickup.availableFrom) : new Date(),
        availableUntil: pickup.availableUntil ? new Date(pickup.availableUntil) : null
      },
      delivery: {
        address: delivery.address,
        coordinates: deliveryCoords,
        contactName: delivery.contactName || '',
        contactPhone: delivery.contactPhone || '',
        deliverBy: delivery.deliverBy ? new Date(delivery.deliverBy) : null
      },
      payment: {
        amount: Number(payment.amount),
        currency: payment.currency || 'USD',
        paymentMethod: payment.method || 'platform'
      },
      packageDetails: {
        weight: packageDetails?.weight || 0,
        dimensions: packageDetails?.dimensions || {},
        fragile: packageDetails?.fragile || false,
        temperature: packageDetails?.temperature || 'ambient',
        specialInstructions: packageDetails?.specialInstructions || '',
        type: packageDetails?.type || 'general'
      },
      requirements: {
        vehicleType: requirements?.vehicleType || null,
        experience: requirements?.experience || 'any',
        rating: requirements?.minRating || 0
      },
      preferences: {
        riderGender: preferences?.riderGender || 'any',
        communication: preferences?.communication || 'standard'
      },
      status: 'open',
      estimatedDistance: distance,
      estimatedDuration: estimatedDuration
    });

    await offer.save();

    // V2: Send notifications to nearby riders
    const notificationService = new NotificationService();
    await notificationService.notifyNearbyRiders(offer);

    // V2: Enhanced response format
    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: {
        offer: {
          id: offer._id,
          title: offer.title,
          description: offer.description,
          pickup: {
            address: offer.pickup.address,
            location: {
              type: 'Point',
              coordinates: offer.pickup.coordinates
            },
            contactInfo: {
              name: offer.pickup.contactName,
              phone: offer.pickup.contactPhone
            },
            availability: {
              from: offer.pickup.availableFrom,
              until: offer.pickup.availableUntil
            }
          },
          delivery: {
            address: offer.delivery.address,
            location: {
              type: 'Point',
              coordinates: offer.delivery.coordinates
            },
            deadline: offer.delivery.deliverBy
          },
          payment: {
            amount: offer.payment.amount,
            currency: offer.payment.currency,
            method: offer.payment.paymentMethod
          },
          packageDetails: offer.packageDetails,
          requirements: offer.requirements,
          preferences: offer.preferences,
          logistics: {
            distance: offer.estimatedDistance,
            estimatedDuration: offer.estimatedDuration,
            difficulty: calculateDifficulty(offer),
            urgency: calculateUrgency(offer)
          },
          status: offer.status,
          timestamps: {
            created: offer.createdAt
          },
          metadata: {
            version: 'v2',
            notificationsSent: true,
            estimatedRiders: await countNearbyRiders(offer.pickup.coordinates)
          }
        }
      }
    });
  } catch (error) {
    console.error('V2 Create offer error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create offer',
        code: 'CREATE_OFFER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
});

/**
 * V2 Accept Offer
 * Enhanced with conflict resolution and notifications
 */
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Only riders can accept offers',
          code: 'INSUFFICIENT_PERMISSIONS',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      });
    }

    const { estimatedArrival, notes } = req.body;

    // V2: Use transactions for atomic operations
    const session = await Offer.startSession();
    
    try {
      await session.withTransaction(async () => {
        const offer = await Offer.findById(req.params.id)
          .populate('business', 'name profile.businessName profile.businessPhone')
          .session(session);
        
        if (!offer) {
          throw new Error('OFFER_NOT_FOUND');
        }

        if (offer.status !== 'open') {
          throw new Error('OFFER_NOT_AVAILABLE');
        }

        // V2: Check rider eligibility
        const eligibilityCheck = await checkRiderEligibility(req.user, offer);
        if (!eligibilityCheck.eligible) {
          throw new Error(`RIDER_NOT_ELIGIBLE: ${eligibilityCheck.reason}`);
        }

        // Accept the offer
        offer.status = 'accepted';
        offer.acceptedBy = req.user._id;
        offer.acceptedAt = new Date();
        offer.riderNotes = notes || '';
        offer.estimatedArrival = estimatedArrival ? new Date(estimatedArrival) : null;
        
        await offer.save({ session });

        // V2: Create delivery tracking record
        const DeliveryTracking = require('../../../models/DeliveryTracking');
        const tracking = new DeliveryTracking({
          offer: offer._id,
          rider: req.user._id,
          events: [{
            type: 'accepted',
            timestamp: new Date(),
            location: req.user.profile?.currentLocation,
            notes: notes || 'Offer accepted'
          }],
          currentLocation: req.user.profile?.currentLocation,
          estimatedArrival: offer.estimatedArrival
        });
        
        await tracking.save({ session });

        // V2: Send notifications
        const notificationService = new NotificationService();
        await notificationService.notifyOfferAccepted(offer, req.user);

        return { offer, tracking };
      });

      await session.commitTransaction();

      // Fetch updated offer for response
      const updatedOffer = await Offer.findById(req.params.id)
        .populate('business', 'name profile.businessName profile.businessPhone')
        .populate('acceptedBy', 'name profile.phone profile.vehicleType profile.rating');

      // V2: Enhanced response format
      res.json({
        success: true,
        message: 'Offer accepted successfully',
        data: {
          offer: {
            id: updatedOffer._id,
            title: updatedOffer.title,
            business: {
              id: updatedOffer.business._id,
              name: updatedOffer.business.name,
              businessName: updatedOffer.business.profile?.businessName,
              contactPhone: updatedOffer.business.profile?.businessPhone
            },
            rider: {
              id: updatedOffer.acceptedBy._id,
              name: updatedOffer.acceptedBy.name,
              phone: updatedOffer.acceptedBy.profile?.phone,
              vehicleType: updatedOffer.acceptedBy.profile?.vehicleType,
              rating: updatedOffer.acceptedBy.profile?.rating || 0
            },
            pickup: {
              address: updatedOffer.pickup.address,
              location: {
                type: 'Point',
                coordinates: updatedOffer.pickup.coordinates
              },
              contactInfo: {
                name: updatedOffer.pickup.contactName,
                phone: updatedOffer.pickup.contactPhone
              }
            },
            delivery: {
              address: updatedOffer.delivery.address,
              location: {
                type: 'Point',
                coordinates: updatedOffer.delivery.coordinates
              },
              deadline: updatedOffer.delivery.deliverBy
            },
            payment: {
              amount: updatedOffer.payment.amount,
              currency: updatedOffer.payment.currency
            },
            logistics: {
              distance: updatedOffer.estimatedDistance,
              estimatedDuration: updatedOffer.estimatedDuration,
              estimatedArrival: updatedOffer.estimatedArrival
            },
            status: updatedOffer.status,
            timestamps: {
              created: updatedOffer.createdAt,
              accepted: updatedOffer.acceptedAt
            },
            tracking: {
              enabled: true,
              trackingId: updatedOffer._id // In real app, this would be the tracking record ID
            },
            metadata: {
              version: 'v2',
              notificationsSent: true,
              transactionId: session.id
            }
          }
        }
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('V2 Accept offer error:', error);
    
    let statusCode = 500;
    let errorCode = 'ACCEPT_OFFER_ERROR';
    let message = 'Failed to accept offer';

    if (error.message === 'OFFER_NOT_FOUND') {
      statusCode = 404;
      errorCode = 'OFFER_NOT_FOUND';
      message = 'Offer not found';
    } else if (error.message === 'OFFER_NOT_AVAILABLE') {
      statusCode = 409;
      errorCode = 'OFFER_NOT_AVAILABLE';
      message = 'Offer is no longer available';
    } else if (error.message.startsWith('RIDER_NOT_ELIGIBLE')) {
      statusCode = 403;
      errorCode = 'RIDER_NOT_ELIGIBLE';
      message = error.message.split(': ')[1] || 'Rider not eligible for this offer';
    }
    
    res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: errorCode,
        statusCode,
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
});

// Helper functions
function calculateDifficulty(offer) {
  let difficulty = 'easy';
  
  if (offer.estimatedDistance > 10000) difficulty = 'medium';
  if (offer.estimatedDistance > 25000) difficulty = 'hard';
  if (offer.packageDetails?.fragile) difficulty = 'hard';
  if (offer.packageDetails?.weight > 20) difficulty = 'medium';
  if (offer.packageDetails?.weight > 35) difficulty = 'hard';
  
  return difficulty;
}

function calculateUrgency(offer) {
  if (!offer.delivery?.deliverBy) return 'standard';
  
  const now = new Date();
  const deadline = new Date(offer.delivery.deliverBy);
  const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
  
  if (hoursUntilDeadline <= 1) return 'immediate';
  if (hoursUntilDeadline <= 4) return 'urgent';
  return 'standard';
}

function calculateEstimatedDuration(distance, weight = 0) {
  // Base time: 3 minutes per km
  let duration = Math.ceil(distance / 1000 * 3);
  
  // Add time for heavy packages
  if (weight > 10) duration += 5;
  if (weight > 25) duration += 10;
  
  return duration;
}

async function checkRiderEligibility(rider, offer) {
  // Check vehicle type requirement
  if (offer.requirements?.vehicleType && 
      rider.profile?.vehicleType !== offer.requirements.vehicleType) {
    return { eligible: false, reason: 'Vehicle type mismatch' };
  }
  
  // Check minimum rating requirement
  if (offer.requirements?.rating && 
      (rider.profile?.rating || 0) < offer.requirements.rating) {
    return { eligible: false, reason: 'Rating too low' };
  }
  
  // Check if rider is available
  if (!rider.profile?.isAvailable) {
    return { eligible: false, reason: 'Rider not available' };
  }
  
  return { eligible: true };
}

async function countNearbyRiders(coordinates) {
  const User = require('../../../models/User');
  
  const count = await User.countDocuments({
    role: 'rider',
    'profile.isAvailable': true,
    'profile.currentLocation': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: 15000 // 15km radius
      }
    }
  });
  
  return count;
}

module.exports = router;