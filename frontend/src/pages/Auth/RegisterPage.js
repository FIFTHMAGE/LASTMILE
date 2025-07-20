import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, Select } from '../../components/UI';
import { Mail, Lock, User, Building, Phone, Truck, Eye, EyeOff } from 'lucide-react';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    profile: {}
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const roleOptions = [
    { value: 'business', label: 'Business Owner' },
    { value: 'rider', label: 'Delivery Rider' }
  ];

  const vehicleOptions = [
    { value: 'bike', label: 'Bicycle' },
    { value: 'scooter', label: 'Scooter/Motorcycle' },
    { value: 'car', label: 'Car' },
    { value: 'van', label: 'Van/Truck' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('profile.')) {
      const profileField = name.replace('profile.', '');
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      newErrors.role = 'Please select your role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (formData.role === 'business') {
      if (!formData.profile.businessName?.trim()) {
        newErrors['profile.businessName'] = 'Business name is required';
      }
      if (!formData.profile.businessPhone?.trim()) {
        newErrors['profile.businessPhone'] = 'Business phone is required';
      }
      if (!formData.profile.businessAddress?.trim()) {
        newErrors['profile.businessAddress'] = 'Business address is required';
      }
    }

    if (formData.role === 'rider') {
      if (!formData.profile.phone?.trim()) {
        newErrors['profile.phone'] = 'Phone number is required';
      }
      if (!formData.profile.vehicleType) {
        newErrors['profile.vehicleType'] = 'Please select your vehicle type';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) {
      return;
    }

    setLoading(true);
    try {
      // Format the data for the API
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        profile: formData.profile
      };

      await register(registrationData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <Input
        label="Full Name"
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Enter your full name"
        leftIcon={<User className="h-5 w-5" />}
        error={errors.name}
        fullWidth
        required
      />

      <Input
        label="Email Address"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
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
          name="password"
          value={formData.password}
          onChange={handleChange}
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
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <div className="relative">
        <Input
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
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
          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      <Select
        label="I am a"
        name="role"
        value={formData.role}
        onChange={handleChange}
        options={roleOptions}
        placeholder="Select your role"
        error={errors.role}
        fullWidth
        required
      />

      <Button onClick={handleNext} fullWidth size="lg">
        Continue
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {formData.role === 'business' && (
        <>
          <Input
            label="Business Name"
            type="text"
            name="profile.businessName"
            value={formData.profile.businessName || ''}
            onChange={handleChange}
            placeholder="Enter your business name"
            leftIcon={<Building className="h-5 w-5" />}
            error={errors['profile.businessName']}
            fullWidth
            required
          />

          <Input
            label="Business Phone"
            type="tel"
            name="profile.businessPhone"
            value={formData.profile.businessPhone || ''}
            onChange={handleChange}
            placeholder="Enter business phone number"
            leftIcon={<Phone className="h-5 w-5" />}
            error={errors['profile.businessPhone']}
            fullWidth
            required
          />

          <Input
            label="Business Address"
            type="text"
            name="profile.businessAddress"
            value={formData.profile.businessAddress || ''}
            onChange={handleChange}
            placeholder="Enter your business address"
            leftIcon={<Building className="h-5 w-5" />}
            error={errors['profile.businessAddress']}
            fullWidth
            required
          />
        </>
      )}

      {formData.role === 'rider' && (
        <>
          <Input
            label="Phone Number"
            type="tel"
            name="profile.phone"
            value={formData.profile.phone || ''}
            onChange={handleChange}
            placeholder="Enter your phone number"
            leftIcon={<Phone className="h-5 w-5" />}
            error={errors['profile.phone']}
            fullWidth
            required
          />

          <Select
            label="Vehicle Type"
            name="profile.vehicleType"
            value={formData.profile.vehicleType || ''}
            onChange={handleChange}
            options={vehicleOptions}
            placeholder="Select your vehicle type"
            error={errors['profile.vehicleType']}
            fullWidth
            required
          />
        </>
      )}

      <div className="flex space-x-4">
        <Button variant="outline" onClick={handleBack} fullWidth>
          Back
        </Button>
        <Button
          type="submit"
          loading={loading}
          fullWidth
          size="lg"
        >
          Create Account
        </Button>
      </div>
    </div>
  );

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
            Join the Last Mile Delivery Platform
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`h-2 w-8 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
          <div className={`h-2 w-8 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
        </div>

        {/* Registration Form */}
        <Card className="mt-8">
          <form onSubmit={handleSubmit}>
            {step === 1 ? renderStep1() : renderStep2()}
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
                  Sign In Instead
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