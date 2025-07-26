/**
 * Offer completion API route
 * POST /api/offers/[id]/complete - Mark offer as complete (business or admin)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withAuth } from '@/lib/utils/auth-helpers';
import { validateOfferCompletionRequest, OfferCompletionRequest, OfferResponse } from '@/lib/types';
import { notifyOfferStatusUpdate } from '@/lib/utils/notification';

/**
 * POST handler - Mark offer as complete
 */
async function handleCompleteOffer(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateOfferCompletionRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const completionData: OfferCompletionRequest = body;
    const { id } = params;

    await connectDB();

    // Find the offer
    const offer = await Offer.findById(id)
      .populate('businessId', 'email profile.businessName')
      .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!offer) {
      return ApiResponseHelpers.notFound('Offer');
    }

    // Check permissions - only business owner or admin can complete
    const canComplete = 
      user.role === 'admin' ||
      (user.role === 'business' && offer.businessId._id.toString() === user.id);

    if (!canComplete) {
      return ApiResponseHelpers.forbidden('Only the business owner or admin can mark an offer as complete');
    }

    // Check if offer is in correct status for completion
    if (offer.status !== 'delivered') {
      return ApiResponseHelpers.badRequest('Offer must be delivered before marking as complete');
    }

    // Update offer with completion
    const updateData: any = {
      status: 'completed',
      'timeline.completedAt': new Date()
    };

    // Add business rating for rider if provided
    if (completionData.riderRating) {
      updateData.businessRating = {
        rating: completionData.riderRating,
        comment: completionData.riderRatingComment,
        ratedBy: user.id,
        ratedAt: new Date()
      };
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        $push: {
          statusHistory: {
            status: 'completed',
            timestamp: new Date(),
            updatedBy: user.id,
            notes: completionData.notes || 'Offer marked as complete by business'
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('businessId', 'email profile.businessName')
    .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!updatedOffer) {
      return ApiResponseHelpers.internalError('Failed to complete offer');
    }

    // Update rider's rating if business provided one
    if (completionData.riderRating && updatedOffer.riderId) {
      const rider = await User.findById(updatedOffer.riderId._id);
      if (rider) {
        const currentRating = rider.profile?.rating || { average: 0, count: 0 };
        const newCount = currentRating.count + 1;
        const newAverage = ((currentRating.average * currentRating.count) + completionData.riderRating) / newCount;

        await User.findByIdAndUpdate(updatedOffer.riderId._id, {
          $set: {
            'profile.rating.average': Math.round(newAverage * 10) / 10, // Round to 1 decimal
            'profile.rating.count': newCount
          }
        });
      }
    }

    // Update business stats
    await User.findByIdAndUpdate(user.id, {
      $inc: { 'profile.stats.completedOffers': 1 }
    });

    // TODO: Process final payment and fees
    // await processFinalPayment(updatedOffer);

    // Send completion notifications
    try {
      await notifyOfferStatusUpdate(
        updatedOffer.businessId._id.toString(),
        updatedOffer._id.toString(),
        'completed',
        updatedOffer.package.description
      );
      
      // Also notify the rider
      if (updatedOffer.riderId) {
        await notifyOfferStatusUpdate(
          updatedOffer.riderId._id.toString(),
          updatedOffer._id.toString(),
          'completed',
          updatedOffer.package.description
        );
      }
    } catch (notificationError) {
      console.error('Failed to send completion notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    // TODO: Archive offer data for analytics
    // await archiveOfferData(updatedOffer);

    // Transform offer for response
    const responseOffer: OfferResponse = {
      id: updatedOffer._id.toString(),
      businessId: updatedOffer.businessId._id.toString(),
      business: {
        name: updatedOffer.businessId.profile?.businessName || 'Unknown Business',
        email: updatedOffer.businessId.email
      },
      riderId: updatedOffer.riderId?._id.toString(),
      rider: updatedOffer.riderId ? {
        name: `${updatedOffer.riderId.profile?.firstName || ''} ${updatedOffer.riderId.profile?.lastName || ''}`.trim(),
        email: updatedOffer.riderId.email,
        rating: updatedOffer.riderId.profile?.rating?.average || 0
      } : undefined,
      status: updatedOffer.status,
      package: updatedOffer.package,
      pickup: updatedOffer.pickup,
      delivery: updatedOffer.delivery,
      pricing: updatedOffer.pricing,
      urgency: updatedOffer.urgency,
      specialInstructions: updatedOffer.specialInstructions,
      timeline: updatedOffer.timeline,
      statusHistory: updatedOffer.statusHistory,
      businessRating: updatedOffer.businessRating,
      createdAt: updatedOffer.createdAt,
      updatedAt: updatedOffer.updatedAt
    };

    return ApiResponseHelpers.success(responseOffer, 'Offer completed successfully');

  } catch (error) {
    console.error('Complete offer error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to complete offer');
  }
}

/**
 * POST handler with authentication
 */
export const POST = withAuth(handleCompleteOffer);

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