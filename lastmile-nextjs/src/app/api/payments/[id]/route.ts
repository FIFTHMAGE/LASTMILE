/**
 * Individual payment API routes
 * GET /api/payments/[id] - Get specific payment
 * PUT /api/payments/[id] - Update payment status (admin only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Payment } from '@/lib/models/Payment';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withAuth, withRole } from '@/lib/utils/auth-helpers';
import { 
  validateUpdatePaymentRequest,
  UpdatePaymentRequest,
  PaymentResponse
} from '@/lib/types';

/**
 * GET handler - Get specific payment
 */
async function handleGetPayment(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const { id } = params;

    // Find payment
    const payment = await Payment.findById(id)
      .populate('fromUserId', 'email profile.businessName profile.firstName profile.lastName')
      .populate('toUserId', 'email profile.businessName profile.firstName profile.lastName')
      .populate('offerId', 'status package.description pricing.total');

    if (!payment) {
      return ApiResponseHelpers.notFound('Payment');
    }

    // Check access permissions
    const canAccess = 
      user.role === 'admin' ||
      payment.fromUserId._id.toString() === user.id ||
      payment.toUserId._id.toString() === user.id;

    if (!canAccess) {
      return ApiResponseHelpers.forbidden('Access denied to this payment');
    }

    // Transform payment for response
    const responsePayment: PaymentResponse = {
      id: payment._id.toString(),
      fromUserId: payment.fromUserId._id.toString(),
      fromUser: {
        email: payment.fromUserId.email,
        name: payment.fromUserId.profile?.businessName || 
              `${payment.fromUserId.profile?.firstName || ''} ${payment.fromUserId.profile?.lastName || ''}`.trim() ||
              'Unknown User'
      },
      toUserId: payment.toUserId._id.toString(),
      toUser: {
        email: payment.toUserId.email,
        name: payment.toUserId.profile?.businessName || 
              `${payment.toUserId.profile?.firstName || ''} ${payment.toUserId.profile?.lastName || ''}`.trim() ||
              'Unknown User'
      },
      offerId: payment.offerId?._id.toString(),
      offer: payment.offerId ? {
        status: payment.offerId.status,
        description: payment.offerId.package?.description || 'Package delivery',
        amount: payment.offerId.pricing?.total || 0
      } : undefined,
      amount: payment.amount,
      currency: payment.currency,
      type: payment.type,
      method: payment.method,
      status: payment.status,
      description: payment.description,
      metadata: payment.metadata,
      transactionId: payment.transactionId,
      processedAt: payment.processedAt,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    };

    return ApiResponseHelpers.success(responsePayment, 'Payment retrieved successfully');

  } catch (error) {
    console.error('Get payment error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve payment');
  }
}

/**
 * PUT handler - Update payment status (admin only)
 */
async function handleUpdatePayment(request: NextRequest, user: any, { params }: { params: { id: string } }) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateUpdatePaymentRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const updateData: UpdatePaymentRequest = body;
    const { id } = params;

    await connectDB();

    // Find payment
    const payment = await Payment.findById(id);
    if (!payment) {
      return ApiResponseHelpers.notFound('Payment');
    }

    // Update payment fields
    const updateFields: any = {};

    if (updateData.status) {
      updateFields.status = updateData.status;
      
      // Set processedAt when status changes to completed
      if (updateData.status === 'completed' && payment.status !== 'completed') {
        updateFields.processedAt = new Date();
      }
    }

    if (updateData.transactionId) {
      updateFields.transactionId = updateData.transactionId;
    }

    if (updateData.failureReason) {
      updateFields.failureReason = updateData.failureReason;
    }

    if (updateData.metadata) {
      updateFields.metadata = { ...payment.metadata, ...updateData.metadata };
    }

    // Update the payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
    .populate('fromUserId', 'email profile.businessName profile.firstName profile.lastName')
    .populate('toUserId', 'email profile.businessName profile.firstName profile.lastName')
    .populate('offerId', 'status package.description pricing.total');

    if (!updatedPayment) {
      return ApiResponseHelpers.notFound('Payment');
    }

    // Transform payment for response
    const responsePayment: PaymentResponse = {
      id: updatedPayment._id.toString(),
      fromUserId: updatedPayment.fromUserId._id.toString(),
      fromUser: {
        email: updatedPayment.fromUserId.email,
        name: updatedPayment.fromUserId.profile?.businessName || 
              `${updatedPayment.fromUserId.profile?.firstName || ''} ${updatedPayment.fromUserId.profile?.lastName || ''}`.trim() ||
              'Unknown User'
      },
      toUserId: updatedPayment.toUserId._id.toString(),
      toUser: {
        email: updatedPayment.toUserId.email,
        name: updatedPayment.toUserId.profile?.businessName || 
              `${updatedPayment.toUserId.profile?.firstName || ''} ${updatedPayment.toUserId.profile?.lastName || ''}`.trim() ||
              'Unknown User'
      },
      offerId: updatedPayment.offerId?._id.toString(),
      offer: updatedPayment.offerId ? {
        status: updatedPayment.offerId.status,
        description: updatedPayment.offerId.package?.description || 'Package delivery',
        amount: updatedPayment.offerId.pricing?.total || 0
      } : undefined,
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      type: updatedPayment.type,
      method: updatedPayment.method,
      status: updatedPayment.status,
      description: updatedPayment.description,
      metadata: updatedPayment.metadata,
      transactionId: updatedPayment.transactionId,
      processedAt: updatedPayment.processedAt,
      failureReason: updatedPayment.failureReason,
      createdAt: updatedPayment.createdAt,
      updatedAt: updatedPayment.updatedAt
    };

    return ApiResponseHelpers.success(responsePayment, 'Payment updated successfully');

  } catch (error) {
    console.error('Update payment error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to update payment');
  }
}

/**
 * Route handlers with authentication
 */
export const GET = withAuth(handleGetPayment);
export const PUT = withRole('admin', handleUpdatePayment);

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