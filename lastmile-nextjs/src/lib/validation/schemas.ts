/**
 * Validation schemas using Zod for form validation
 */
import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number');

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const businessRegistrationSchema = z.object({
  // Business information
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['restaurant', 'retail', 'pharmacy', 'grocery', 'other'], {
    errorMap: () => ({ message: 'Please select a business type' }),
  }),
  businessDescription: z.string().optional(),
  
  // Contact information
  contactPerson: z.string().min(2, 'Contact person name must be at least 2 characters'),
  email: emailSchema,
  phone: phoneSchema,
  
  // Address
  address: z.string().min(10, 'Please enter a complete address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  
  // Authentication
  password: passwordSchema,
  confirmPassword: z.string(),
  
  // Terms and conditions
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: 'You must accept the privacy policy',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const riderRegistrationSchema = z.object({
  // Personal information
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().refine(date => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 18;
  }, 'You must be at least 18 years old'),
  
  // Contact information
  email: emailSchema,
  phone: phoneSchema,
  
  // Address
  address: z.string().min(10, 'Please enter a complete address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  
  // Vehicle information
  vehicleType: z.enum(['bicycle', 'motorcycle', 'car', 'van'], {
    errorMap: () => ({ message: 'Please select a vehicle type' }),
  }),
  vehicleMake: z.string().min(2, 'Vehicle make is required'),
  vehicleModel: z.string().min(2, 'Vehicle model is required'),
  vehicleYear: z.number().min(2000, 'Vehicle must be from 2000 or newer'),
  licensePlate: z.string().min(2, 'License plate is required'),
  
  // Documents
  driversLicense: z.string().min(5, 'Driver\'s license number is required'),
  insurance: z.string().min(5, 'Insurance policy number is required'),
  
  // Authentication
  password: passwordSchema,
  confirmPassword: z.string(),
  
  // Terms and conditions
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: 'You must accept the privacy policy',
  }),
  backgroundCheck: z.boolean().refine(val => val === true, {
    message: 'You must consent to a background check',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Profile update schemas
export const businessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['restaurant', 'retail', 'pharmacy', 'grocery', 'other']),
  businessDescription: z.string().optional(),
  contactPerson: z.string().min(2, 'Contact person name must be at least 2 characters'),
  phone: phoneSchema,
  address: z.string().min(10, 'Please enter a complete address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),
  operatingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  }).optional(),
});

export const riderProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: phoneSchema,
  address: z.string().min(10, 'Please enter a complete address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  vehicleType: z.enum(['bicycle', 'motorcycle', 'car', 'van']),
  vehicleMake: z.string().min(2, 'Vehicle make is required'),
  vehicleModel: z.string().min(2, 'Vehicle model is required'),
  vehicleYear: z.number().min(2000, 'Vehicle must be from 2000 or newer'),
  licensePlate: z.string().min(2, 'License plate is required'),
  driversLicense: z.string().min(5, 'Driver\'s license number is required'),
  insurance: z.string().min(5, 'Insurance policy number is required'),
  emergencyContact: z.object({
    name: z.string().min(2, 'Emergency contact name is required'),
    phone: phoneSchema,
    relationship: z.string().min(2, 'Relationship is required'),
  }),
});

// Offer creation schema
export const offerCreationSchema = z.object({
  // Package information
  packageType: z.enum(['document', 'small_package', 'medium_package', 'large_package', 'food', 'fragile'], {
    errorMap: () => ({ message: 'Please select a package type' }),
  }),
  description: z.string().min(10, 'Please provide a detailed description (at least 10 characters)'),
  weight: z.number().min(0.1, 'Weight must be at least 0.1 kg').max(50, 'Weight cannot exceed 50 kg'),
  dimensions: z.object({
    length: z.number().min(1, 'Length must be at least 1 cm'),
    width: z.number().min(1, 'Width must be at least 1 cm'),
    height: z.number().min(1, 'Height must be at least 1 cm'),
  }).optional(),
  
  // Pickup information
  pickupAddress: z.string().min(10, 'Please enter a complete pickup address'),
  pickupCity: z.string().min(2, 'Pickup city is required'),
  pickupState: z.string().min(2, 'Pickup state is required'),
  pickupZipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  pickupInstructions: z.string().optional(),
  pickupContactName: z.string().min(2, 'Pickup contact name is required'),
  pickupContactPhone: phoneSchema,
  
  // Delivery information
  deliveryAddress: z.string().min(10, 'Please enter a complete delivery address'),
  deliveryCity: z.string().min(2, 'Delivery city is required'),
  deliveryState: z.string().min(2, 'Delivery state is required'),
  deliveryZipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
  deliveryInstructions: z.string().optional(),
  deliveryContactName: z.string().min(2, 'Delivery contact name is required'),
  deliveryContactPhone: phoneSchema,
  
  // Timing
  urgency: z.enum(['standard', 'express', 'same_day', 'scheduled'], {
    errorMap: () => ({ message: 'Please select urgency level' }),
  }),
  scheduledPickupTime: z.string().optional(),
  scheduledDeliveryTime: z.string().optional(),
  
  // Pricing
  offeredPrice: z.number().min(5, 'Minimum offer is $5').max(500, 'Maximum offer is $500'),
  
  // Special requirements
  requiresSignature: z.boolean().optional(),
  requiresId: z.boolean().optional(),
  fragile: z.boolean().optional(),
  temperature: z.enum(['ambient', 'cold', 'frozen']).optional(),
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Email verification schema
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
});

// Export types
export type LoginFormData = z.infer<typeof loginSchema>;
export type BusinessRegistrationFormData = z.infer<typeof businessRegistrationSchema>;
export type RiderRegistrationFormData = z.infer<typeof riderRegistrationSchema>;
export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;
export type RiderProfileFormData = z.infer<typeof riderProfileSchema>;
export type OfferCreationFormData = z.infer<typeof offerCreationSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type EmailVerificationFormData = z.infer<typeof emailVerificationSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;