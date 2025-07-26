/**
 * Offer in-transit status API route
 * POST /api/offers/[id]/in-transit - Mark offer as in transit (rider only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';
import { validateInTransitRequest, InTransitRequest, OfferResponse } from '@/lib/types';
import { notifyOfferStatusUpdate } from '@/lib/utils/notification';

/**
 * POST handler - Mark offer as in transit (rider only)
 */
async function handleInTransit(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateInTransitRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const transitData: InTransitRequest = body;
    const { id } = params;

    await connectDB();

    // Find the offer
    const offer = await Offer.findById(id)
      .populate('businessId', 'email profile.businessName')
      .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!offer) {
      return ApiResponseHelpers.notFound('Offer');
    }

    // Check if rider owns this offer
    if (!offer.riderId || offer.riderId._id.toString() !== user.id) {
      return ApiResponseHelpers.forbidden('You can only update status for your own accepted offers');
    }

    // Check if offer is in correct status for in-transit
    if (offer.status !== 'picked_up') {
      return ApiResponseHelpers.badRequest('Offer must be picked up before marking as in transit');
    }

    // Update offer with in-transit status
    const updateData: any = {
      status: 'in_transit',
      'timeline.inTransitAt': new Date()
    };

    // Add current location if provided
    if (transitData.currentLocation) {
      updateData.currentLocation = {
        type: 'Point',
        coordinates: [transitData.currentLocation.lng, transitData.currentLocation.lat]
      };
    }

    // Add estimated delivery time if provided
    if (transitData.estimatedDeliveryTime) {
      updateData['timeline.estimatedDeliveryTime'] = new Date(transitData.estimatedDeliveryTime);
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        $push: {
          statusHistory: {
            status: 'in_transit',
            timestamp: new Date(),
            updatedBy: user.id,
            notes: transitData.notes || 'Package is now in transit',
            location: transitData.currentLocation ? {
              type: 'Point',
              coordinates: [transitData.currentLocation.lng, transitData.currentLocation.lat]
            } : undefined
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('businessId', 'email profile.businessName')
    .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!updatedOffer) {
      return ApiResponseHelpers.internalError('Failed to update offer status');
    }

    // Send notification to business about in-transit status
    try {
      await notifyOfferStatusUpdate(
        updatedOffer.businessId._id.toString(),
        updatedOffer._id.toString(),
        'in_transit',
        updatedOffer.package.description
      );
    } catch (notificationError) {
      console.error('Failed to send in-transit notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    // TODO: Update real-time tracking
    // await updateDeliveryTracking(updatedOffer._id, transitData.currentLocation);

    // Transform offer for response
    const responseOffer: OfferResponse = {
      id: updatedOffer._id.toString(),
      businessId: updatedOffer.businessId._id.toString(),
      business: {
        name: updatedOffer.businessId.profile?.businessName || 'Unknown Business',
        email: updatedOffer.businessId.email
      },
      riderId: updatedOffer.riderId._id.toString(),
      rider: {
        name: `${updatedOffer.riderId.profile?.firstName || ''} ${updatedOffer.riderId.profile?.lastName || ''}`.trim(),
        email: updatedOffer.riderId.email,
        rating: updatedOffer.riderId.profile?.rating?.average || 0
      },
      status: updatedOffer.status,
      package: updatedOffer.package,
      pickup: updatedOffer.pickup,
      delivery: updatedOffer.delivery,
      pricing: updatedOffer.pricing,
      urgency: updatedOffer.urgency,
      specialInstructions: updatedOffer.specialInstructions,
      timeline: updatedOffer.timeline,
      statusHistory: updatedOffer.statusHistory,
      currentLocation: updatedOffer.currentLocation,
      createdAt: updatedOffer.createdAt,
      updatedAt: updatedOffer.updatedAt
    };

    return ApiResponseHelpers.success(responseOffer, 'Offer marked as in transit successfully');

  } catch (error) {
    console.error('In transit error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to update offer status');
  }
}

/**
 * POST handler with rider role requirement
 */
export const POST = withRole('rider', handleInTransit);

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}