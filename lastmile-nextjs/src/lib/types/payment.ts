/**
 * Payment-related TypeScript type definitions
 */

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'digital' | 'bank_transfer';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD';
export type TransactionType = 'payment' | 'refund' | 'fee' | 'bonus';

export interface PaymentDetails {
  cardLast4?: string;
  cardBrand?: string;
  digitalWallet?: string;
  bankAccount?: string;
}

export interface Payment {
  _id: string;
  offer: string; // Offer ID
  business: string; // Business User ID
  rider: string; // Rider User ID
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionType: TransactionType;
  
  // Payment details
  details?: PaymentDetails;
  
  // External payment provider data
  externalTransactionId?: string;
  externalPaymentId?: string;
  providerData?: Record<string, any>;
  
  // Fees and calculations
  platformFee?: number;
  processingFee?: number;
  netAmount?: number; // Amount after fees
  
  // Timing
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  
  // Error handling
  failureReason?: string;
  retryCount?: number;
  
  // Metadata
  description?: string;
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

// Payment creation types
export interface CreatePayment {
  offer: string;
  business: string;
  rider: string;
  amount: number;
  currency?: Currency;
  method: PaymentMethod;
  transactionType?: TransactionType;
  details?: PaymentDetails;
  description?: string;
  metadata?: Record<string, any>;
}

// Payment update types
export interface UpdatePayment {
  status?: PaymentStatus;
  externalTransactionId?: string;
  externalPaymentId?: string;
  providerData?: Record<string, any>;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

// Payment summary for API responses
export interface PaymentSummary {
  id: string;
  offer: {
    id: string;
    title: string;
  };
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionType: TransactionType;
  netAmount?: number;
  processedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// Payment filtering and search
export interface PaymentFilters {
  status?: PaymentStatus;
  method?: PaymentMethod;
  transactionType?: TransactionType;
  currency?: Currency;
  businessId?: string;
  riderId?: string;
  offerId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  page?: number;
  sortBy?: 'amount' | 'created' | 'processed' | 'completed';
  sortOrder?: 'asc' | 'desc';
}

// Payment processing
export interface PaymentProcessingRequest {
  paymentId: string;
  paymentMethodToken?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  savePaymentMethod?: boolean;
}

export interface PaymentProcessingResult {
  success: boolean;
  paymentId: string;
  externalTransactionId?: string;
  status: PaymentStatus;
  message?: string;
  error?: string;
  requiresAction?: boolean;
  actionUrl?: string;
}

// Refund processing
export interface RefundRequest {
  paymentId: string;
  amount?: number; // Partial refund amount, full refund if not specified
  reason: string;
  metadata?: Record<string, any>;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: PaymentStatus;
  message?: string;
  error?: string;
}

// Payment analytics
export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
  byStatus: Record<PaymentStatus, number>;
  byMethod: Record<PaymentMethod, number>;
  byCurrency: Record<Currency, number>;
  monthlyTrend: {
    month: string;
    count: number;
    amount: number;
  }[];
}

// Earnings calculation
export interface EarningsCalculation {
  grossAmount: number;
  platformFee: number;
  processingFee: number;
  netAmount: number;
  taxAmount?: number;
  finalAmount: number;
}

export interface RiderEarnings {
  riderId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalEarnings: number;
  totalDeliveries: number;
  averageEarningsPerDelivery: number;
  payments: PaymentSummary[];
  breakdown: EarningsCalculation;
}

export interface BusinessPayments {
  businessId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalPaid: number;
  totalOrders: number;
  averageOrderValue: number;
  payments: PaymentSummary[];
}

// Payment validation
export interface PaymentValidationError {
  field: string;
  message: string;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: PaymentValidationError[];
}

// Type guards
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'].includes(status);
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return ['cash', 'card', 'digital', 'bank_transfer'].includes(method);
}

export function isValidTransactionType(type: string): type is TransactionType {
  return ['payment', 'refund', 'fee', 'bonus'].includes(type);
}

export function isValidCurrency(currency: string): currency is Currency {
  return ['USD', 'EUR', 'GBP', 'CAD'].includes(currency);
}

// Payment status helpers
export function isCompletedPayment(payment: Payment): boolean {
  return payment.status === 'completed';
}

export function isFailedPayment(payment: Payment): boolean {
  return payment.status === 'failed';
}

export function isPendingPayment(payment: Payment): boolean {
  return ['pending', 'processing'].includes(payment.status);
}