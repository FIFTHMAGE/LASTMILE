import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, Select } from '../../components/UI';
import { Mail, Lock, User, Phone, Building, Truck, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'rider',
    profile: {
      // Business fields
      businessName: '',
      businessAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      businessPhone: '',
      // Rider fields
      phone: '',
      vehicleType: 'bike'
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    const errorKey = section ? `${section}.${field}` : field;
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };

  const handleNestedChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'business') {
      if (!formData.profile.businessName.trim()) {
        newErrors['profile.businessName'] = 'Business name is required';
      }
      if (!formData.profile.businessPhone.trim()) {
        newErrors['profile.businessPhone'] = 'Business phone is required';
      }
      if (!formData.profile.businessAddress.street.trim()) {
        newErrors['profile.businessAddress.street'] = 'Street address is required';
      }
      if (!formData.profile.businessAddress.city.trim()) {
        newErrors['profile.businessAddress.city'] = 'City is required';
      }
      if (!formData.profile.businessAddress.state.trim()) {
        newErrors['profile.businessAddress.state'] = 'State is required';
      }
      if (!formData.profile.businessAddress.zipCode.trim()) {
        newErrors['profile.businessAddress.zipCode'] = 'ZIP code is required';
      }
    } else if (formData.role === 'rider') {
      if (!formData.profile.phone.trim()) {
        newErrors['profile.phone'] = 'Phone number is required';
      }
      if (!formData.profile.vehicleType) {
        newErrors['profile.vehicleType'] = 'Vehicle type is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Prepare the data for submission
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        profile: formData.role === 'business' ? {
          businessName: formData.profile.businessName,
          businessAddress: {
            ...formData.profile.businessAddress,
            coordinates: [0, 0] // Default coordinates - in a real app, you'd geocode the address
          },
          businessPhone: formData.profile.businessPhone
        } : {
          phone: formData.profile.phone,
          vehicleType: formData.profile.vehicleType,
          currentLocation: {
            type: 'Point',
            coordinates: [0, 0] // Default coordinates - in a real app, you'd get user's location
          }
        }
      };

      await register(registrationData);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by the auth context and displayed via toast
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">LM</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join LastMile
          </p>
        </div>

        {/* Registration Form */}
        <Card className="mt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I want to register as:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange(null, 'role', 'business')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'business'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Building className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Business</div>
                  <div className="text-xs text-gray-500">Post delivery requests</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange(null, 'role', 'rider')}
                  className={`p-4 border-2 rounded-lg text-center transition-colors ${
                    formData.role === 'rider'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Truck className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Rider</div>
                  <div className="text-xs text-gray-500">Accept delivery jobs</div>
                </button>
              </div>
            </div>

            {/* Basic Information */}
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => handleChange(null, 'name', e.target.value)}
              placeholder="Enter your full name"
              leftIcon={<User className="h-5 w-5" />}
              error={errors.name}
              fullWidth
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange(null, 'email', e.target.value)}
              placeholder="Enter your email"
              leftIcon={<Mail className="h-5 w-5" />}
              error={errors.email}
              fullWidth
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange(null, 'password', e.target.value)}
                placeholder="Create a password"
                leftIcon={<Lock className="h-5 w-5" />}
                error={errors.password}
                fullWidth
                required
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange(null, 'confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                leftIcon={<Lock className="h-5 w-5" />}
                error={errors.confirmPassword}
                fullWidth
                required
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Role-specific fields */}
            {formData.role === 'business' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-gray-900">Business Information</h3>
                
                <Input
                  label="Business Name"
                  value={formData.profile.businessName}
                  onChange={(e) => handleChange('profile', 'businessName', e.target.value)}
                  placeholder="Your business name"
                  error={errors['profile.businessName']}
                  fullWidth
                  required
                />

                <Input
                  label="Business Phone"
                  type="tel"
                  value={formData.profile.businessPhone}
                  onChange={(e) => handleChange('profile', 'businessPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  leftIcon={<Phone className="h-5 w-5" />}
                  error={errors['profile.businessPhone']}
                  fullWidth
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address
                  </label>
                  <div className="space-y-3">
                    <Input
                      placeholder="Street Address"
                      value={formData.profile.businessAddress.street}
                      onChange={(e) => handleNestedChange('profile', 'businessAddress', 'street', e.target.value)}
                      error={errors['profile.businessAddress.street']}
                      fullWidth
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="City"
                        value={formData.profile.businessAddress.city}
                        onChange={(e) => handleNestedChange('profile', 'businessAddress', 'city', e.target.value)}
                        error={errors['profile.businessAddress.city']}
                        required
                      />
                      <Input
                        placeholder="State"
                        value={formData.profile.businessAddress.state}
                        onChange={(e) => handleNestedChange('profile', 'businessAddress', 'state', e.target.value)}
                        error={errors['profile.businessAddress.state']}
                        required
                      />
                    </div>
                    <Input
                      placeholder="ZIP Code"
                      value={formData.profile.businessAddress.zipCode}
                      onChange={(e) => handleNestedChange('profile', 'businessAddress', 'zipCode', e.target.value)}
                      error={errors['profile.businessAddress.zipCode']}
                      fullWidth
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.role === 'rider' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-gray-900">Rider Information</h3>
                
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.profile.phone}
                  onChange={(e) => handleChange('profile', 'phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  leftIcon={<Phone className="h-5 w-5" />}
                  error={errors['profile.phone']}
                  fullWidth
                  required
                />

                <Select
                  label="Vehicle Type"
                  value={formData.profile.vehicleType}
                  onChange={(e) => handleChange('profile', 'vehicleType', e.target.value)}
                  error={errors['profile.vehicleType']}
                  options={[
                    { value: 'bike', label: 'Bicycle' },
                    { value: 'scooter', label: 'Scooter' },
                    { value: 'car', label: 'Car' },
                    { value: 'van', label: 'Van' }
                  ]}
                  required
                />
              </div>
            )}

            {/* Terms and Conditions */}
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
                <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              loading={loading}
              fullWidth
              size="lg"
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/login">
                <Button variant="outline" fullWidth>
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;