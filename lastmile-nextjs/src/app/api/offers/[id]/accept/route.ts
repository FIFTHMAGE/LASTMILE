/**
 * Offer acceptance API route
 * POST /api/offers/[id]/accept - Accept offer (rider only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole, requireVerification } from '@/lib/utils/auth-helpers';
import { OfferResponse } from '@/lib/types';
import { notifyOfferStatusUpdate, notifyRiderAssignment } from '@/lib/utils/notification';

/**
 * POST handler - Accept offer (rider only)
 */
async function handleAcceptOffer(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    await connectDB();

    // Find the offer
    const offer = await Offer.findById(id)
      .populate('businessId', 'email profile.businessName');

    if (!offer) {
      return ApiResponseHelpers.notFound('Offer');
    }

    // Check if offer is available for acceptance
    if (offer.status !== 'pending') {
      return ApiResponseHelpers.badRequest('Offer is not available for acceptance');
    }

    if (offer.riderId) {
      return ApiResponseHelpers.conflict('Offer has already been accepted by another rider');
    }

    // Verify rider exists and is active
    const rider = await User.findById(user.id);
    if (!rider || rider.role !== 'rider' || !rider.isActive) {
      return ApiResponseHelpers.forbidden('Invalid rider account');
    }

    // Check if rider is available (not already on another active delivery)
    const activeDelivery = await Offer.findOne({
      riderId: user.id,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    });

    if (activeDelivery) {
      return ApiResponseHelpers.conflict('You already have an active delivery. Complete it before accepting another offer.');
    }

    // Check rider's availability status
    if (!rider.profile?.availability?.isAvailable) {
      return ApiResponseHelpers.badRequest('You must be available to accept offers. Please update your availability status.');
    }

    // Update offer with rider assignment
    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        $set: {
          riderId: user.id,
          status: 'accepted',
          'timeline.acceptedAt': new Date()
        },
        $push: {
          statusHistory: {
            status: 'accepted',
            timestamp: new Date(),
            updatedBy: user.id,
            notes: 'Offer accepted by rider'
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('businessId', 'email profile.businessName')
    .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!updatedOffer) {
      return ApiResponseHelpers.internalError('Failed to accept offer');
    }

    // Update rider's current delivery count
    await User.findByIdAndUpdate(user.id, {
      $inc: { 'profile.stats.activeDeliveries': 1 }
    });

    // Send notifications about offer acceptance
    try {
      // Notify business about offer acceptance
      await notifyOfferStatusUpdate(
        updatedOffer.businessId._id.toString(),
        updatedOffer._id.toString(),
        'accepted',
        updatedOffer.package.description
      );

      // Notify rider about assignment
      await notifyRiderAssignment(
        user.id,
        updatedOffer._id.toString(),
        updatedOffer.pickup.address,
        updatedOffer.delivery.address,
        updatedOffer.package.description
      );
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

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

    return ApiResponseHelpers.success(responseOffer, 'Offer accepted successfully');

  } catch (error) {
    console.error('Accept offer error:', error);
    return ApiResponseHelpers.internalError('Failed to accept offer');
  }
}

/**
 * POST handler with rider role requirement and email verification
 */
export const POST = withRole('rider', async (request: NextRequest, user: any, context: any) => {
  const verificationResult = requireVerification(request);
  if (!verificationResult.success) {
    return verificationResult.error;
  }
  return handleAcceptOffer(request, user, context);
});

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