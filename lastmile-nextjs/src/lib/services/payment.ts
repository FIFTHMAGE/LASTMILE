/**
 * Payment service for handling payment processing
 */
import Stripe from 'stripe';
import { env } from '@/lib/config/env';
import { PaymentMethod, PaymentStatus, PaymentIntent, PaymentRecord } from '@/lib/types/payment';

export interface CreatePaymentIntentOptions {
  amount: number; // Amount in cents
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
  paymentMethodTypes?: string[];
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface RefundOptions {
  paymentIntentId: string;
  amount?: number; // Amount in cents, if not provided, full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
  reason?: string;
}

export interface CustomerOptions {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface CustomerResult {
  customerId: string;
  email: string;
  name?: string;
  phone?: string;
}

class PaymentService {
  private stripe: Stripe | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeStripe();
  }

  private initializeStripe(): void {
    try {
      if (!env.STRIPE_SECRET_KEY) {
        console.warn('Stripe secret key not configured. Payment service will be disabled.');
        this.isConfigured = false;
        return;
      }

      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        typescript: true,
      });

      this.isConfigured = true;
      console.log('Stripe payment service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if payment service is configured and ready
   */
  isReady(): boolean {
    return this.isConfigured && this.stripe !== null;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntentResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: options.amount,
        currency: options.currency || 'usd',
        customer: options.customerId,
        metadata: options.metadata || {},
        description: options.description,
        payment_method_types: options.paymentMethodTypes || ['card'],
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
      };
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Retrieve a payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.retrieve(paymentIntentId);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
      };
    } catch (error) {
      console.error('Failed to retrieve payment intent:', error);
      throw new Error('Failed to retrieve payment intent');
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<PaymentIntentResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
      };
    } catch (error) {
      console.error('Failed to confirm payment intent:', error);
      throw new Error('Failed to confirm payment intent');
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const paymentIntent = await this.stripe!.paymentIntents.cancel(paymentIntentId);

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: this.mapStripeStatusToPaymentStatus(paymentIntent.status),
      };
    } catch (error) {
      console.error('Failed to cancel payment intent:', error);
      throw new Error('Failed to cancel payment intent');
    }
  }

  /**
   * Create a refund
   */
  async createRefund(options: RefundOptions): Promise<RefundResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const refund = await this.stripe!.refunds.create({
        payment_intent: options.paymentIntentId,
        amount: options.amount,
        reason: options.reason,
        metadata: options.metadata || {},
      });

      return {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason || undefined,
      };
    } catch (error) {
      console.error('Failed to create refund:', error);
      throw new Error('Failed to create refund');
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(options: CustomerOptions): Promise<CustomerResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const customer = await this.stripe!.customers.create({
        email: options.email,
        name: options.name,
        phone: options.phone,
        metadata: options.metadata || {},
      });

      return {
        customerId: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        phone: customer.phone || undefined,
      };
    } catch (error) {
      console.error('Failed to create customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Retrieve a customer
   */
  async getCustomer(customerId: string): Promise<CustomerResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const customer = await this.stripe!.customers.retrieve(customerId);

      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }

      return {
        customerId: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        phone: customer.phone || undefined,
      };
    } catch (error) {
      console.error('Failed to retrieve customer:', error);
      throw new Error('Failed to retrieve customer');
    }
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<CustomerOptions>
  ): Promise<CustomerResult> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const customer = await this.stripe!.customers.update(customerId, {
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
        metadata: updates.metadata,
      });

      return {
        customerId: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        phone: customer.phone || undefined,
      };
    } catch (error) {
      console.error('Failed to update customer:', error);
      throw new Error('Failed to update customer');
    }
  }

  /**
   * List payment methods for a customer
   */
  async listPaymentMethods(customerId: string, type: string = 'card'): Promise<PaymentMethod[]> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      const paymentMethods = await this.stripe!.paymentMethods.list({
        customer: customerId,
        type: type as any,
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type as PaymentMethod['type'],
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        } : undefined,
        created: new Date(pm.created * 1000),
      }));
    } catch (error) {
      console.error('Failed to list payment methods:', error);
      throw new Error('Failed to list payment methods');
    }
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    try {
      await this.stripe!.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      console.error('Failed to detach payment method:', error);
      throw new Error('Failed to detach payment method');
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload: string, signature: string): Promise<any> {
    if (!this.isReady()) {
      throw new Error('Payment service is not configured');
    }

    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe webhook secret is not configured');
    }

    try {
      const event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );

      return event;
    } catch (error) {
      console.error('Failed to verify webhook signature:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Calculate application fee (platform commission)
   */
  calculateApplicationFee(amount: number, feePercentage: number = 5): number {
    return Math.round(amount * (feePercentage / 100));
  }

  /**
   * Calculate delivery pricing based on distance and urgency
   */
  calculateDeliveryPrice(
    distance: number,
    urgency: 'standard' | 'express' | 'urgent' = 'standard',
    basePrice: number = 500 // $5.00 in cents
  ): number {
    let price = basePrice;

    // Distance-based pricing (per km)
    const distanceRate = 50; // $0.50 per km
    price += Math.round(distance * distanceRate);

    // Urgency multiplier
    const urgencyMultipliers = {
      standard: 1.0,
      express: 1.25,
      urgent: 1.5,
    };

    price = Math.round(price * urgencyMultipliers[urgency]);

    // Minimum price
    const minimumPrice = 300; // $3.00
    return Math.max(price, minimumPrice);
  }

  /**
   * Map Stripe payment status to our payment status
   */
  private mapStripeStatusToPaymentStatus(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      case 'processing':
        return 'processing';
      case 'succeeded':
        return 'completed';
      case 'canceled':
        return 'cancelled';
      case 'requires_capture':
        return 'processing';
      default:
        return 'failed';
    }
  }

  /**
   * Format amount for display (convert cents to dollars)
   */
  formatAmount(amountInCents: number, currency: string = 'USD'): string {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  /**
   * Convert dollars to cents
   */
  dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
  }

  /**
   * Convert cents to dollars
   */
  centsToDollars(cents: number): number {
    return cents / 100;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;