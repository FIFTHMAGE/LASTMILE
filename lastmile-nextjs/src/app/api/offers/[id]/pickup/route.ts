/**
 * Offer pickup confirmation API route
 * POST /api/offers/[id]/pickup - Confirm pickup (rider only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole, requireOwnership } from '@/lib/utils/auth-helpers';
import { validatePickupConfirmationRequest, PickupConfirmationRequest, OfferResponse } from '@/lib/types';
import { notifyOfferStatusUpdate } from '@/lib/utils/notification';

/**
 * POST handler - Confirm pickup (rider only)
 */
async function handleConfirmPickup(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validatePickupConfirmationRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const pickupData: PickupConfirmationRequest = body;
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
      return ApiResponseHelpers.forbidden('You can only confirm pickup for your own accepted offers');
    }

    // Check if offer is in correct status for pickup
    if (offer.status !== 'accepted') {
      return ApiResponseHelpers.badRequest('Offer must be in accepted status to confirm pickup');
    }

    // Update offer with pickup confirmation
    const updateData: any = {
      status: 'picked_up',
      'pickup.actualTime': new Date(),
      'pickup.confirmationCode': pickupData.confirmationCode,
      'timeline.pickedUpAt': new Date()
    };

    // Add pickup location if provided
    if (pickupData.location) {
      updateData['pickup.actualLocation'] = {
        type: 'Point',
        coordinates: [pickupData.location.lng, pickupData.location.lat]
      };
    }

    // Add pickup notes if provided
    if (pickupData.notes) {
      updateData['pickup.notes'] = pickupData.notes;
    }

    // Add pickup photo if provided
    if (pickupData.photoUrl) {
      updateData['pickup.photoUrl'] = pickupData.photoUrl;
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        $push: {
          statusHistory: {
            status: 'picked_up',
            timestamp: new Date(),
            updatedBy: user.id,
            notes: pickupData.notes || 'Package picked up',
            location: pickupData.location ? {
              type: 'Point',
              coordinates: [pickupData.location.lng, pickupData.location.lat]
            } : undefined
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('businessId', 'email profile.businessName')
    .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!updatedOffer) {
      return ApiResponseHelpers.internalError('Failed to confirm pickup');
    }

    // Update rider's stats
    await User.findByIdAndUpdate(user.id, {
      $inc: { 'profile.stats.totalPickups': 1 }
    });

    // Send notification to business about pickup confirmation
    try {
      await notifyOfferStatusUpdate(
        updatedOffer.businessId._id.toString(),
        updatedOffer._id.toString(),
        'picked_up',
        updatedOffer.package.description
      );
    } catch (notificationError) {
      console.error('Failed to send pickup notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    // TODO: Start real-time tracking
    // await startDeliveryTracking(updatedOffer._id, user.id);

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
      createdAt: updatedOffer.createdAt,
      updatedAt: updatedOffer.updatedAt
    };

    return ApiResponseHelpers.success(responseOffer, 'Pickup confirmed successfully');

  } catch (error) {
    console.error('Confirm pickup error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to confirm pickup');
  }
}

/**
 * POST handler with rider role requirement
 */
export const POST = withRole('rider', handleConfirmPickup);

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