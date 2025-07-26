/**
 * Offers API routes
 * GET /api/offers - List offers with filtering and pagination
 * POST /api/offers - Create new offer (business only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling, createPaginationResponse } from '@/lib/utils/api-response';
import { withAuth, withRole, requireVerification } from '@/lib/utils/auth-helpers';
import { 
  validateCreateOfferRequest, 
  validateOfferFilters,
  CreateOfferRequest,
  OfferFilters,
  OfferResponse,
  PaginatedOffersResponse
} from '@/lib/types';

/**
 * GET handler - List offers with filtering and pagination
 */
async function handleGetOffers(request: NextRequest, user: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 items per page
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    
    // Parse filters
    const filters: OfferFilters = {
      status: searchParams.get('status') || undefined,
      businessId: searchParams.get('businessId') || undefined,
      riderId: searchParams.get('riderId') || undefined,
      packageType: searchParams.get('packageType') || undefined,
      urgency: searchParams.get('urgency') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      pickupDate: searchParams.get('pickupDate') || undefined,
      deliveryDate: searchParams.get('deliveryDate') || undefined,
      location: {
        lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
        lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
        radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : undefined
      }
    };

    // Validate filters
    const filterValidation = validateOfferFilters(filters);
    if (!filterValidation.isValid) {
      return ApiResponseHelpers.validationError(filterValidation.errors);
    }

    // Build MongoDB query
    const query: any = {};

    // Role-based filtering
    if (user.role === 'business') {
      query.businessId = user.id;
    } else if (user.role === 'rider') {
      // Riders can see available offers or their assigned offers
      query.$or = [
        { status: 'pending', riderId: { $exists: false } },
        { riderId: user.id }
      ];
    }

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.businessId && user.role === 'admin') {
      query.businessId = filters.businessId;
    }
    if (filters.riderId && (user.role === 'admin' || user.role === 'business')) {
      query.riderId = filters.riderId;
    }
    if (filters.packageType) {
      query['package.type'] = filters.packageType;
    }
    if (filters.urgency) {
      query.urgency = filters.urgency;
    }
    if (filters.minPrice || filters.maxPrice) {
      query['pricing.total'] = {};
      if (filters.minPrice) query['pricing.total'].$gte = filters.minPrice;
      if (filters.maxPrice) query['pricing.total'].$lte = filters.maxPrice;
    }
    if (filters.pickupDate) {
      const pickupDate = new Date(filters.pickupDate);
      query['pickup.scheduledTime'] = {
        $gte: new Date(pickupDate.setHours(0, 0, 0, 0)),
        $lt: new Date(pickupDate.setHours(23, 59, 59, 999))
      };
    }
    if (filters.deliveryDate) {
      const deliveryDate = new Date(filters.deliveryDate);
      query['delivery.scheduledTime'] = {
        $gte: new Date(deliveryDate.setHours(0, 0, 0, 0)),
        $lt: new Date(deliveryDate.setHours(23, 59, 59, 999))
      };
    }

    // Geospatial filtering
    if (filters.location.lat && filters.location.lng) {
      const radius = filters.location.radius || 10; // Default 10km radius
      query['pickup.location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [filters.location.lng, filters.location.lat]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    // Get total count for pagination
    const totalItems = await Offer.countDocuments(query);

    // Execute query with pagination and sorting
    const offers = await Offer.find(query)
      .populate('businessId', 'email profile.businessName')
      .populate('riderId', 'email profile.firstName profile.lastName profile.rating')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Create pagination response
    const pagination = createPaginationResponse(page, totalItems, limit);

    // Transform offers for response
    const transformedOffers: OfferResponse[] = offers.map(offer => ({
      id: offer._id.toString(),
      businessId: offer.businessId._id.toString(),
      business: {
        name: offer.businessId.profile?.businessName || 'Unknown Business',
        email: offer.businessId.email
      },
      riderId: offer.riderId?._id.toString(),
      rider: offer.riderId ? {
        name: `${offer.riderId.profile?.firstName || ''} ${offer.riderId.profile?.lastName || ''}`.trim(),
        email: offer.riderId.email,
        rating: offer.riderId.profile?.rating?.average || 0
      } : undefined,
      status: offer.status,
      package: offer.package,
      pickup: offer.pickup,
      delivery: offer.delivery,
      pricing: offer.pricing,
      urgency: offer.urgency,
      specialInstructions: offer.specialInstructions,
      timeline: offer.timeline,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt
    }));

    const responseData: PaginatedOffersResponse = {
      offers: transformedOffers,
      pagination,
      filters: filters
    };

    return ApiResponseHelpers.success(responseData, 'Offers retrieved successfully');

  } catch (error) {
    console.error('Get offers error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve offers');
  }
}

