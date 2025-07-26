/**
 * Rider registration form component
 */
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, Select, LoadingSpinner } from '@/components/ui';
import { validateRiderRegistrationRequest, RiderRegistrationRequest } from '@/lib/types';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface RiderRegistrationFormProps {
  onSuccess?: () => void;
}

const vehicleTypes = [
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'scooter', label: 'Scooter' },
  { value: 'car', label: 'Car' },
  { value: 'van', label: 'Van' }
];

export function RiderRegistrationForm({ onSuccess }: RiderRegistrationFormProps) {
  const { registerRider } = useAuth();
  const [formData, setFormData] = useState<RiderRegistrationRequest>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    vehicleType: 'bicycle',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: new Date().getFullYear(),
    licensePlate: '',
    vehicleColor: '',
    driverLicenseNumber: '',
    driverLicenseExpiry: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiry: ''
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
      const validation = validateRiderRegistrationRequest(formData);
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
      await registerRider(formData);
      
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

  const handleInputChange = (field: keyof RiderRegistrationRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'vehicleYear' ? parseInt(e.target.value) || new Date().getFullYear() : e.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSelectChange = (field: keyof RiderRegistrationRequest) => (
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

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleInputChange('firstName')}
              placeholder="Enter your first name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleInputChange('lastName')}
              placeholder="Enter your last name"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange('phone')}
              placeholder="Enter your phone number"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
            </label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth || ''}
              onChange={handleInputChange('dateOfBirth')}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <Input
            id="address"
            type="text"
            value={formData.address}
            onChange={handleInputChange('address')}
            placeholder="Enter your complete address"
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Type *
            </label>
            <Select
              value={formData.vehicleType}
              onValueChange={handleSelectChange('vehicleType')}
              disabled={loading}
            >
              {vehicleTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="vehicleMake" className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Make
            </label>
            <Input
              id="vehicleMake"
              type="text"
              value={formData.vehicleMake || ''}
              onChange={handleInputChange('vehicleMake')}
              placeholder="e.g., Honda, Toyota"
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Model
            </label>
            <Input
              id="vehicleModel"
              type="text"
              value={formData.vehicleModel || ''}
              onChange={handleInputChange('vehicleModel')}
              placeholder="e.g., Civic, Corolla"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="vehicleYear" className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <Input
              id="vehicleYear"
              type="number"
              value={formData.vehicleYear}
              onChange={handleInputChange('vehicleYear')}
              min="1990"
              max={new Date().getFullYear() + 1}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="vehicleColor" className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <Input
              id="vehicleColor"
              type="text"
              value={formData.vehicleColor || ''}
              onChange={handleInputChange('vehicleColor')}
              placeholder="e.g., Red, Blue"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-2">
            License Plate
          </label>
          <Input
            id="licensePlate"
            type="text"
            value={formData.licensePlate || ''}
            onChange={handleInputChange('licensePlate')}
            placeholder="Enter license plate number"
            disabled={loading}
          />
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Documents</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="driverLicenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Driver's License Number
            </label>
            <Input
              id="driverLicenseNumber"
              type="text"
              value={formData.driverLicenseNumber || ''}
              onChange={handleInputChange('driverLicenseNumber')}
              placeholder="Enter license number"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="driverLicenseExpiry" className="block text-sm font-medium text-gray-700 mb-2">
              License Expiry Date
            </label>
            <Input
              id="driverLicenseExpiry"
              type="date"
              value={formData.driverLicenseExpiry || ''}
              onChange={handleInputChange('driverLicenseExpiry')}
              disabled={loading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="insuranceProvider" className="block text-sm font-medium text-gray-700 mb-2">
              Insurance Provider
            </label>
            <Input
              id="insuranceProvider"
              type="text"
              value={formData.insuranceProvider || ''}
              onChange={handleInputChange('insuranceProvider')}
              placeholder="e.g., State Farm, Geico"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="insurancePolicyNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Policy Number
            </label>
            <Input
              id="insurancePolicyNumber"
              type="text"
              value={formData.insurancePolicyNumber || ''}
              onChange={handleInputChange('insurancePolicyNumber')}
              placeholder="Enter policy number"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="insuranceExpiry" className="block text-sm font-medium text-gray-700 mb-2">
            Insurance Expiry Date
          </label>
          <Input
            id="insuranceExpiry"
            type="date"
            value={formData.insuranceExpiry || ''}
            onChange={handleInputChange('insuranceExpiry')}
            disabled={loading}
            className="md:w-1/2"
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
          'Create Rider Account'
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