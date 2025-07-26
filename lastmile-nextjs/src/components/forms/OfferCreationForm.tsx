/**
 * Offer creation form with React Hook Form and Zod validation
 */
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
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
import { offerCreationSchema, OfferCreationFormData } from '@/lib/validation/schemas';

export interface OfferCreationFormProps {
  onSuccess?: (offerId: string) => void;
  className?: string;
}

const packageTypeOptions = [
  { value: 'document', label: 'Document' },
  { value: 'small_package', label: 'Small Package' },
  { value: 'medium_package', label: 'Medium Package' },
  { value: 'large_package', label: 'Large Package' },
  { value: 'food', label: 'Food' },
  { value: 'fragile', label: 'Fragile Item' },
];

const urgencyOptions = [
  { value: 'standard', label: 'Standard (2-4 hours)' },
  { value: 'express', label: 'Express (1-2 hours)' },
  { value: 'same_day', label: 'Same Day' },
  { value: 'scheduled', label: 'Scheduled' },
];

const temperatureOptions = [
  { value: 'ambient', label: 'Room Temperature' },
  { value: 'cold', label: 'Cold (Refrigerated)' },
  { value: 'frozen', label: 'Frozen' },
];

export function OfferCreationForm({ onSuccess, className }: OfferCreationFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>('');

  const form = useForm<OfferCreationFormData>({
    resolver: zodResolver(offerCreationSchema),
    defaultValues: {
      packageType: undefined,
      description: '',
      weight: 0,
      pickupAddress: '',
      pickupCity: '',
      pickupState: '',
      pickupZipCode: '',
      pickupInstructions: '',
      pickupContactName: '',
      pickupContactPhone: '',
      deliveryAddress: '',
      deliveryCity: '',
      deliveryState: '',
      deliveryZipCode: '',
      deliveryInstructions: '',
      deliveryContactName: '',
      deliveryContactPhone: '',
      urgency: undefined,
      scheduledPickupTime: '',
      scheduledDeliveryTime: '',
      offeredPrice: 0,
      requiresSignature: false,
      requiresId: false,
      fragile: false,
      temperature: 'ambient',
    },
  });

  const { handleSubmit, formState: { isSubmitting, errors }, watch } = form;
  const urgency = watch('urgency');
  const packageType = watch('packageType');

  const onSubmit = async (data: OfferCreationFormData) => {
    setServerError('');
    
    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('lastmile_auth_token')}`,
        },
        body: JSON.stringify({
          package: {
            type: data.packageType,
            description: data.description,
            weight: data.weight,
            dimensions: data.dimensions,
          },
          pickup: {
            address: data.pickupAddress,
            city: data.pickupCity,
            state: data.pickupState,
            zipCode: data.pickupZipCode,
            instructions: data.pickupInstructions,
            contactName: data.pickupContactName,
            contactPhone: data.pickupContactPhone,
          },
          delivery: {
            address: data.deliveryAddress,
            city: data.deliveryCity,
            state: data.deliveryState,
            zipCode: data.deliveryZipCode,
            instructions: data.deliveryInstructions,
            contactName: data.deliveryContactName,
            contactPhone: data.deliveryContactPhone,
          },
          urgency: data.urgency,
          scheduledPickupTime: data.scheduledPickupTime,
          scheduledDeliveryTime: data.scheduledDeliveryTime,
          pricing: {
            offered: data.offeredPrice,
          },
          specialRequirements: {
            requiresSignature: data.requiresSignature,
            requiresId: data.requiresId,
            fragile: data.fragile,
            temperature: data.temperature,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create offer');
      }

      if (onSuccess) {
        onSuccess(result.data.id);
      } else {
        router.push(`/dashboard/business/offers/${result.data.id}`);
      }
    } catch (error) {
      console.error('Offer creation error:', error);
      setServerError(error instanceof Error ? error.message : 'Failed to create offer. Please try again.');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Create Delivery Request</CardTitle>
        <p className="text-sm text-gray-600">
          Fill out the details for your delivery request. All fields marked with * are required.
        </p>
      </CardHeader>
      
      <CardContent>
        <Form>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Server Error */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{serverError}</div>
              </div>
            )}

            {/* Package Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Package Information</h3>
              
              <FormField name="packageType">
                <FormLabel required>Package Type</FormLabel>
                <Select
                  placeholder="Select package type"
                  options={packageTypeOptions}
                  error={errors.packageType?.message}
                  onChange={(value) => form.setValue('packageType', value as any)}
                  disabled={isSubmitting}
                />
                {errors.packageType && <FormMessage>{errors.packageType.message}</FormMessage>}
              </FormField>

              <FormField name="description">
                <FormLabel required>Description</FormLabel>
                <FormDescription>
                  Provide a detailed description of what needs to be delivered
                </FormDescription>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the package contents, any special handling requirements, etc."
                  {...form.register('description')}
                  disabled={isSubmitting}
                />
                {errors.description && <FormMessage>{errors.description.message}</FormMessage>}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="weight">
                  <FormLabel required>Weight (kg)</FormLabel>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    placeholder="0.0"
                    error={errors.weight?.message}
                    {...form.register('weight', { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  {errors.weight && <FormMessage>{errors.weight.message}</FormMessage>}
                </FormField>

                {packageType === 'food' && (
                  <FormField name="temperature">
                    <FormLabel>Temperature Requirements</FormLabel>
                    <Select
                      placeholder="Select temperature"
                      options={temperatureOptions}
                      onChange={(value) => form.setValue('temperature', value as any)}
                      disabled={isSubmitting}
                    />
                  </FormField>
                )}
              </div>

              {/* Special Requirements */}
              <div className="space-y-2">
                <FormLabel>Special Requirements</FormLabel>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="requiresSignature"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      {...form.register('requiresSignature')}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="requiresSignature" className="ml-2 text-sm text-gray-900">
                      Requires signature on delivery
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="requiresId"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      {...form.register('requiresId')}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="requiresId" className="ml-2 text-sm text-gray-900">
                      Requires ID verification
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="fragile"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      {...form.register('fragile')}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="fragile" className="ml-2 text-sm text-gray-900">
                      Fragile - handle with care
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Pickup Information</h3>
              
              <FormField name="pickupContactName">
                <FormLabel required>Contact Name</FormLabel>
                <Input
                  placeholder="Name of person at pickup location"
                  error={errors.pickupContactName?.message}
                  {...form.register('pickupContactName')}
                  disabled={isSubmitting}
                />
                {errors.pickupContactName && <FormMessage>{errors.pickupContactName.message}</FormMessage>}
              </FormField>

              <FormField name="pickupContactPhone">
                <FormLabel required>Contact Phone</FormLabel>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  error={errors.pickupContactPhone?.message}
                  {...form.register('pickupContactPhone')}
                  disabled={isSubmitting}
                />
                {errors.pickupContactPhone && <FormMessage>{errors.pickupContactPhone.message}</FormMessage>}
              </FormField>

              <FormField name="pickupAddress">
                <FormLabel required>Pickup Address</FormLabel>
                <Input
                  placeholder="123 Main Street"
                  error={errors.pickupAddress?.message}
                  {...form.register('pickupAddress')}
                  disabled={isSubmitting}
                />
                {errors.pickupAddress && <FormMessage>{errors.pickupAddress.message}</FormMessage>}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="pickupCity">
                  <FormLabel required>City</FormLabel>
                  <Input
                    placeholder="City"
                    error={errors.pickupCity?.message}
                    {...form.register('pickupCity')}
                    disabled={isSubmitting}
                  />
                  {errors.pickupCity && <FormMessage>{errors.pickupCity.message}</FormMessage>}
                </FormField>

                <FormField name="pickupState">
                  <FormLabel required>State</FormLabel>
                  <Input
                    placeholder="State"
                    error={errors.pickupState?.message}
                    {...form.register('pickupState')}
                    disabled={isSubmitting}
                  />
                  {errors.pickupState && <FormMessage>{errors.pickupState.message}</FormMessage>}
                </FormField>

                <FormField name="pickupZipCode">
                  <FormLabel required>ZIP Code</FormLabel>
                  <Input
                    placeholder="12345"
                    error={errors.pickupZipCode?.message}
                    {...form.register('pickupZipCode')}
                    disabled={isSubmitting}
                  />
                  {errors.pickupZipCode && <FormMessage>{errors.pickupZipCode.message}</FormMessage>}
                </FormField>
              </div>

              <FormField name="pickupInstructions">
                <FormLabel>Pickup Instructions</FormLabel>
                <FormDescription>
                  Any special instructions for the pickup location (optional)
                </FormDescription>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="e.g., Ring doorbell, ask for manager, etc."
                  {...form.register('pickupInstructions')}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            {/* Delivery Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Delivery Information</h3>
              
              <FormField name="deliveryContactName">
                <FormLabel required>Contact Name</FormLabel>
                <Input
                  placeholder="Name of person at delivery location"
                  error={errors.deliveryContactName?.message}
                  {...form.register('deliveryContactName')}
                  disabled={isSubmitting}
                />
                {errors.deliveryContactName && <FormMessage>{errors.deliveryContactName.message}</FormMessage>}
              </FormField>

              <FormField name="deliveryContactPhone">
                <FormLabel required>Contact Phone</FormLabel>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  error={errors.deliveryContactPhone?.message}
                  {...form.register('deliveryContactPhone')}
                  disabled={isSubmitting}
                />
                {errors.deliveryContactPhone && <FormMessage>{errors.deliveryContactPhone.message}</FormMessage>}
              </FormField>

              <FormField name="deliveryAddress">
                <FormLabel required>Delivery Address</FormLabel>
                <Input
                  placeholder="456 Oak Avenue"
                  error={errors.deliveryAddress?.message}
                  {...form.register('deliveryAddress')}
                  disabled={isSubmitting}
                />
                {errors.deliveryAddress && <FormMessage>{errors.deliveryAddress.message}</FormMessage>}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="deliveryCity">
                  <FormLabel required>City</FormLabel>
                  <Input
                    placeholder="City"
                    error={errors.deliveryCity?.message}
                    {...form.register('deliveryCity')}
                    disabled={isSubmitting}
                  />
                  {errors.deliveryCity && <FormMessage>{errors.deliveryCity.message}</FormMessage>}
                </FormField>

                <FormField name="deliveryState">
                  <FormLabel required>State</FormLabel>
                  <Input
                    placeholder="State"
                    error={errors.deliveryState?.message}
                    {...form.register('deliveryState')}
                    disabled={isSubmitting}
                  />
                  {errors.deliveryState && <FormMessage>{errors.deliveryState.message}</FormMessage>}
                </FormField>

                <FormField name="deliveryZipCode">
                  <FormLabel required>ZIP Code</FormLabel>
                  <Input
                    placeholder="12345"
                    error={errors.deliveryZipCode?.message}
                    {...form.register('deliveryZipCode')}
                    disabled={isSubmitting}
                  />
                  {errors.deliveryZipCode && <FormMessage>{errors.deliveryZipCode.message}</FormMessage>}
                </FormField>
              </div>

              <FormField name="deliveryInstructions">
                <FormLabel>Delivery Instructions</FormLabel>
                <FormDescription>
                  Any special instructions for the delivery location (optional)
                </FormDescription>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="e.g., Leave at front door, call upon arrival, etc."
                  {...form.register('deliveryInstructions')}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>

            {/* Timing and Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Timing & Pricing</h3>
              
              <FormField name="urgency">
                <FormLabel required>Urgency Level</FormLabel>
                <Select
                  placeholder="Select urgency level"
                  options={urgencyOptions}
                  error={errors.urgency?.message}
                  onChange={(value) => form.setValue('urgency', value as any)}
                  disabled={isSubmitting}
                />
                {errors.urgency && <FormMessage>{errors.urgency.message}</FormMessage>}
              </FormField>

              {urgency === 'scheduled' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField name="scheduledPickupTime">
                    <FormLabel>Scheduled Pickup Time</FormLabel>
                    <Input
                      type="datetime-local"
                      {...form.register('scheduledPickupTime')}
                      disabled={isSubmitting}
                    />
                  </FormField>

                  <FormField name="scheduledDeliveryTime">
                    <FormLabel>Scheduled Delivery Time</FormLabel>
                    <Input
                      type="datetime-local"
                      {...form.register('scheduledDeliveryTime')}
                      disabled={isSubmitting}
                    />
                  </FormField>
                </div>
              )}

              <FormField name="offeredPrice">
                <FormLabel required>Offered Price ($)</FormLabel>
                <FormDescription>
                  How much are you willing to pay for this delivery?
                </FormDescription>
                <Input
                  type="number"
                  step="0.01"
                  min="5"
                  max="500"
                  placeholder="25.00"
                  error={errors.offeredPrice?.message}
                  {...form.register('offeredPrice', { valueAsNumber: true })}
                  disabled={isSubmitting}
                />
                {errors.offeredPrice && <FormMessage>{errors.offeredPrice.message}</FormMessage>}
              </FormField>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Creating Offer...</span>
                  </div>
                ) : (
                  'Create Delivery Request'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}