/**
 * POST handler - Create new offer (business only)
 */
async function handleCreateOffer(request: NextRequest, user: any) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateCreateOfferRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const offerData: CreateOfferRequest = body;

    await connectDB();

    // Verify business user exists and is active
    const business = await User.findById(user.id);
    if (!business || business.role !== 'business' || !business.isActive) {
      return ApiResponseHelpers.forbidden('Invalid business account');
    }

    // Create new offer
    const newOffer = new Offer({
      businessId: user.id,
      status: 'pending',
      package: {
        type: offerData.package.type,
        weight: offerData.package.weight,
        dimensions: offerData.package.dimensions,
        description: offerData.package.description,
        value: offerData.package.value,
        fragile: offerData.package.fragile || false,
        requiresSignature: offerData.package.requiresSignature || false
      },
      pickup: {
        address: offerData.pickup.address,
        location: {
          type: 'Point',
          coordinates: [offerData.pickup.coordinates.lng, offerData.pickup.coordinates.lat]
        },
        contactName: offerData.pickup.contactName,
        contactPhone: offerData.pickup.contactPhone,
        scheduledTime: new Date(offerData.pickup.scheduledTime),
        instructions: offerData.pickup.instructions
      },
      delivery: {
        address: offerData.delivery.address,
        location: {
          type: 'Point',
          coordinates: [offerData.delivery.coordinates.lng, offerData.delivery.coordinates.lat]
        },
        contactName: offerData.delivery.contactName,
        contactPhone: offerData.delivery.contactPhone,
        scheduledTime: new Date(offerData.delivery.scheduledTime),
        instructions: offerData.delivery.instructions
      },
      pricing: {
        basePrice: offerData.pricing.basePrice,
        distancePrice: offerData.pricing.distancePrice || 0,
        urgencyPrice: offerData.pricing.urgencyPrice || 0,
        total: offerData.pricing.total
      },
      urgency: offerData.urgency || 'standard',
      specialInstructions: offerData.specialInstructions,
      timeline: {
        estimatedDuration: offerData.timeline?.estimatedDuration || 60, // Default 1 hour
        maxDeliveryTime: offerData.timeline?.maxDeliveryTime ? new Date(offerData.timeline.maxDeliveryTime) : undefined
      }
    });

    // Calculate distance and update pricing if needed
    // TODO: Implement distance calculation service
    // const distance = await calculateDistance(offerData.pickup.coordinates, offerData.delivery.coordinates);
    // newOffer.distance = distance;

    await newOffer.save();

    // Populate business information for response
    await newOffer.populate('businessId', 'email profile.businessName');

    // Transform offer for response
    const responseOffer: OfferResponse = {
      id: newOffer._id.toString(),
      businessId: newOffer.businessId._id.toString(),
      business: {
        name: newOffer.businessId.profile?.businessName || 'Unknown Business',
        email: newOffer.businessId.email
      },
      status: newOffer.status,
      package: newOffer.package,
      pickup: newOffer.pickup,
      delivery: newOffer.delivery,
      pricing: newOffer.pricing,
      urgency: newOffer.urgency,
      specialInstructions: newOffer.specialInstructions,
      timeline: newOffer.timeline,
      createdAt: newOffer.createdAt,
      updatedAt: newOffer.updatedAt
    };

    return ApiResponseHelpers.created(responseOffer, 'Offer created successfully');

  } catch (error) {
    console.error('Create offer error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to create offer');
  }
}

/**
 * GET handler with authentication
 */
export const GET = withAuth(handleGetOffers);

/**
 * POST handler with business role requirement and email verification
 */
export const POST = withRole('business', async (request: NextRequest, user: any) => {
  const verificationResult = requireVerification(request);
  if (!verificationResult.success) {
    return verificationResult.error;
  }
  return handleCreateOffer(request, user);
});

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}