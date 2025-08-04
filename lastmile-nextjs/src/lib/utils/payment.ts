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

    // Get or create Paystack customer
    let customerId = user.paystackCustomerId;
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
      
      // Update user with Paystack customer ID
      await User.findByIdAndUpdate(user._id, { paystackCustomerId: customerId });
    }

    // Create payment intent
    const paymentIntent = await paymentService.createPaymentIntent({
      amount: paymentService.nairaToKobo(options.amount),
      customerId: user.email, // Paystack uses email as customer identifier
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
      currency: 'NGN',
      status: 'pending',
      method: 'credit_card',
      paystackPaymentIntentId: paymentIntent.paymentIntentId,
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
      paymentService.nairaToKobo(payment.amount),
      platformFeePercentage
    );
    
    const riderEarnings = paymentService.nairaToKobo(payment.amount) - platformFee;

    // Update payment with fee breakdown
    payment.platformFee = paymentService.koboToNaira(platformFee);
    payment.riderEarnings = paymentService.koboToNaira(riderEarnings);
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

    if (!payment.paystackPaymentIntentId) {
      return { success: false, error: 'No Paystack payment intent found' };
    }

    // Create refund in Paystack
    const refund = await paymentService.createRefund({
      paymentIntentId: payment.paystackPaymentIntentId,
      amount: amount ? paymentService.nairaToKobo(amount) : undefined,
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
 * Handle Paystack webhook events
 */
export async function handlePaystackWebhook(event: any): Promise<void> {
  try {
    await connectDB();

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;
      
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
      
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
      
      default:
        console.log(`Unhandled webhook event type: ${event.event}`);
    }
  } catch (error) {
    console.error('Webhook handling error:', error);
    throw error;
  }
}

/**
 * Handle successful charge
 */
async function handleChargeSuccess(charge: any): Promise<void> {
  const payment = await Payment.findOne({ 
    paystackPaymentIntentId: charge.reference 
  }).populate('offerId userId');

  if (!payment) {
    console.error('Payment not found for charge reference:', charge.reference);
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
 * Handle failed charge
 */
async function handleChargeFailed(charge: any): Promise<void> {
  const payment = await Payment.findOne({ 
    paystackPaymentIntentId: charge.reference 
  });

  if (!payment) {
    console.error('Payment not found for charge reference:', charge.reference);
    return;
  }

  payment.status = 'failed';
  payment.failureReason = charge.gateway_response || 'Payment failed';
  await payment.save();
}

/**
 * Handle successful transfer
 */
async function handleTransferSuccess(transfer: any): Promise<void> {
  console.log('Transfer successful:', transfer.reference);
  // Handle rider payout success
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(transfer: any): Promise<void> {
  console.log('Transfer failed:', transfer.reference);
  // Handle rider payout failure
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(amount: number): { isValid: boolean; error?: string } {
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (amount < 50) {
    return { isValid: false, error: 'Minimum payment amount is ₦50' };
  }

  if (amount > 1000000) {
    return { isValid: false, error: 'Maximum payment amount is ₦1,000,000' };
  }

  return { isValid: true };
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return paymentService.formatAmount(paymentService.nairaToKobo(amount), currency);
}

/**
 * Calculate delivery pricing
 */
export function calculateDeliveryPrice(
  distance: number,
  urgency: 'standard' | 'express' | 'urgent' = 'standard'
): number {
  return paymentService.koboToNaira(
    paymentService.calculateDeliveryPrice(distance, urgency)
  );
}