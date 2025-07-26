/**
 * Create new offer page
 */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, LoadingSpinner } from '@/components/ui';
import { withRole } from '@/contexts/AuthContext';
import { ArrowLeftIcon, MapPinIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface CreateOfferForm {
  package: {
    description: string;
    type: string;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    specialInstructions: string;
  };
  pickup: {
    address: string;
    contactName: string;
    contactPhone: string;
    scheduledTime: string;
    instructions: string;
  };
  delivery: {
    address: string;
    contactName: string;
    contactPhone: string;
    scheduledTime: string;
    instructions: string;
  };
  pricing: {
    budget: number;
    urgency: 'standard' | 'express' | 'urgent';
  };
}

function CreateOfferPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CreateOfferForm>({
    package: {
      description: '',
      type: 'document',
      weight: 0,
      dimensions: {
        length: 0,
        width: 0,
        height: 0,
      },
      specialInstructions: '',
    },
    pickup: {
      address: '',
      contactName: '',
      contactPhone: '',
      scheduledTime: '',
      instructions: '',
    },
    delivery: {
      address: '',
      contactName: '',
      contactPhone: '',
      scheduledTime: '',
      instructions: '',
    },
    pricing: {
      budget: 0,
      urgency: 'standard',
    },
  });

  const handleInputChange = (section: keyof CreateOfferForm, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    
    // Clear error when user starts typing
    const errorKey = `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleNestedInputChange = (section: keyof CreateOfferForm, nestedField: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedField]: {
          ...(prev[section] as any)[nestedField],
          [field]: value,
        },
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Package validation
    if (!formData.package.description.trim()) {
      newErrors['package.description'] = 'Package description is required';
    }
    if (formData.package.weight <= 0) {
      newErrors['package.weight'] = 'Package weight must be greater than 0';
    }

    // Pickup validation
    if (!formData.pickup.address.trim()) {
      newErrors['pickup.address'] = 'Pickup address is required';
    }
    if (!formData.pickup.contactName.trim()) {
      newErrors['pickup.contactName'] = 'Pickup contact name is required';
    }
    if (!formData.pickup.contactPhone.trim()) {
      newErrors['pickup.contactPhone'] = 'Pickup contact phone is required';
    }
    if (!formData.pickup.scheduledTime) {
      newErrors['pickup.scheduledTime'] = 'Pickup time is required';
    }

    // Delivery validation
    if (!formData.delivery.address.trim()) {
      newErrors['delivery.address'] = 'Delivery address is required';
    }
    if (!formData.delivery.contactName.trim()) {
      newErrors['delivery.contactName'] = 'Delivery contact name is required';
    }
    if (!formData.delivery.contactPhone.trim()) {
      newErrors['delivery.contactPhone'] = 'Delivery contact phone is required';
    }
    if (!formData.delivery.scheduledTime) {
      newErrors['delivery.scheduledTime'] = 'Delivery time is required';
    }

    // Pricing validation
    if (formData.pricing.budget <= 0) {
      newErrors['pricing.budget'] = 'Budget must be greater than 0';
    }

    // Time validation
    const pickupTime = new Date(formData.pickup.scheduledTime);
    const deliveryTime = new Date(formData.delivery.scheduledTime);
    const now = new Date();

    if (pickupTime <= now) {
      newErrors['pickup.scheduledTime'] = 'Pickup time must be in the future';
    }
    if (deliveryTime <= pickupTime) {
      newErrors['delivery.scheduledTime'] = 'Delivery time must be after pickup time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard/business/offers');
      } else {
        setErrors({ general: data.error?.message || 'Failed to create offer' });
      }
    } catch (error) {
      console.error('Failed to create offer:', error);
      setErrors({ general: 'An error occurred while creating the offer' });
    } finally {
      setLoading(false);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  return (
    <DashboardLayout 
      title="Create New Offer"
      description="Create a new delivery request"
    >
      {/* Back Button */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Offers
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{errors.general}</div>
          </div>
        )}

        {/* Package Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="bg-blue-100 rounded-full p-2 mr-3">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              Package Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Description *
                </label>
                <Input
                  value={formData.package.description}
                  onChange={(e) => handleInputChange('package', 'description', e.target.value)}
                  placeholder="Describe what needs to be delivered"
                  error={errors['package.description']}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Package Type *
                </label>
                <Select
                  value={formData.package.type}
                  onValueChange={(value) => handleInputChange('package', 'type', value)}
                >
                  <option value="document">Document</option>
                  <option value="package">Package</option>
                  <option value="food">Food</option>
                  <option value="fragile">Fragile Item</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg) *
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.package.weight}
                  onChange={(e) => handleInputChange('package', 'weight', parseFloat(e.target.value) || 0)}
                  error={errors['package.weight']}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Length (cm)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.package.dimensions.length}
                  onChange={(e) => handleNestedInputChange('package', 'dimensions', 'length', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width (cm)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.package.dimensions.width}
                  onChange={(e) => handleNestedInputChange('package', 'dimensions', 'width', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.package.dimensions.height}
                  onChange={(e) => handleNestedInputChange('package', 'dimensions', 'height', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                value={formData.package.specialInstructions}
                onChange={(e) => handleInputChange('package', 'specialInstructions', e.target.value)}
                placeholder="Any special handling instructions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Pickup Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="bg-green-100 rounded-full p-2 mr-3">
                <MapPinIcon className="h-5 w-5 text-green-600" />
              </div>
              Pickup Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Address *
              </label>
              <Input
                value={formData.pickup.address}
                onChange={(e) => handleInputChange('pickup', 'address', e.target.value)}
                placeholder="Enter pickup address"
                error={errors['pickup.address']}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name *
                </label>
                <Input
                  value={formData.pickup.contactName}
                  onChange={(e) => handleInputChange('pickup', 'contactName', e.target.value)}
                  placeholder="Contact person name"
                  error={errors['pickup.contactName']}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone *
                </label>
                <Input
                  type="tel"
                  value={formData.pickup.contactPhone}
                  onChange={(e) => handleInputChange('pickup', 'contactPhone', e.target.value)}
                  placeholder="Contact phone number"
                  error={errors['pickup.contactPhone']}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Pickup Time *
              </label>
              <Input
                type="datetime-local"
                min={getMinDateTime()}
                value={formData.pickup.scheduledTime}
                onChange={(e) => handleInputChange('pickup', 'scheduledTime', e.target.value)}
                error={errors['pickup.scheduledTime']}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={formData.pickup.instructions}
                onChange={(e) => handleInputChange('pickup', 'instructions', e.target.value)}
                placeholder="Any specific pickup instructions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="bg-orange-100 rounded-full p-2 mr-3">
                <MapPinIcon className="h-5 w-5 text-orange-600" />
              </div>
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address *
              </label>
              <Input
                value={formData.delivery.address}
                onChange={(e) => handleInputChange('delivery', 'address', e.target.value)}
                placeholder="Enter delivery address"
                error={errors['delivery.address']}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name *
                </label>
                <Input
                  value={formData.delivery.contactName}
                  onChange={(e) => handleInputChange('delivery', 'contactName', e.target.value)}
                  placeholder="Contact person name"
                  error={errors['delivery.contactName']}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone *
                </label>
                <Input
                  type="tel"
                  value={formData.delivery.contactPhone}
                  onChange={(e) => handleInputChange('delivery', 'contactPhone', e.target.value)}
                  placeholder="Contact phone number"
                  error={errors['delivery.contactPhone']}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Delivery Time *
              </label>
              <Input
                type="datetime-local"
                min={formData.pickup.scheduledTime || getMinDateTime()}
                value={formData.delivery.scheduledTime}
                onChange={(e) => handleInputChange('delivery', 'scheduledTime', e.target.value)}
                error={errors['delivery.scheduledTime']}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={formData.delivery.instructions}
                onChange={(e) => handleInputChange('delivery', 'instructions', e.target.value)}
                placeholder="Any specific delivery instructions..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="bg-purple-100 rounded-full p-2 mr-3">
                <CurrencyDollarIcon className="h-5 w-5 text-purple-600" />
              </div>
              Pricing & Urgency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget ($) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricing.budget}
                  onChange={(e) => handleInputChange('pricing', 'budget', parseFloat(e.target.value) || 0)}
                  placeholder="Enter your budget"
                  error={errors['pricing.budget']}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <Select
                  value={formData.pricing.urgency}
                  onValueChange={(value) => handleInputChange('pricing', 'urgency', value)}
                >
                  <option value="standard">Standard (Normal delivery)</option>
                  <option value="express">Express (Priority delivery)</option>
                  <option value="urgent">Urgent (Immediate delivery)</option>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Pricing Guidelines</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Standard delivery: Base rate applies</li>
                <li>• Express delivery: 25% premium</li>
                <li>• Urgent delivery: 50% premium</li>
                <li>• Distance and package size may affect final pricing</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" color="white" />
                <span className="ml-2">Creating...</span>
              </div>
            ) : (
              'Create Offer'
            )}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}

export default withRole(CreateOfferPage, ['business', 'admin']);