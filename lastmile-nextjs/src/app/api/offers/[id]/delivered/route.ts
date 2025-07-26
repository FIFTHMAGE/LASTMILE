/**
 * Offer delivery confirmation API route
 * POST /api/offers/[id]/delivered - Confirm delivery (rider only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';
import { validateDeliveryConfirmationRequest, DeliveryConfirmationRequest, OfferResponse } from '@/lib/types';
import { notifyOfferStatusUpdate } from '@/lib/utils/notification';

/**
 * POST handler - Confirm delivery (rider only)
 */
async function handleConfirmDelivery(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateDeliveryConfirmationRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const deliveryData: DeliveryConfirmationRequest = body;
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
      return ApiResponseHelpers.forbidden('You can only confirm delivery for your own accepted offers');
    }

    // Check if offer is in correct status for delivery
    if (offer.status !== 'in_transit') {
      return ApiResponseHelpers.badRequest('Offer must be in transit before confirming delivery');
    }

    // Update offer with delivery confirmation
    const updateData: any = {
      status: 'delivered',
      'delivery.actualTime': new Date(),
      'delivery.confirmationCode': deliveryData.confirmationCode,
      'delivery.recipientName': deliveryData.recipientName,
      'timeline.deliveredAt': new Date()
    };

    // Add delivery location if provided
    if (deliveryData.location) {
      updateData['delivery.actualLocation'] = {
        type: 'Point',
        coordinates: [deliveryData.location.lng, deliveryData.location.lat]
      };
    }

    // Add delivery notes if provided
    if (deliveryData.notes) {
      updateData['delivery.notes'] = deliveryData.notes;
    }

    // Add delivery photo if provided
    if (deliveryData.photoUrl) {
      updateData['delivery.photoUrl'] = deliveryData.photoUrl;
    }

    // Add recipient signature if provided
    if (deliveryData.signatureUrl) {
      updateData['delivery.signatureUrl'] = deliveryData.signatureUrl;
    }

    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        $push: {
          statusHistory: {
            status: 'delivered',
            timestamp: new Date(),
            updatedBy: user.id,
            notes: deliveryData.notes || `Package delivered to ${deliveryData.recipientName}`,
            location: deliveryData.location ? {
              type: 'Point',
              coordinates: [deliveryData.location.lng, deliveryData.location.lat]
            } : undefined
          }
        }
      },
      { new: true, runValidators: true }
    )
    .populate('businessId', 'email profile.businessName')
    .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!updatedOffer) {
      return ApiResponseHelpers.internalError('Failed to confirm delivery');
    }

    // Update rider's stats
    await User.findByIdAndUpdate(user.id, {
      $inc: { 
        'profile.stats.totalDeliveries': 1,
        'profile.stats.activeDeliveries': -1,
        'profile.earnings.total': updatedOffer.pricing.total,
        'profile.earnings.thisMonth': updatedOffer.pricing.total
      },
      $set: {
        'profile.earnings.lastPayout': new Date()
      }
    });

    // TODO: Process payment to rider
    // await processRiderPayment(updatedOffer);

    // Send delivery confirmation notifications
    try {
      await notifyOfferStatusUpdate(
        updatedOffer.businessId._id.toString(),
        updatedOffer._id.toString(),
        'delivered',
        updatedOffer.package.description
      );
    } catch (notificationError) {
      console.error('Failed to send delivery notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    // TODO: Stop real-time tracking
    // await stopDeliveryTracking(updatedOffer._id);

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

    return ApiResponseHelpers.success(responseOffer, 'Delivery confirmed successfully');

  } catch (error) {
    console.error('Confirm delivery error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to confirm delivery');
  }
}

/**
 * POST handler with rider role requirement
 */
export const POST = withRole('rider', handleConfirmDelivery);

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