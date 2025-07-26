/**
 * Business registration form component
 */
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Select, LoadingSpinner } from '@/components/ui';
import { validateBusinessRegistrationRequest, BusinessRegistrationRequest } from '@/lib/types';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface BusinessRegistrationFormProps {
  onSuccess?: () => void;
}

const businessTypes = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'grocery', label: 'Grocery Store' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'other', label: 'Other' }
];

export function BusinessRegistrationForm({ onSuccess }: BusinessRegistrationFormProps) {
  const { registerBusiness } = useAuth();
  const [formData, setFormData] = useState<BusinessRegistrationRequest>({
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: 'restaurant',
    businessAddress: '',
    contactPhone: '',
    description: '',
    website: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      // Validate form data
      const validation = validateBusinessRegistrationRequest(formData);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Check password confirmation
      if (formData.password !== formData.confirmPassword) {
        setErrors(['Passwords do not match']);
        return;
      }

      // Attempt registration
      await registerBusiness(formData);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors([error instanceof Error ? error.message : 'Registration failed']);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BusinessRegistrationRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSelectChange = (field: keyof BusinessRegistrationRequest) => (
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error display */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Business Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <Input
              id="businessName"
              type="text"
              value={formData.businessName}
              onChange={handleInputChange('businessName')}
              placeholder="Enter business name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
              Business Type *
            </label>
            <Select
              value={formData.businessType}
              onValueChange={handleSelectChange('businessType')}
              disabled={loading}
            >
              {businessTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-2">
            Business Address *
          </label>
          <Input
            id="businessAddress"
            type="text"
            value={formData.businessAddress}
            onChange={handleInputChange('businessAddress')}
            placeholder="Enter complete business address"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
            Contact Phone *
          </label>
          <Input
            id="contactPhone"
            type="tel"
            value={formData.contactPhone}
            onChange={handleInputChange('contactPhone')}
            placeholder="Enter contact phone number"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Business Description
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={handleInputChange('description')}
            placeholder="Brief description of your business"
            disabled={loading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
            Website (Optional)
          </label>
          <Input
            id="website"
            type="url"
            value={formData.website || ''}
            onChange={handleInputChange('website')}
            placeholder="https://your-website.com"
            disabled={loading}
          />
        </div>
      </div>

      {/* Account Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            placeholder="Enter your email address"
            required
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="Create a password"
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="Confirm your password"
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and conditions */}
      <div className="flex items-center">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          required
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
          I agree to the{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-500">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-500">
            Privacy Policy
          </a>
        </label>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" color="white" />
            <span className="ml-2">Creating account...</span>
          </div>
        ) : (
          'Create Business Account'
        )}
      </Button>

      {/* Sign in link */}
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
  );
}