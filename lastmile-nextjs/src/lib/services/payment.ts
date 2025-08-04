/**
 * Payment service for handling payment processing with Paystack
 */
import { env } from '@/lib/config/env';
import { PaymentMethod, PaymentStatus } from '@/lib/types/payment';

// Paystack API types
interface PaystackResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackTransaction {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: any;
  log: any;
  fees: number;
  fees_split: any;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: any;
    risk_action: string;
    international_format_phone: string | null;
  };
  plan: any;
  split: any;
  order_id: any;
  paidAt: string | null;
  createdAt: string;
  requested_amount: number;
  pos_transaction_data: any;
  source: any;
  fees_breakdown: any;
}

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
  private secretKey: string;
  private publicKey: string;
  private baseUrl: string = 'https://api.paystack.co';

  constructor() {
    this.secretKey = env.PAYSTACK_SECRET_KEY || '';
    this.publicKey = env.PAYSTACK_PUBLIC_KEY || '';
    
    if (!this.secretKey || !this.publicKey) {
      console.warn('Paystack keys not configured. Payment service will not work properly.');
    }
  }

  /**
   * Check if payment service is configured and ready
   */
  isReady(): boolean {
    return !!(this.secretKey && this.publicKey);
  }

  /**
   * Make API request to Paystack
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<PaystackResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Paystack API error');
    }

    return data;
  }

  /**
   * Initialize a transaction with Paystack
   */
  async createPaymentIntent(options: CreatePaymentIntentOptions): Promise<PaymentIntentResult> {
    const reference = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const payload = {
      amount: options.amount, // Paystack expects amount in kobo (cents)
      currency: (options.currency || 'NGN').toUpperCase(),
      reference,
      email: options.customerId || 'customer@example.com', // Paystack requires email
      metadata: options.metadata || {},
      channels: options.paymentMethodTypes || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    };

    const response = await this.makeRequest<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      clientSecret: response.data.access_code,
      paymentIntentId: response.data.reference,
      amount: options.amount,
      currency: options.currency || 'NGN',
      status: 'pending',
    };
  }

  /**
   * Verify a transaction with Paystack
   */
  async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    const response = await this.makeRequest<PaystackTransaction>(
      `/transaction/verify/${paymentIntentId}`
    );

    const transaction = response.data;
    let status: PaymentStatus = 'pending';

    switch (transaction.status) {
      case 'success':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      case 'abandoned':
        status = 'cancelled';
        break;
      default:
        status = 'pending';
    }

    return {
      clientSecret: '', // Not applicable for verification
      paymentIntentId: transaction.reference,
      amount: transaction.amount,
      currency: transaction.currency,
      status,
    };
  }

  /**
   * Confirm a payment intent (for Paystack, this is handled by verification)
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<PaymentIntentResult> {
    // For Paystack, confirmation is done through verification
    return this.getPaymentIntent(paymentIntentId);
  }

  /**
   * Cancel a payment intent (Paystack doesn't support cancellation, return as cancelled)
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    // Paystack doesn't support transaction cancellation
    // We'll just return the transaction as cancelled status
    return {
      clientSecret: '',
      paymentIntentId,
      amount: 0,
      currency: 'NGN',
      status: 'cancelled',
    };
  }

  /**
   * Create a refund with Paystack
   */
  async createRefund(options: RefundOptions): Promise<RefundResult> {
    const payload: any = {
      transaction: options.paymentIntentId,
    };

    if (options.amount) {
      payload.amount = options.amount;
    }

    if (options.reason) {
      payload.customer_note = options.reason;
      payload.merchant_note = options.reason;
    }

    const response = await this.makeRequest<{
      id: number;
      integration: number;
      domain: string;
      transaction: number;
      dispute: number;
      amount: number;
      currency: string;
      status: string;
      refunded_by: string;
      refunded_at: string;
      expected_at: string;
      settlement: any;
      customer_note: string;
      merchant_note: string;
      created_at: string;
      updated_at: string;
    }>('/refund', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      refundId: response.data.id.toString(),
      amount: response.data.amount,
      status: response.data.status,
      reason: options.reason,
    };
  }

  /**
   * Create a customer with Paystack
   */
  async createCustomer(options: CustomerOptions): Promise<CustomerResult> {
    const payload: any = {
      email: options.email,
    };

    if (options.name) {
      const nameParts = options.name.split(' ');
      payload.first_name = nameParts[0];
      if (nameParts.length > 1) {
        payload.last_name = nameParts.slice(1).join(' ');
      }
    }

    if (options.phone) {
      payload.phone = options.phone;
    }

    if (options.metadata) {
      payload.metadata = options.metadata;
    }

    const response = await this.makeRequest<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
      international_format_phone: string;
    }>('/customer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      customerId: response.data.customer_code,
      email: response.data.email,
      name: `${response.data.first_name} ${response.data.last_name}`.trim(),
      phone: response.data.phone,
    };
  }

  /**
   * Retrieve a customer from Paystack
   */
  async getCustomer(customerId: string): Promise<CustomerResult> {
    const response = await this.makeRequest<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
      international_format_phone: string;
    }>(`/customer/${customerId}`);

    return {
      customerId: response.data.customer_code,
      email: response.data.email,
      name: `${response.data.first_name} ${response.data.last_name}`.trim(),
      phone: response.data.phone,
    };
  }

  /**
   * Update a customer with Paystack
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<CustomerOptions>
  ): Promise<CustomerResult> {
    const payload: any = {};

    if (updates.email) {
      payload.email = updates.email;
    }

    if (updates.name) {
      const nameParts = updates.name.split(' ');
      payload.first_name = nameParts[0];
      if (nameParts.length > 1) {
        payload.last_name = nameParts.slice(1).join(' ');
      }
    }

    if (updates.phone) {
      payload.phone = updates.phone;
    }

    if (updates.metadata) {
      payload.metadata = updates.metadata;
    }

    const response = await this.makeRequest<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
      international_format_phone: string;
    }>(`/customer/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      customerId: response.data.customer_code,
      email: response.data.email,
      name: `${response.data.first_name} ${response.data.last_name}`.trim(),
      phone: response.data.phone,
    };
  }

  /**
   * List payment methods for a customer (Paystack doesn't have a direct equivalent)
   */
  async listPaymentMethods(customerId: string, type: string = 'card'): Promise<PaymentMethod[]> {
    // Paystack doesn't have a direct equivalent to list payment methods
    // We would need to get this from transaction history
    // For now, return empty array
    return [];
  }

  /**
   * Detach a payment method from a customer (Paystack doesn't have direct equivalent)
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    // Paystack doesn't have a direct equivalent
    // Payment methods are tied to transactions
    console.log(`Paystack: Cannot detach payment method ${paymentMethodId} - not supported`);
  }

  /**
   * Handle webhook events from Paystack
   */
  async handleWebhook(payload: string, signature: string): Promise<any> {
    // Verify webhook signature
    const crypto = await import('crypto');
    const hash = crypto.createHmac('sha512', this.secretKey).update(payload).digest('hex');
    
    if (hash !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(payload);
    
    // Process different event types
    switch (event.event) {
      case 'charge.success':
        // Payment successful
        break;
      case 'charge.failed':
        // Payment failed
        break;
      case 'transfer.success':
        // Transfer successful
        break;
      case 'transfer.failed':
        // Transfer failed
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return event;
  }

  /**
   * Calculate application fee (platform commission)
   */
  calculateApplicationFee(amount: number, feePercentage: number = 5): number {
    return Math.round(amount * (feePercentage / 100));
  }

  /**
   * Calculate delivery pricing based on distance and urgency (in kobo for NGN)
   */
  calculateDeliveryPrice(
    distance: number,
    urgency: 'standard' | 'express' | 'urgent' = 'standard',
    basePrice: number = 50000 // ₦500.00 in kobo
  ): number {
    let price = basePrice;

    // Distance-based pricing (per km)
    const distanceRate = 5000; // ₦50 per km in kobo
    price += Math.round(distance * distanceRate);

    // Urgency multiplier
    const urgencyMultipliers = {
      standard: 1.0,
      express: 1.25,
      urgent: 1.5,
    };

    price = Math.round(price * urgencyMultipliers[urgency]);

    // Minimum price
    const minimumPrice = 30000; // ₦300 in kobo
    return Math.max(price, minimumPrice);
  }

  /**
   * Format amount for display (convert kobo to naira)
   */
  formatAmount(amountInKobo: number, currency: string = 'NGN'): string {
    const amount = amountInKobo / 100;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  /**
   * Convert naira to kobo
   */
  nairaToKobo(naira: number): number {
    return Math.round(naira * 100);
  }

  /**
   * Convert kobo to naira
   */
  koboToNaira(kobo: number): number {
    return kobo / 100;
  }

  /**
   * Get Paystack public key for frontend
   */
  getPublicKey(): string {
    return this.publicKey;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;