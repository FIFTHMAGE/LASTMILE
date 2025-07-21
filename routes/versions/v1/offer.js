/**
 * Offer Routes - Version 1.0
 * Backward compatible offer management endpoints
 */

const express = require('express');
const Offer = require('../../../models/Offer');
const { auth: authenticateToken } = require('../../../middleware/auth');
const { LocationService } = require('../../../services/LocationService');

const router = express.Router();

/**
 * V1 Get Nearby Offers
 * Maintains backward compatibility with legacy coordinate format
 */
router.get('/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, radius = 10000, coordinates } = req.query;
    
    // Handle legacy coordinate formats
    let location;
    if (coordinates) {
      // Legacy: coordinates as comma-separated string
      const [longitude, latitude] = coordinates.split(',').map(Number);
      location = [longitude, latitude];
    } else if (lat && lng) {
      location = [Number(lng), Number(lat)];
    } else if (req.user.profile?.currentLocation) {
      location = req.user.profile.currentLocation.coordinates;
    } else {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Location is required (lat, lng or coordinates)',
          code: 'LOCATION_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    const offers = await Offer.find({
      status: 'open',
      'pickup.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: location
          },
          $maxDistance: Number(radius)
        }
      }
    })
    .populate('business', 'name profile.businessName profile.businessPhone')
    .sort({ createdAt: -1 })
    .limit(50);

    // V1 Response format with legacy coordinate format
    const formattedOffers = offers.map(offer => ({
      id: offer._id,
      title: offer.title,
      description: offer.description,
      business: {
        id: offer.business._id,
        name: offer.business.name,
        businessName: offer.business.profile?.businessName,
        phone: offer.business.profile?.businessPhone
      },
      pickup: {
        address: offer.pickup.address,
        coordinates: offer.pickup.coordinates, // V1: Array format
        lat: offer.pickup.coordinates[1],      // V1: Separate lat/lng
        lng: offer.pickup.coordinates[0],
        contactName: offer.pickup.contactName,
        contactPhone: offer.pickup.contactPhone
      },
      delivery: {
        address: offer.delivery.address,
        coordinates: offer.delivery.coordinates,
        lat: offer.delivery.coordinates[1],
        lng: offer.delivery.coordinates[0],
        contactName: offer.delivery.contactName,
        contactPhone: offer.delivery.contactPhone
      },
      payment: {
        amount: offer.payment.amount,
        currency: offer.payment.currency || 'USD'
      },
      packageDetails: offer.packageDetails,
      distance: offer.estimatedDistance,
      estimatedDuration: offer.estimatedDuration,
      status: offer.status,
      createdAt: offer.createdAt
    }));

    res.json({
      success: true,
      data: {
        offers: formattedOffers,
        count: formattedOffers.length,
        // V1: Simple pagination format
        pagination: {
          page: 1,
          limit: 50,
          total: formattedOffers.length
        },
        location: {
          coordinates: location,
          lat: location[1],
          lng: location[0],
          radius: Number(radius)
        }
      }
    });
  } catch (error) {
    console.error('V1 Get nearby offers error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch nearby offers',
        code: 'FETCH_OFFERS_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * V1 Create Offer
 * Maintains backward compatibility
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
      pickupAddress,
      deliveryAddress,
      packageDetails,
      paymentAmount,
      // V1 legacy fields
      pickup_address,
      delivery_address,
      payment_amount
    } = req.body;

    // Handle legacy field names
    const finalPickupAddress = pickupAddress || pickup_address;
    const finalDeliveryAddress = deliveryAddress || delivery_address;
    const finalPaymentAmount = paymentAmount || payment_amount;

    if (!finalPickupAddress || !finalDeliveryAddress || !finalPaymentAmount) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Pickup address, delivery address, and payment amount are required',
          code: 'MISSING_REQUIRED_FIELDS',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Geocode addresses
    const locationService = new LocationService();
    const pickupCoords = await locationService.geocodeAddress(finalPickupAddress);
    const deliveryCoords = await locationService.geocodeAddress(finalDeliveryAddress);

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

    // Calculate distance
    const distance = await locationService.calculateDistance(pickupCoords, deliveryCoords);

    const offer = new Offer({
      business: req.user._id,
      title: title || 'Delivery Request',
      description: description || '',
      pickup: {
        address: finalPickupAddress,
        coordinates: pickupCoords,
        contactName: req.user.name,
        contactPhone: req.user.profile?.businessPhone || ''
      },
      delivery: {
        address: finalDeliveryAddress,
        coordinates: deliveryCoords
      },
      payment: {
        amount: Number(finalPaymentAmount),
        currency: 'USD'
      },
      packageDetails: packageDetails || {},
      status: 'open',
      estimatedDistance: distance,
      estimatedDuration: Math.ceil(distance / 1000 * 3) // Rough estimate: 3 minutes per km
    });

    await offer.save();

    // V1 Response format
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
            coordinates: offer.pickup.coordinates,
            lat: offer.pickup.coordinates[1],
            lng: offer.pickup.coordinates[0]
          },
          delivery: {
            address: offer.delivery.address,
            coordinates: offer.delivery.coordinates,
            lat: offer.delivery.coordinates[1],
            lng: offer.delivery.coordinates[0]
          },
          payment: {
            amount: offer.payment.amount,
            currency: offer.payment.currency
          },
          packageDetails: offer.packageDetails,
          status: offer.status,
          distance: offer.estimatedDistance,
          estimatedDuration: offer.estimatedDuration,
          createdAt: offer.createdAt
        }
      }
    });
  } catch (error) {
    console.error('V1 Create offer error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create offer',
        code: 'CREATE_OFFER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * V1 Accept Offer
 * Maintains backward compatibility
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

    const offer = await Offer.findById(req.params.id).populate('business', 'name profile.businessName');
    
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Offer not found',
          code: 'OFFER_NOT_FOUND',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (offer.status !== 'open') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Offer is no longer available',
          code: 'OFFER_NOT_AVAILABLE',
          statusCode: 409,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Accept the offer
    offer.status = 'accepted';
    offer.acceptedBy = req.user._id;
    offer.acceptedAt = new Date();
    
    await offer.save();

    // V1 Response format
    res.json({
      success: true,
      message: 'Offer accepted successfully',
      data: {
        offer: {
          id: offer._id,
          title: offer.title,
          business: {
            id: offer.business._id,
            name: offer.business.name,
            businessName: offer.business.profile?.businessName
          },
          pickup: {
            address: offer.pickup.address,
            coordinates: offer.pickup.coordinates,
            lat: offer.pickup.coordinates[1],
            lng: offer.pickup.coordinates[0],
            contactName: offer.pickup.contactName,
            contactPhone: offer.pickup.contactPhone
          },
          delivery: {
            address: offer.delivery.address,
            coordinates: offer.delivery.coordinates,
            lat: offer.delivery.coordinates[1],
            lng: offer.delivery.coordinates[0]
          },
          payment: {
            amount: offer.payment.amount,
            currency: offer.payment.currency
          },
          status: offer.status,
          acceptedAt: offer.acceptedAt
        }
      }
    });
  } catch (error) {
    console.error('V1 Accept offer error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to accept offer',
        code: 'ACCEPT_OFFER_ERROR',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;