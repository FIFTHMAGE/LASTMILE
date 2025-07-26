/**
 * Payment refund API route
 * POST /api/payments/refund
 */
import { NextRequest, NextResponse } from 'next/server';
import { processRefund, validatePaymentAmount } from '@/lib/utils/payment';
import { Payment } from '@/lib/models/Payment';
import { connectDB } from '@/lib/services/database';
import { verifyJWT } from '@/lib/utils/jwt';

interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false,
          error: { message: 'Authentication required', code: 'UNAUTHORIZED' }
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json(
        { 
          success: false,
          error: { message: 'Invalid token', code: 'INVALID_TOKEN' }
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: RefundRequest = await request.json();

    // Validate required fields
    if (!body.paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Payment ID is required', code: 'MISSING_PAYMENT_ID' }
        },
        { status: 400 }
      );
    }

    // Validate refund amount if provided
    if (body.amount) {
      const amountValidation = validatePaymentAmount(body.amount);
      if (!amountValidation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: { message: amountValidation.error, code: 'INVALID_AMOUNT' }
          },
          { status: 400 }
        );
      }
    }

    await connectDB();

    // Verify payment exists and user has permission
    const payment = await Payment.findById(body.paymentId).populate('offerId');
    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Payment not found', code: 'PAYMENT_NOT_FOUND' }
        },
        { status: 404 }
      );
    }

    // Check if user is authorized to refund this payment
    // Only the business owner or admin can request refunds
    const isBusinessOwner = payment.userId.toString() === decoded.userId;
    const isAdmin = decoded.role === 'admin';

    if (!isBusinessOwner && !isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Unauthorized to refund this payment', code: 'UNAUTHORIZED_REFUND' }
        },
        { status: 403 }
      );
    }

    // Validate refund amount doesn't exceed original payment
    if (body.amount && body.amount > payment.amount) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Refund amount cannot exceed original payment amount', code: 'INVALID_REFUND_AMOUNT' }
        },
        { status: 400 }
      );
    }

    // Process refund
    const result = await processRefund(
      body.paymentId,
      body.amount,
      body.reason
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { message: result.error, code: 'REFUND_FAILED' }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        refundId: result.refundId,
        message: 'Refund processed successfully'
      }
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Internal server error', code: 'INTERNAL_ERROR' }
      },
      { status: 500 }
    );
  }
}

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