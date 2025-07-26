/**
 * Payments API routes
 * GET /api/payments - List user payments with filtering and pagination
 * POST /api/payments - Create new payment (business only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { Payment } from '@/lib/models/Payment';
import { User } from '@/lib/models/User';
import { Offer } from '@/lib/models/Offer';
import { ApiResponseHelpers, withErrorHandling, createPaginationResponse } from '@/lib/utils/api-response';
import { withAuth, requireVerification } from '@/lib/utils/auth-helpers';
import { 
  validateCreatePaymentRequest,
  validatePaymentFilters,
  CreatePaymentRequest,
  PaymentFilters,
  PaymentResponse,
  PaginatedPaymentsResponse
} from '@/lib/types';
import { getUserPaymentStats } from '@/lib/utils/payment';
import { getUserPaymentHistory } from '@/lib/utils/payment';

/**
 * GET handler - List user payments with filtering and pagination
 */
async function handleGetPayments(request: NextRequest, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 items per page
    
    // Use the new payment utility function
    const result = await getUserPaymentHistory(user.id, page, limit);
    
    // Get payment statistics
    const stats = await getUserPaymentStats(user.id);
    
    // Parse filters
    const filters: PaymentFilters = {
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      method: searchParams.get('method') || undefined,
      minAmount: searchParams.get('minAmount') ? parseFloat(searchParams.get('minAmount')!) : undefined,
      maxAmount: searchParams.get('maxAmount') ? parseFloat(searchParams.get('maxAmount')!) : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      offerId: searchParams.get('offerId') || undefined
    };

    // Validate filters
    const filterValidation = validatePaymentFilters(filters);
    if (!filterValidation.isValid) {
      return ApiResponseHelpers.validationError(filterValidation.errors);
    }

    // Build MongoDB query
    const query: any = {};

    // Role-based filtering
    if (user.role === 'business') {
      query.$or = [
        { fromUserId: user.id }, // Payments made by business
        { toUserId: user.id }    // Payments received by business
      ];
    } else if (user.role === 'rider') {
      query.$or = [
        { fromUserId: user.id }, // Payments made by rider (rare)
        { toUserId: user.id }    // Payments received by rider
      ];
    } else if (user.role === 'admin') {
      // Admin can see all payments
    } else {
      return ApiResponseHelpers.forbidden('Invalid user role for payment access');
    }

    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.method) {
      query.method = filters.method;
    }
    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    if (filters.offerId) {
      query.offerId = filters.offerId;
    }

    // Get total count for pagination
    const totalItems = await Payment.countDocuments(query);

    // Execute query with pagination and sorting
    const payments = await Payment.find(query)
      .populate('fromUserId', 'email profile.businessName profile.firstName profile.lastName')
      .populate('toUserId', 'email profile.businessName profile.firstName profile.lastName')
      .populate('offerId', 'status package.description pricing.total')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Create pagination response
    const pagination = createPaginationResponse(page, totalItems, limit);

    // Transform payments for response
    const transformedPayments: PaymentResponse[] = payments.map(payment => ({
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
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    }));

    const responseData: PaginatedPaymentsResponse = {
      payments: transformedPayments,
      pagination,
      filters: filters
    };

    return ApiResponseHelpers.success(responseData, 'Payments retrieved successfully');

  } catch (error) {
    console.error('Get payments error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve payments');
  }
}

/**
 * POST handler - Create new payment (business only)
 */
async function handleCreatePayment(request: NextRequest, user: any) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateCreatePaymentRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const paymentData: CreatePaymentRequest = body;

    await connectDB();

    // Verify business user exists and is active
    const business = await User.findById(user.id);
    if (!business || business.role !== 'business' || !business.isActive) {
      return ApiResponseHelpers.forbidden('Invalid business account');
    }

    // Verify recipient user exists
    const recipient = await User.findById(paymentData.toUserId);
    if (!recipient || !recipient.isActive) {
      return ApiResponseHelpers.notFound('Recipient user not found or inactive');
    }

    // Verify offer exists if provided
    let offer = null;
    if (paymentData.offerId) {
      offer = await Offer.findById(paymentData.offerId);
      if (!offer) {
        return ApiResponseHelpers.notFound('Offer not found');
      }
      
      // Verify business owns the offer
      if (offer.businessId.toString() !== user.id) {
        return ApiResponseHelpers.forbidden('You can only create payments for your own offers');
      }
    }

    // Create new payment
    const newPayment = new Payment({
      fromUserId: user.id,
      toUserId: paymentData.toUserId,
      offerId: paymentData.offerId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      type: paymentData.type,
      method: paymentData.method,
      status: 'pending',
      description: paymentData.description,
      metadata: paymentData.metadata || {}
    });

    await newPayment.save();

    // TODO: Process payment with payment gateway
    // const paymentResult = await processPaymentWithGateway(newPayment);
    // if (paymentResult.success) {
    //   newPayment.status = 'completed';
    //   newPayment.transactionId = paymentResult.transactionId;
    //   newPayment.processedAt = new Date();
    //   await newPayment.save();
    // }

    // Populate user information for response
    await newPayment.populate([
      { path: 'fromUserId', select: 'email profile.businessName profile.firstName profile.lastName' },
      { path: 'toUserId', select: 'email profile.businessName profile.firstName profile.lastName' },
      { path: 'offerId', select: 'status package.description pricing.total' }
    ]);

    // Transform payment for response
    const responsePayment: PaymentResponse = {
      id: newPayment._id.toString(),
      fromUserId: newPayment.fromUserId._id.toString(),
      fromUser: {
        email: newPayment.fromUserId.email,
        name: newPayment.fromUserId.profile?.businessName || 
              `${newPayment.fromUserId.profile?.firstName || ''} ${newPayment.fromUserId.profile?.lastName || ''}`.trim() ||
              'Unknown User'
      },
      toUserId: newPayment.toUserId._id.toString(),
      toUser: {
        email: newPayment.toUserId.email,
        name: newPayment.toUserId.profile?.businessName || 
              `${newPayment.toUserId.profile?.firstName || ''} ${newPayment.toUserId.profile?.lastName || ''}`.trim() ||
              'Unknown User'
      },
      offerId: newPayment.offerId?._id.toString(),
      offer: newPayment.offerId ? {
        status: newPayment.offerId.status,
        description: newPayment.offerId.package?.description || 'Package delivery',
        amount: newPayment.offerId.pricing?.total || 0
      } : undefined,
      amount: newPayment.amount,
      currency: newPayment.currency,
      type: newPayment.type,
      method: newPayment.method,
      status: newPayment.status,
      description: newPayment.description,
      metadata: newPayment.metadata,
      transactionId: newPayment.transactionId,
      processedAt: newPayment.processedAt,
      createdAt: newPayment.createdAt,
      updatedAt: newPayment.updatedAt
    };

    return ApiResponseHelpers.created(responsePayment, 'Payment created successfully');

  } catch (error) {
    console.error('Create payment error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to create payment');
  }
}

/**
 * GET handler with authentication
 */
export const GET = withAuth(handleGetPayments);

/**
 * POST handler with business role requirement and email verification
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  const verificationResult = requireVerification(request);
  if (!verificationResult.success) {
    return verificationResult.error;
  }
  
  // Only businesses can create payments
  if (user.role !== 'business') {
    return ApiResponseHelpers.forbidden('Only businesses can create payments');
  }
  
  return handleCreatePayment(request, user);
});

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}