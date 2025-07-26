/**
 * Payment model with TypeScript support
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { 
  Payment as PaymentType,
  PaymentStatus,
  PaymentMethod,
  Currency,
  TransactionType,
  PaymentDetails,
  PaymentSummary,
  PaymentFilters,
  PaymentStats,
  EarningsCalculation
} from '@/lib/types';

// Extend mongoose Document with our Payment type
export interface PaymentDocument extends PaymentType, Document {
  calculateEarnings(): EarningsCalculation;
  ge