/**
 * Individual offer API routes
 * GET /api/offers/[id] - Get specific offer
 * PUT /api/offers/[id] - Update offer (business only)
 * DELETE /api/offers/[id] - Delete offer (business only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Offer } from '@/lib/models/Offer';
import { User } from '@/lib/models/User';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withAuth, requireOwnership } from '@/lib/utils/auth-helpers';
import { 
  validateUpdateOfferRequest,
  UpdateOfferRequest,
  OfferResponse
} from '@/lib/types';

/**
 * GET handler - Get specific offer
 */
async function handleGetOffer(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const { id } = params;

    // Find offer
    const offer = await Offer.findById(id)
      .populate('businessId', 'email profile.businessName')
      .populate('riderId', 'email profile.firstName profile.lastName profile.rating');

    if (!offer) {
      return ApiResponseHelpers.notFound('Offer');
    }

    // Check access permissions
    const canAccess = 
      user.role === 'admin' ||
      offer.businessId._id.toString() === user.id ||
      (offer.riderId && offer.riderId._id.toString() === user.id) ||
      (user.role === 'rider' && offer.status === 'pending' && !offer.riderId);

    if (!canAccess) {
      return ApiResponseHelpers.forbidden('Access denied to this offer');
    }

    // Transform offer for response
    const responseOffer: OfferResponse = {
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
      statusHistory: offer.statusHistory,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt
    };

    return ApiResponseHelpers.success(responseOffer, 'Offer retrieved successfully');

  } catch (error) {
    console.error('Get offer error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve offer');
  }
}

/**
 * PUT handler - Update offer (business only, before assignment)
 */
async function handleUpdateOffer(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateUpdateOfferRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const updateData: UpdateOfferRequest = body;
    const { id } = params;

    await connectDB();

    // Find offer
    const offer = await Offer.findById(id);
    if (!offer) {
      return ApiResponseHelpers.notFound('Offer');
    }

    // Check ownership
    const ownershipResult = requireOwnership(request, offer.businessId.toString());
    if (!ownershipResult.success) {
      return ownershipResult.error;
    }

    // Check if offer can be updated (only pending offers without assigned rider)
    if (offer.status !== 'pending' || offer.riderId) {
      return ApiResponseHelpers.badRequest('Cannot update offer that is already assigned or in progress');
    }

    // Update offer fields
    const updateFields: any = {};

    if (updateData.package) {
      updateFields.package = { ...offer.package, ...updateData.package };
    }
    if (updateData.pickup) {
      updateFields.pickup = { ...offer.pickup, ...updateData.pickup };
      if (updateData.pickup.coordinates) {
        updateFields['pickup.location'] = {
          type: 'Point',
          coordinates: [updateData.pickup.coordinates.lng, updateData.pickup.coordinates.lat]
        };
      }
      if (updateData.pickup.scheduledTime) {
        updateFields['pickup.scheduledTime'] = new Date(updateData.pickup.scheduledTime);
      }
    }
    if (updateData.delivery) {
      updateFields.delivery = { ...offer.delivery, ...updateData.delivery };
      if (updateData.delivery.coordinates) {
        updateFields['delivery.location'] = {
          type: 'Point',
          coordinates: [updateData.delivery.coordinates.lng, updateData.delivery.coordinates.lat]
        };
      }
      if (updateData.delivery.scheduledTime) {
        updateFields['delivery.scheduledTime'] = new Date(updateData.delivery.scheduledTime);
      }
    }
    if (updateData.pricing) {
      updateFields.pricing = { ...offer.pricing, ...updateData.pricing };
    }
    if (updateData.urgency) {
      updateFields.urgency = updateData.urgency;
    }
    if (updateData.specialInstructions !== undefined) {
      updateFields.specialInstructions = updateData.specialInstructions;
    }
    if (updateData.timeline) {
      updateFields.timeline = { ...offer.timeline, ...updateData.timeline };
      if (updateData.timeline.maxDeliveryTime) {
        updateFields['timeline.maxDeliveryTime'] = new Date(updateData.timeline.maxDeliveryTime);
      }
    }

    // Update the offer
    const updatedOffer = await Offer.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('businessId', 'email profile.businessName');

    if (!updatedOffer) {
      return ApiResponseHelpers.notFound('Offer');
    }

    // Transform offer for response
    const responseOffer: OfferResponse = {
      id: updatedOffer._id.toString(),
      businessId: updatedOffer.businessId._id.toString(),
      business: {
        name: updatedOffer.businessId.profile?.businessName || 'Unknown Business',
        email: updatedOffer.businessId.email
      },
      status: updatedOffer.status,
      package: updatedOffer.package,
      pickup: updatedOffer.pickup,
      delivery: updatedOffer.delivery,
      pricing: updatedOffer.pricing,
      urgency: updatedOffer.urgency,
      specialInstructions: updatedOffer.specialInstructions,
      timeline: updatedOffer.timeline,
      createdAt: updatedOffer.createdAt,
      updatedAt: updatedOffer.updatedAt
    };

    return ApiResponseHelpers.success(responseOffer, 'Offer updated successfully');

  } catch (error) {
    console.error('Update offer error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to update offer');
  }
}

/**
 * DELETE handler - Delete offer (business only, before assignment)
 */
async function handleDeleteOffer(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    await connectDB();

    // Find offer
    const offer = await Offer.findById(id);
    if (!offer) {
      return ApiResponseHelpers.notFound('Offer');
    }

    // Check ownership
    const ownershipResult = requireOwnership(request, offer.businessId.toString());
    if (!ownershipResult.success) {
      return ownershipResult.error;
    }

    // Check if offer can be deleted (only pending offers without assigned rider)
    if (offer.status !== 'pending' || offer.riderId) {
      return ApiResponseHelpers.badRequest('Cannot delete offer that is already assigned or in progress');
    }

    // Delete the offer
    await Offer.findByIdAndDelete(id);

    return ApiResponseHelpers.success(
      { id, message: 'Offer deleted successfully' },
      'Offer deleted successfully'
    );

  } catch (error) {
    console.error('Delete offer error:', error);
    return ApiResponseHelpers.internalError('Failed to delete offer');
  }
}

/**
 * Route handlers with authentication
 */
export const GET = withAuth(handleGetOffer);
export const PUT = withAuth(handleUpdateOffer);
export const DELETE = withAuth(handleDeleteOffer);

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}