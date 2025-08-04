/**
 * Paystack webhook handler
 * POST /api/webhooks/paystack
 */
import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/lib/services/payment';
import { handlePaystackWebhook } from '@/lib/utils/payment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-paystack-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature and construct event
    const event = await paymentService.handleWebhook(body, signature);

    // Handle the webhook event
    await handlePaystackWebhook(event);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Paystack webhook error:', error);
    
    if (error instanceof Error && error.message.includes('signature')) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
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
      'Access-Control-Allow-Headers': 'Content-Type, x-paystack-signature',
    },
  });
}