/**
 * Payment utility functions
 */
import { paymentService } from '@/lib/services/payment';
import { Payment } from '@/lib/models/Payment';
import { User } from '@/lib/models/User';
import { Offer } from '@/lib/models/Offer';
import { connectDB } from '@/lib/services/database';
import { PaymentStatus, PaymentMethod } from '@/lib/types/payment';
import { sendOrderNotificationEmail } from '@/lib/utils/email';

export interface ProcessPaymentOptions {
  offerId: string;
  userId: string;
  amount: number;
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
}

export interface ProcessPaymentResult {
  success: boolean;
  paymentId?: string;
  clientSecret?: string;
  requiresAction?: boolean;
  error?: string;
}

/**
 * Process payment for an offer
 */
export async function processOfferPayment(
  options: ProcessPaymentOptions
): Promise<ProcessPaymentResult> {
  try {
    await connectDB();

    // Get offer and user details
    const [offer, user] = await Promise.all([
      Offer.findById(options.offerId).populate('business'),
      User.findById(options.userId)
    ]);

    if (!offer) {
      return { success: false, error: 'Offer not found' };
    }

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Ensure user is the business owner of the offer
    if (offer.business._id.toString() !== options.userId) {
      return { success: false, error: 'Unauthorized to pay for this offer' };
    }

    // Check if offer is in a payable state
    if (!['delivered', 'completed'].includes(offer.status)) {
      return { success: false, error: 'Offer is not ready for payment' };
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ 
      offerId: options.offerId,
      status: { $in: ['completed', 'processing'] }
    });

    if (existingPayment) {
      return { success: false, error: 'Payment already processed for this offer' };
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await paymentService.createCustomer({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
          userType: user.role
        }
      });
      customerId = customer.customerId;
      
      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId });
    }

    // Create payment intent
    const paymentIntent = await paymentService.createPaymentIntent({
      amount: paymentService.dollarsToCents(options.amount),
      customerId,
      metadata: {
        offerId: options.offerId,
        userId: options.userId,
        type: 'delivery_payment'
      },
      description: `Payment for delivery: ${offer.package.description}`,
    });

    // Create payment record in database
    const payment = new Payment({
      offerId: options.offerId,
      userId: options.userId,
      riderId: offer.rider,
      amount: options.amount,
      currency: 'USD',
      status: 'pending',
      method: 'credit_card',
      stripePaymentIntentId: paymentIntent.paymentIntentId,
      metadata: {
        offerDescription: offer.package.description,
        pickupAddress: offer.pickup.address,
        deliveryAddress: offer.delivery.address
      }
    });

    await payment.save();

    // If payment method is provided, try to confirm immediately
    if (options.paymentMethodId) {
      try {
        const confirmedIntent = await paymentService.confirmPaymentIntent(
          paymentIntent.paymentIntentId,
          options.paymentMethodId
        );

        // Update payment status based on confirmation result
        payment.status = confirmedIntent.status;
        await payment.save();

        if (confirmedIntent.status === 'completed') {
          // Handle successful payment
          await handleSuccessfulPayment(payment, offer, user);
          
          return {
            success: true,
            paymentId: payment._id.toString(),
            requiresAction: false
          };
        }
      } catch (confirmError) {
        console.error('Payment confirmation failed:', confirmError);
        // Continue with client-side confirmation
      }
    }

    return {
      success: true,
      paymentId: payment._id.toString(),
      clientSecret: paymentIntent.clientSecret,
      requiresAction: true
    };

  } catch (error) {
    console.error('Payment processing error:', error);
    return { 
      success: false, 
      error: 'Payment processing failed. Please try again.' 
    };
  }
}

/**
 * Handle successful payment completion
 */
