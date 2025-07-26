/**
 * Rider profile page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, LoadingSpinner, Select } from '@/components/ui';
import { withRole, useAuth } from '@/contexts/AuthContext';
import { 
  UserIcon, 
  TruckIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  StarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface RiderProfile {
  name: string;
  email: string;
  riderProfile: {
    vehicleType: string;
    vehicleModel: string;
    vehiclePlate: string;
    licenseNumber: string;
    phone: string;
    address: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
    bankDetails: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
    };
    isAvailable: boolean;
    rating: number;
    totalDeliveries: number;
    completionRate: number;
  };
  isEmailVerified: boolean;
  createdAt: string;
}

function RiderProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<RiderProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.data);
        setFormData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string, isNested = false, nestedField?: string, isDoubleNested = false, doubleNestedField?: string) => {
    if (!formData) return;

    if (isDoubleNested && nestedField && doubleNestedField) {
      setFormData(prev => ({
        ...prev!,
        [nestedField]: {
          ...prev![nestedField as keyof RiderProfile] as any,
          [doubleNestedField]: {
            ...(prev![nestedField as keyof RiderProfile] as any)[doubleNestedField],
            [field]: value,
          },
        },
      }));
    } else if (isNested && nestedField) {
      setFormData(prev => ({
        ...prev!,
        [nestedField]: {
          ...prev![nestedField as keyof RiderProfile] as any,
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev!,
        [field]: value,
      }));
    }

    // Clear error when user starts typing
    const errorKey = isDoubleNested && nestedField && doubleNestedField 
      ? `${nestedField}.${doubleNestedField}.${field}`
      : isNested && nestedField 
        ? `${nestedField}.${field}` 
        : field;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!formData) return false;

    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors['name'] = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors['email'] = 'Email is required';
    }
    if (!formData.riderProfile.phone.trim()) {
      newErrors['riderProfile.phone'] = 'Phone is required';
    }
    if (!formData.riderProfile.address.trim()) {
      newErrors['riderProfile.address'] = 'Address is required';
    }
    if (!formData.riderProfile.vehicleType.trim()) {
      newErrors['riderProfile.vehicleType'] = 'Vehicle type is required';
    }
    if (!formData.riderProfile.vehicleModel.trim()) {
      newErrors['riderProfile.vehicleModel'] = 'Vehicle model is required';
    }
    if (!formData.riderProfile.vehiclePlate.trim()) {
      newErrors['riderProfile.vehiclePlate'] = 'Vehicle plate is required';
    }
    if (!formData.riderProfile.licenseNumber.trim()) {
      newErrors['riderProfile.licenseNumber'] = 'License number is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors['email'] = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (formData.riderProfile.phone && !phoneRegex.test(formData.riderProfile.phone.replace(/\s/g, ''))) {
      newErrors['riderProfile.phone'] = 'Please enter a valid phone number';
    }

    // Emergency contact validation
    if (!formData.riderProfile.emergencyContact.name.trim()) {
      newErrors['riderProfile.emergencyContact.name'] = 'Emergency contact name is required';
    }
    if (!formData.riderProfile.emergencyContact.phone.trim()) {
      newErrors['riderProfile.emergencyContact.phone'] = 'Emergency contact phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(formData);
        setEditing(false);
        await refreshUser(); // Update auth context
      } else {
        setErrors({ general: data.error?.message || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setErrors({ general: 'An error occurred while updating profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setEditing(false);
    setErrors({});
  };

  const toggleAvailability = async () => {
    try {
      const response = await fetch('/api/user/availability', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isAvailable: !profile?.riderProfile.isAvailable
        }),
      });

      if (response.ok) {
        setProfile(prev => prev ? {
          ...prev,
          riderProfile: {
            ...prev.riderProfile,
            isAvailable: !prev.riderProfile.isAvailable
          }
        } : null);
        setFormData(prev => prev ? {
          ...prev,
          riderProfile: {
            ...prev.riderProfile,
            isAvailable: !prev.riderProfile.isAvailable
          }
        } : null);
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Rider Profile">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading profile..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !formData) {
    return (
      <DashboardLayout title="Rider Profile">
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load profile data.</p>
          <Button className="mt-4" onClick={fetchProfile}>
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Rider Profile"
      description="Manage your rider information and settings"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rider Profile</h1>
          <p className="text-gray-600">Update your personal and vehicle information</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={saving}
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Saving...</span>
                  </div>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="text-sm text-red-600">{errors.general}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="h-5 w-5 text-blue-600 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  {editing ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={errors['name']}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="flex items-center gap-2">
                    {editing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        error={errors['email']}
                        className="flex-1"
                      />
                    ) : (
                      <p className="text-gray-900 flex-1">{profile.email}</p>
                    )}
                    {!profile.isEmailVerified && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  {editing ? (
                    <Input
                      type="tel"
                      value={formData.riderProfile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value, true, 'riderProfile')}
                      error={errors['riderProfile.phone']}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.riderProfile.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Number *
                  </label>
                  {editing ? (
                    <Input
                      value={formData.riderProfile.licenseNumber}
                      onChange={(e) => handleInputChange('licenseNumber', e.target.value, true, 'riderProfile')}
                      error={errors['riderProfile.licenseNumber']}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.riderProfile.licenseNumber}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                {editing ? (
                  <Input
                    value={formData.riderProfile.address}
                    onChange={(e) => handleInputChange('address', e.target.value, true, 'riderProfile')}
                    error={errors['riderProfile.address']}
                    placeholder="Full address"
                  />
                ) : (
                  <p className="text-gray-900">{profile.riderProfile.address}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TruckIcon className="h-5 w-5 text-green-600 mr-2" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type *
                  </label>
                  {editing ? (
                    <Select
                      value={formData.riderProfile.vehicleType}
                      onValueChange={(value) => handleInputChange('vehicleType', value, true, 'riderProfile')}
                    >
                      <option value="bicycle">Bicycle</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="scooter">Scooter</option>
                      <option value="car">Car</option>
                      <option value="van">Van</option>
                    </Select>
                  ) : (
                    <p className="text-gray-900 capitalize">{profile.riderProfile.vehicleType}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Model *
                  </label>
                  {editing ? (
                    <Input
                      value={formData.riderProfile.vehicleModel}
                      onChange={(e) => handleInputChange('vehicleModel', e.target.value, true, 'riderProfile')}
                      error={errors['riderProfile.vehicleModel']}
                      placeholder="e.g., Honda Civic, Yamaha MT-07"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.riderProfile.vehicleModel}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Plate *
                </label>
                {editing ? (
                  <Input
                    value={formData.riderProfile.vehiclePlate}
                    onChange={(e) => handleInputChange('vehiclePlate', e.target.value, true, 'riderProfile')}
                    error={errors['riderProfile.vehiclePlate']}
                    placeholder="Vehicle license plate number"
                  />
                ) : (
                  <p className="text-gray-900">{profile.riderProfile.vehiclePlate}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-red-600 mr-2" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  {editing ? (
                    <Input
                      value={formData.riderProfile.emergencyContact.name}
                      onChange={(e) => handleInputChange('name', e.target.value, true, 'riderProfile', true, 'emergencyContact')}
                      error={errors['riderProfile.emergencyContact.name']}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.riderProfile.emergencyContact.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone *
                  </label>
                  {editing ? (
                    <Input
                      type="tel"
                      value={formData.riderProfile.emergencyContact.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value, true, 'riderProfile', true, 'emergencyContact')}
                      error={errors['riderProfile.emergencyContact.phone']}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.riderProfile.emergencyContact.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship
                </label>
                {editing ? (
                  <Input
                    value={formData.riderProfile.emergencyContact.relationship}
                    onChange={(e) => handleInputChange('relationship', e.target.value, true, 'riderProfile', true, 'emergencyContact')}
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                ) : (
                  <p className="text-gray-900">
                    {profile.riderProfile.emergencyContact.relationship || 'Not specified'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Availability Status */}
          <Card>
            <CardHeader>
              <CardTitle>Availability Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${profile.riderProfile.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-sm font-medium">
                    {profile.riderProfile.isAvailable ? 'Available' : 'Offline'}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={toggleAvailability}
                  variant={profile.riderProfile.isAvailable ? 'outline' : 'default'}
                >
                  {profile.riderProfile.isAvailable ? 'Go Offline' : 'Go Online'}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {profile.riderProfile.isAvailable 
                  ? 'You can receive new delivery offers' 
                  : 'Turn on availability to start receiving offers'
                }
              </p>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Rating</span>
                <div className="flex items-center">
                  <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="font-medium">
                    {profile.riderProfile.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Deliveries</span>
                <span className="font-medium">{profile.riderProfile.totalDeliveries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-medium">{profile.riderProfile.completionRate.toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="font-medium">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                View Earnings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MapPinIcon className="h-4 w-4 mr-2" />
                Update Location
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withRole(RiderProfilePage, ['rider', 'admin']);