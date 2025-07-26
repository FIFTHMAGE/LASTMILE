/**
 * Payment methods API route
 * GET /api/payments/methods - List payment methods
 * DELETE /api/payments/methods - Delete payment method
 */
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment';
import { User } from '@/lib/models/User';
import { connectDB } from '@/lib/services/database';
import { verifyJWT } from '@/lib/utils/jwt';

/**
 * GET - List payment methods for authenticated user
 */
export async function GET(request: NextRequest) {
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

    await connectDB();

    // Get user and their Stripe customer ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'User not found', code: 'USER_NOT_FOUND' }
        },
        { status: 404 }
      );
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({
        success: true,
        data: { paymentMethods: [] }
      });
    }

    // Get payment methods from Stripe
    const paymentMethods = await paymentService.listPaymentMethods(user.stripeCustomerId);

    return NextResponse.json({
      success: true,
      data: { paymentMethods }
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Failed to fetch payment methods', code: 'FETCH_FAILED' }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a payment method
 */
export async function DELETE(request: NextRequest) {
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

    // Get payment method ID from query params
    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Payment method ID is required', code: 'MISSING_PAYMENT_METHOD_ID' }
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify user exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'User not found', code: 'USER_NOT_FOUND' }
        },
        { status: 404 }
      );
    }

    // Detach payment method from Stripe
    await paymentService.detachPaymentMethod(paymentMethodId);

    return NextResponse.json({
      success: true,
      data: { message: 'Payment method removed successfully' }
    });

  } catch (error) {
    console.error('Error removing payment method:', error);
    return NextResponse.json(
      {
        success: false,
        error: { message: 'Failed to remove payment method', code: 'REMOVAL_FAILED' }
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
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}