async function handleSuccessfulPayment(
  payment: any,
  offer: any,
  user: any
): Promise<void> {
  try {
    // Update offer status to completed
    offer.status = 'completed';
    offer.completedAt = new Date();
    await offer.save();

    // Calculate platform fee and rider earnings
    const platformFeePercentage = 5; // 5% platform fee
    const platformFee = paymentService.calculateApplicationFee(
      paymentService.dollarsToCents(payment.amount),
      platformFeePercentage
    );
    
    const riderEarnings = paymentService.dollarsToCents(payment.amount) - platformFee;

    // Update payment with fee breakdown
    payment.platformFee = paymentService.centsToDollars(platformFee);
    payment.riderEarnings = paymentService.centsToDollars(riderEarnings);
    await payment.save();

    // Send notification emails
    await Promise.all([
      // Notify business
      sendOrderNotificationEmail(
        user.email,
        user.name,
        offer._id.toString(),
        'completed',
        undefined
      ),
      // Notify rider if available
      offer.rider && sendOrderNotificationEmail(
        offer.rider.email,
        offer.rider.name,
        offer._id.toString(),
        'completed',
        undefined
      )
    ]);

    console.log(`Payment completed successfully for offer ${offer._id}`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

/**
 * Process refund for a payment
 */
export async function processRefund(
  paymentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  try {
    await connectDB();

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    if (payment.status !== 'completed') {
      return { success: false, error: 'Can only refund completed payments' };
    }

    if (!payment.stripePaymentIntentId) {
      return { success: false, error: 'No Stripe payment intent found' };
    }

    // Create refund in Stripe
    const refund = await paymentService.createRefund({
      paymentIntentId: payment.stripePaymentIntentId,
      amount: amount ? paymentService.dollarsToCents(amount) : undefined,
      reason,
      metadata: {
        paymentId: paymentId,
        offerId: payment.offerId.toString()
      }
    });

    // Update payment record
    payment.status = 'refunded';
    payment.refundId = refund.refundId;
    payment.refundAmount = amount || payment.amount;
    payment.refundedAt = new Date();
    await payment.save();

    return {
      success: true,
      refundId: refund.refundId
    };

  } catch (error) {
    console.error('Refund processing error:', error);
    return { 
      success: false, 
      error: 'Refund processing failed. Please try again.' 
    };
  }
}

/**
 * Get payment history for a user
 */
export async function getUserPaymentHistory(
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  payments: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  try {
    await connectDB();

    const skip = (page - 1) * limit;

    const [payments, totalCount] = await Promise.all([
      Payment.find({ userId })
        .populate('offerId', 'package pickup delivery')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments({ userId })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

  } catch (error) {
    console.error('Error fetching payment history:', error);
    throw new Error('Failed to fetch payment history');
  }
}

/**
 * Get payment statistics for a user
 */
export async function getUserPaymentStats(userId: string): Promise<{
  totalPaid: number;
  pendingAmount: number;
  totalTransactions: number;
  averageAmount: number;
  thisMonthSpent: number;
}> {
  try {
    await connectDB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [stats] = await Payment.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'processing']] }, '$amount', 0]
            }
          },
          totalTransactions: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
          thisMonthSpent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $gte: ['$createdAt', startOfMonth] }
                  ]
                },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    return stats || {
      totalPaid: 0,
      pendingAmount: 0,
      totalTransactions: 0,
      averageAmount: 0,
      thisMonthSpent: 0
    };

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    throw new Error('Failed to fetch payment statistics');
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(event: any): Promise<void> {
  try {
    await connectDB();

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handling error:', error);
    throw error;
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
  const payment = await Payment.findOne({ 
    stripePaymentIntentId: paymentIntent.id 
  }).populate('offerId userId');

  if (!payment) {
    console.error('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  payment.status = 'completed';
  payment.completedAt = new Date();
  await payment.save();

  // Handle successful payment completion
  if (payment.offerId && payment.userId) {
    await handleSuccessfulPayment(payment, payment.offerId, payment.userId);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
  const payment = await Payment.findOne({ 
    stripePaymentIntentId: paymentIntent.id 
  });

  if (!payment) {
    console.error('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  payment.status = 'failed';
  payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
  await payment.save();
}

/**
 * Handle canceled payment intent
 */
async function handlePaymentIntentCanceled(paymentIntent: any): Promise<void> {
  const payment = await Payment.findOne({ 
    stripePaymentIntentId: paymentIntent.id 
  });

  if (!payment) {
    console.error('Payment not found for payment intent:', paymentIntent.id);
    return;
  }

  payment.status = 'cancelled';
  await payment.save();
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): { isValid: boolean; error?: string } {
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (amount < 0.50) {
    return { isValid: false, error: 'Minimum payment amount is $0.50' };
  }

  if (amount > 10000) {
    return { isValid: false, error: 'Maximum payment amount is $10,000' };
  }

  return { isValid: true };
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return paymentService.formatAmount(paymentService.dollarsToCents(amount), currency);
}

/**
 * Calculate delivery pricing
 */
export function calculateDeliveryPrice(
  distance: number,
  urgency: 'standard' | 'express' | 'urgent' = 'standard'
): number {
  return paymentService.centsToDollars(
    paymentService.calculateDeliveryPrice(distance, urgency)
  );
}