/**
 * Nearby offers API route
 * GET /api/offers/nearby - Get nearby available offers (rider only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { ApiResponseHelpers, withErrorHandling, createPaginationResponse } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';
import { validateNearbyOffersRequest, NearbyOffersRequest, OfferResponse, PaginatedOffersResponse } from '@/lib/types';

/**
 * GET handler - Get nearby available offers (rider only)
 */
async function handleGetNearbyOffers(request: NextRequest, user: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10'); // Default 10km
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 items per page
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    
    // Optional filters
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const urgency = searchParams.get('urgency') || undefined;
    const packageType = searchParams.get('packageType') || undefined;

    // Validate required parameters
    if (!lat || !lng) {
      return ApiResponseHelpers.badRequest('Latitude and longitude are required');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return ApiResponseHelpers.badRequest('Invalid latitude or longitude values');
    }

    if (radius <= 0 || radius > 100) {
      return ApiResponseHelpers.badRequest('Radius must be between 0 and 100 kilometers');
    }

    // Build MongoDB query for nearby available offers
    const query: any = {
      status: 'pending',
      riderId: { $exists: false }, // Not yet assigned to a rider
      'pickup.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    };

    // Apply optional filters
    if (minPrice || maxPrice) {
      query['pricing.total'] = {};
      if (minPrice) query['pricing.total'].$gte = minPrice;
      if (maxPrice) query['pricing.total'].$lte = maxPrice;
    }

    if (urgency) {
      query.urgency = urgency;
    }

    if (packageType) {
      query['package.type'] = packageType;
    }

    // Filter out offers from businesses that might have blocked this rider
    // TODO: Implement rider blocking functionality
    // query.businessId = { $nin: blockedBusinessIds };

    // Get total count for pagination
    const totalItems = await Offer.countDocuments(query);

    // Execute query with pagination and sorting
    const offers = await Offer.find(query)
      .populate('businessId', 'email profile.businessName profile.rating')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Calculate distance for each offer (approximate)
    const offersWithDistance = offers.map(offer => {
      const pickupCoords = offer.pickup.location.coordinates;
      const distance = calculateDistance(lat, lng, pickupCoords[1], pickupCoords[0]);
      
      return {
        ...offer,
        distanceFromRider: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    });

    // Create pagination response
    const pagination = createPaginationResponse(page, totalItems, limit);

    // Transform offers for response
    const transformedOffers: OfferResponse[] = offersWithDistance.map(offer => ({
      id: offer._id.toString(),
      businessId: offer.businessId._id.toString(),
      business: {
        name: offer.businessId.profile?.businessName || 'Unknown Business',
        email: offer.businessId.email,
        rating: offer.businessId.profile?.rating?.average || 0
      },
      status: offer.status,
      package: offer.package,
      pickup: offer.pickup,
      delivery: offer.delivery,
      pricing: offer.pricing,
      urgency: offer.urgency,
      specialInstructions: offer.specialInstructions,
      timeline: offer.timeline,
      distanceFromRider: offer.distanceFromRider,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt
    }));

    const responseData: PaginatedOffersResponse = {
      offers: transformedOffers,
      pagination,
      filters: {
        location: { lat, lng, radius },
        minPrice,
        maxPrice,
        urgency,
        packageType
      }
    };

    return ApiResponseHelpers.success(responseData, 'Nearby offers retrieved successfully');

  } catch (error) {
    console.error('Get nearby offers error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve nearby offers');
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * GET handler with rider role requirement
 */
export const GET = withRole('rider', handleGetNearbyOffers);

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}