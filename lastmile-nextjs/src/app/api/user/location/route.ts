/**
 * Rider location API routes
 * GET /api/user/location - Get rider current location
 * PUT /api/user/location - Update rider location
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';
import { 
  validateLocationUpdateRequest,
  LocationUpdateRequest,
  RiderLocationResponse
} from '@/lib/types';

/**
 * GET handler - Get rider current location
 */
async function handleGetLocation(request: NextRequest, user: any) {
  try {
    await connectDB();

    // Find rider with location data
    const rider = await User.findById(user.id).select('profile.currentLocation profile.locationUpdatedAt');
    
    if (!rider) {
      return ApiResponseHelpers.notFound('Rider');
    }

    const currentLocation = rider.profile?.currentLocation;
    const locationUpdatedAt = rider.profile?.locationUpdatedAt;

    if (!currentLocation) {
      return ApiResponseHelpers.success(
        { 
          hasLocation: false,
          message: 'No location data available' 
        },
        'Location data not found'
      );
    }

    const response: RiderLocationResponse = {
      hasLocation: true,
      location: {
        lat: currentLocation.coordinates[1],
        lng: currentLocation.coordinates[0]
      },
      accuracy: rider.profile?.locationAccuracy,
      updatedAt: locationUpdatedAt || rider.updatedAt,
      isStale: locationUpdatedAt ? 
        (Date.now() - locationUpdatedAt.getTime()) > (5 * 60 * 1000) : // 5 minutes
        true
    };

    return ApiResponseHelpers.success(response, 'Location retrieved successfully');

  } catch (error) {
    console.error('Get location error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve location');
  }
}

/**
 * PUT handler - Update rider location
 */
async function handleUpdateLocation(request: NextRequest, user: any) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateLocationUpdateRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const locationData: LocationUpdateRequest = body;

    await connectDB();

    // Validate coordinates
    if (locationData.lat < -90 || locationData.lat > 90) {
      return ApiResponseHelpers.badRequest('Invalid latitude value');
    }
    if (locationData.lng < -180 || locationData.lng > 180) {
      return ApiResponseHelpers.badRequest('Invalid longitude value');
    }

    // Prepare update data
    const updateData: any = {
      'profile.currentLocation': {
        type: 'Point',
        coordinates: [locationData.lng, locationData.lat]
      },
      'profile.locationUpdatedAt': new Date()
    };

    // Add accuracy if provided
    if (locationData.accuracy) {
      updateData['profile.locationAccuracy'] = locationData.accuracy;
    }

    // Add heading if provided (for navigation)
    if (locationData.heading !== undefined) {
      updateData['profile.locationHeading'] = locationData.heading;
    }

    // Add speed if provided
    if (locationData.speed !== undefined) {
      updateData['profile.locationSpeed'] = locationData.speed;
    }

    // Update rider location
    const updatedRider = await User.findByIdAndUpdate(
      user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('profile.currentLocation profile.locationUpdatedAt profile.locationAccuracy');

    if (!updatedRider) {
      return ApiResponseHelpers.internalError('Failed to update location');
    }

    // TODO: Update active delivery tracking if rider has active deliveries
    // await updateActiveDeliveryTracking(user.id, locationData);

    // TODO: Notify businesses about rider location for nearby offers
    // if (rider is available) {
    //   await updateNearbyOfferNotifications(user.id, locationData);
    // }

    const currentLocation = updatedRider.profile?.currentLocation;
    const response: RiderLocationResponse = {
      hasLocation: true,
      location: {
        lat: currentLocation?.coordinates[1] || locationData.lat,
        lng: currentLocation?.coordinates[0] || locationData.lng
      },
      accuracy: updatedRider.profile?.locationAccuracy,
      updatedAt: updatedRider.profile?.locationUpdatedAt || new Date(),
      isStale: false
    };

    return ApiResponseHelpers.success(response, 'Location updated successfully');

  } catch (error) {
    console.error('Update location error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to update location');
  }
}

/**
 * Route handlers with rider role requirement
 */
export const GET = withRole('rider', handleGetLocation);
export const PUT = withRole('rider', handleUpdateLocation);

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}