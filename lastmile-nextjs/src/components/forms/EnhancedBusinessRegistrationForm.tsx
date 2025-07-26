/**
 * Enhanced business registration form with React Hook Form and Zod validation
 */
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { 
  Button, 
  Input, 
  Select, 
  LoadingSpinner, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui';
import { Form, FormField, FormLabel, FormMessage, FormDescription } from '@/components/ui/Form';
import { businessRegistrationSchema, BusinessRegistrationFormData } from '@/lib/validation/schemas';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface EnhancedBusinessRegistrationFormProps {
  onSuccess?: () => void;
  className?: string;
}

const businessTypeOptions = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'grocery', label: 'Grocery Store' },
  { value: 'other', label: 'Other' },
];

const stateOptions = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  // Add more states as needed
];

export function EnhancedBusinessRegistrationForm({ onSuccess, className }: EnhancedBusinessRegistrationFormProps) {
  const { registerBusiness } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string>('');

  const form = useForm<BusinessRegistrationFormData>({
    resolver: zodResolver(businessRegistrationSchema),
    defaultValues: {
      businessName: '',
      businessType: undefined,
      businessDescription: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const { handleSubmit, formState: { isSubmitting, errors }, watch } = form;

  const onSubmit = async (data: BusinessRegistrationFormData) => {
    setServerError('');
    
    try {
      await registerBusiness({
        email: data.email,
        password: data.password,
        profile: {
          businessName: data.businessName,
          businessType: data.businessType,
          businessDescription: data.businessDescription,
          contactPerson: data.contactPerson,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
        },
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Registration error:', error);
      setServerError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Create Business Account</CardTitle>
        <p className="text-sm text-gray-600">
          Join our platform to start creating delivery requests for your business.
        </p>
      </CardHeader>
      
      <CardContent>
        <Form>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Server Error */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{serverError}</div>
              </div>
            )}

            {/* Business Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
              
              <FormField name="businessName">
                <FormLabel required>Business Name</FormLabel>
                <Input
                  placeholder="Enter your business name"
                  error={errors.businessName?.message}
                  {...form.register('businessName')}
                  disabled={isSubmitting}
                />
                {errors.businessName && <FormMessage>{errors.businessName.message}</FormMessage>}
              </FormField>

              <FormField name="businessType">
                <FormLabel required>Business Type</FormLabel>
                <Select
                  placeholder="Select business type"
                  options={businessTypeOptions}
                  error={errors.businessType?.message}
                  onChange={(value) => form.setValue('businessType', value as any)}
                  disabled={isSubmitting}
                />
                {errors.businessType && <FormMessage>{errors.businessType.message}</FormMessage>}
              </FormField>

              <FormField name="businessDescription">
                <FormLabel>Business Description</FormLabel>
                <FormDescription>
                  Brief description of your business (optional)
                </FormDescription>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe your business..."
                  {...form.register('businessDescription')}
                  disabled={isSubmitting}
                />
                {errors.businessDescription && <FormMessage>{errors.businessDescription.message}</FormMessage>}
              </FormField>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
              
              <FormField name="contactPerson">
                <FormLabel required>Contact Person</FormLabel>
                <Input
                  placeholder="Full name of primary contact"
                  error={errors.contactPerson?.message}
                  {...form.register('contactPerson')}
                  disabled={isSubmitting}
                />
                {errors.contactPerson && <FormMessage>{errors.contactPerson.message}</FormMessage>}
              </FormField>

              <FormField name="email">
                <FormLabel required>Email Address</FormLabel>
                <Input
                  type="email"
                  placeholder="business@example.com"
                  error={errors.email?.message}
                  {...form.register('email')}
                  disabled={isSubmitting}
                />
                {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
              </FormField>

              <FormField name="phone">
                <FormLabel required>Phone Number</FormLabel>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  error={errors.phone?.message}
                  {...form.register('phone')}
                  disabled={isSubmitting}
                />
                {errors.phone && <FormMessage>{errors.phone.message}</FormMessage>}
              </FormField>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Business Address</h3>
              
              <FormField name="address">
                <FormLabel required>Street Address</FormLabel>
                <Input
                  placeholder="123 Main Street"
                  error={errors.address?.message}
                  {...form.register('address')}
                  disabled={isSubmitting}
                />
                {errors.address && <FormMessage>{errors.address.message}</FormMessage>}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="city">
                  <FormLabel required>City</FormLabel>
                  <Input
                    placeholder="City"
                    error={errors.city?.message}
                    {...form.register('city')}
                    disabled={isSubmitting}
                  />
                  {errors.city && <FormMessage>{errors.city.message}</FormMessage>}
                </FormField>

                <FormField name="state">
                  <FormLabel required>State</FormLabel>
                  <Select
                    placeholder="Select state"
                    options={stateOptions}
                    error={errors.state?.message}
                    onChange={(value) => form.setValue('state', value)}
                    disabled={isSubmitting}
                  />
                  {errors.state && <FormMessage>{errors.state.message}</FormMessage>}
                </FormField>

                <FormField name="zipCode">
                  <FormLabel required>ZIP Code</FormLabel>
                  <Input
                    placeholder="12345"
                    error={errors.zipCode?.message}
                    {...form.register('zipCode')}
                    disabled={isSubmitting}
                  />
                  {errors.zipCode && <FormMessage>{errors.zipCode.message}</FormMessage>}
                </FormField>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Account Security</h3>
              
              <FormField name="password">
                <FormLabel required>Password</FormLabel>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    error={errors.password?.message}
                    {...form.register('password')}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && <FormMessage>{errors.password.message}</FormMessage>}
              </FormField>

              <FormField name="confirmPassword">
                <FormLabel required>Confirm Password</FormLabel>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    error={errors.confirmPassword?.message}
                    {...form.register('confirmPassword')}
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <FormMessage>{errors.confirmPassword.message}</FormMessage>}
              </FormField>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  id="acceptTerms"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  {...form.register('acceptTerms')}
                  disabled={isSubmitting}
                />
                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
                  I accept the{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-500" target="_blank">
                    Terms and Conditions
                  </a>
                </label>
              </div>
              {errors.acceptTerms && <FormMessage>{errors.acceptTerms.message}</FormMessage>}

              <div className="flex items-start">
                <input
                  id="acceptPrivacy"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  {...form.register('acceptPrivacy')}
                  disabled={isSubmitting}
                />
                <label htmlFor="acceptPrivacy" className="ml-2 block text-sm text-gray-900">
                  I accept the{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-500" target="_blank">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {errors.acceptPrivacy && <FormMessage>{errors.acceptPrivacy.message}</FormMessage>}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Creating Account...</span>
                </div>
              ) : (
                'Create Business Account'
              )}
            </Button>

            {/* Login link */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </a>
              </span>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}