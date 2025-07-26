/**
 * Rider availability API routes
 * GET /api/user/availability - Get rider availability status
 * PUT /api/user/availability - Update rider availability
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';
import { 
  validateAvailabilityUpdateRequest,
  AvailabilityUpdateRequest,
  RiderAvailabilityResponse
} from '@/lib/types';

/**
 * GET handler - Get rider availability status
 */
async function handleGetAvailability(request: NextRequest, user: any) {
  try {
    await connectDB();

    // Find rider
    const rider = await User.findById(user.id).select('profile.availability');
    
    if (!rider) {
      return ApiResponseHelpers.notFound('Rider');
    }

    const availability = rider.profile?.availability || {
      isAvailable: false,
      workingHours: {
        monday: { start: '09:00', end: '17:00', isWorking: true },
        tuesday: { start: '09:00', end: '17:00', isWorking: true },
        wednesday: { start: '09:00', end: '17:00', isWorking: true },
        thursday: { start: '09:00', end: '17:00', isWorking: true },
        friday: { start: '09:00', end: '17:00', isWorking: true },
        saturday: { start: '09:00', end: '17:00', isWorking: false },
        sunday: { start: '09:00', end: '17:00', isWorking: false }
      }
    };

    const response: RiderAvailabilityResponse = {
      isAvailable: availability.isAvailable,
      workingHours: availability.workingHours,
      lastUpdated: rider.updatedAt
    };

    return ApiResponseHelpers.success(response, 'Availability retrieved successfully');

  } catch (error) {
    console.error('Get availability error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve availability');
  }
}

/**
 * PUT handler - Update rider availability
 */
async function handleUpdateAvailability(request: NextRequest, user: any) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateAvailabilityUpdateRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const availabilityData: AvailabilityUpdateRequest = body;

    await connectDB();

    // Find rider
    const rider = await User.findById(user.id);
    if (!rider) {
      return ApiResponseHelpers.notFound('Rider');
    }

    // Check if rider has active deliveries when trying to go offline
    if (availabilityData.isAvailable === false) {
      const { Offer } = await import('@/lib/models/Offer');
      const activeDeliveries = await Offer.countDocuments({
        riderId: user.id,
        status: { $in: ['accepted', 'picked_up', 'in_transit'] }
      });

      if (activeDeliveries > 0) {
        return ApiResponseHelpers.badRequest(
          'Cannot go offline while you have active deliveries. Please complete your current deliveries first.'
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      'profile.availability.isAvailable': availabilityData.isAvailable
    };

    // Update working hours if provided
    if (availabilityData.workingHours) {
      updateData['profile.availability.workingHours'] = availabilityData.workingHours;
    }

    // Add availability change timestamp
    updateData['profile.availability.lastStatusChange'] = new Date();

    // Update rider availability
    const updatedRider = await User.findByIdAndUpdate(
      user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('profile.availability updatedAt');

    if (!updatedRider) {
      return ApiResponseHelpers.internalError('Failed to update availability');
    }

    const availability = updatedRider.profile?.availability;
    const response: RiderAvailabilityResponse = {
      isAvailable: availability?.isAvailable || false,
      workingHours: availability?.workingHours || {},
      lastUpdated: updatedRider.updatedAt,
      lastStatusChange: availability?.lastStatusChange
    };

    // TODO: Notify nearby businesses about rider availability change
    // if (availabilityData.isAvailable) {
    //   await notifyNearbyBusinesses(user.id);
    // }

    return ApiResponseHelpers.success(response, 'Availability updated successfully');

  } catch (error) {
    console.error('Update availability error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to update availability');
  }
}

/**
 * Route handlers with rider role requirement
 */
export const GET = withRole('rider', handleGetAvailability);
export const PUT = withRole('rider', handleUpdateAvailability);

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