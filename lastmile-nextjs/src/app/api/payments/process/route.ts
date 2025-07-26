/**
 * Process payment API route
 * POST /api/payments/process
 */
import { NextRequest, NextResponse } from 'next/server';
import { processOfferPayment, validatePaymentAmount } from '@/lib/utils/payment';
import { verifyJWT } from '@/lib/utils/jwt';

interface ProcessPaymentRequest {
  offerId: string;
  amount: number;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
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
    const body: ProcessPaymentRequest = await request.json();

    // Validate required fields
    if (!body.offerId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Offer ID is required', code: 'MISSING_OFFER_ID' }
        },
        { status: 400 }
      );
    }

    if (!body.amount) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Amount is required', code: 'MISSING_AMOUNT' }
        },
        { status: 400 }
      );
    }

    // Validate payment amount
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

    // Process payment
    const result = await processOfferPayment({
      offerId: body.offerId,
      userId: decoded.userId,
      amount: body.amount,
      paymentMethodId: body.paymentMethodId,
      savePaymentMethod: body.savePaymentMethod
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { message: result.error, code: 'PAYMENT_FAILED' }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: result.paymentId,
        clientSecret: result.clientSecret,
        requiresAction: result.requiresAction
      }
    });

  } catch (error) {
    console.error('Payment processing error:', error);
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