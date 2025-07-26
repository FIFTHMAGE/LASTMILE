/**
 * Business profile page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, LoadingSpinner } from '@/components/ui';
import { withRole, useAuth } from '@/contexts/AuthContext';
import { 
  UserIcon, 
  BuildingOfficeIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  MapPinIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface BusinessProfile {
  name: string;
  email: string;
  businessProfile: {
    businessName: string;
    businessType: string;
    address: string;
    phone: string;
    website?: string;
    description?: string;
    taxId?: string;
    registrationNumber?: string;
  };
  isEmailVerified: boolean;
  createdAt: string;
}

function BusinessProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<BusinessProfile | null>(null);

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

  const handleInputChange = (field: string, value: string, isNested = false, nestedField?: string) => {
    if (!formData) return;

    if (isNested && nestedField) {
      setFormData(prev => ({
        ...prev!,
        [nestedField]: {
          ...prev![nestedField as keyof BusinessProfile] as any,
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
    const errorKey = isNested && nestedField ? `${nestedField}.${field}` : field;
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
    if (!formData.businessProfile.businessName.trim()) {
      newErrors['businessProfile.businessName'] = 'Business name is required';
    }
    if (!formData.businessProfile.businessType.trim()) {
      newErrors['businessProfile.businessType'] = 'Business type is required';
    }
    if (!formData.businessProfile.address.trim()) {
      newErrors['businessProfile.address'] = 'Address is required';
    }
    if (!formData.businessProfile.phone.trim()) {
      newErrors['businessProfile.phone'] = 'Phone is required';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors['email'] = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (formData.businessProfile.phone && !phoneRegex.test(formData.businessProfile.phone.replace(/\s/g, ''))) {
      newErrors['businessProfile.phone'] = 'Please enter a valid phone number';
    }

    // Website validation
    if (formData.businessProfile.website && formData.businessProfile.website.trim()) {
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(formData.businessProfile.website)) {
        newErrors['businessProfile.website'] = 'Please enter a valid website URL (include http:// or https://)';
      }
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

  const handleResendVerification = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: profile?.email }),
      });

      if (response.ok) {
        // Show success message or notification
        console.log('Verification email sent');
      }
    } catch (error) {
      console.error('Failed to resend verification:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Business Profile">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading profile..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile || !formData) {
    return (
      <DashboardLayout title="Business Profile">
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
      title="Business Profile"
      description="Manage your business information and settings"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Profile</h1>
          <p className="text-gray-600">Update your business information and contact details</p>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          Unverified
                        </span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleResendVerification}
                        >
                          Verify
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 text-green-600 mr-2" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  {editing ? (
                    <Input
                      value={formData.businessProfile.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value, true, 'businessProfile')}
                      error={errors['businessProfile.businessName']}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.businessProfile.businessName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type *
                  </label>
                  {editing ? (
                    <Input
                      value={formData.businessProfile.businessType}
                      onChange={(e) => handleInputChange('businessType', e.target.value, true, 'businessProfile')}
                      error={errors['businessProfile.businessType']}
                      placeholder="e.g., Restaurant, Retail, E-commerce"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.businessProfile.businessType}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address *
                </label>
                {editing ? (
                  <Input
                    value={formData.businessProfile.address}
                    onChange={(e) => handleInputChange('address', e.target.value, true, 'businessProfile')}
                    error={errors['businessProfile.address']}
                    placeholder="Full business address"
                  />
                ) : (
                  <p className="text-gray-900">{profile.businessProfile.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  {editing ? (
                    <Input
                      type="tel"
                      value={formData.businessProfile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value, true, 'businessProfile')}
                      error={errors['businessProfile.phone']}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.businessProfile.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  {editing ? (
                    <Input
                      type="url"
                      value={formData.businessProfile.website || ''}
                      onChange={(e) => handleInputChange('website', e.target.value, true, 'businessProfile')}
                      error={errors['businessProfile.website']}
                      placeholder="https://your-website.com"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.businessProfile.website ? (
                        <a 
                          href={profile.businessProfile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {profile.businessProfile.website}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Description
                </label>
                {editing ? (
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={formData.businessProfile.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value, true, 'businessProfile')}
                    placeholder="Brief description of your business..."
                  />
                ) : (
                  <p className="text-gray-900">
                    {profile.businessProfile.description || 'No description provided'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID
                  </label>
                  {editing ? (
                    <Input
                      value={formData.businessProfile.taxId || ''}
                      onChange={(e) => handleInputChange('taxId', e.target.value, true, 'businessProfile')}
                      placeholder="Tax identification number"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.businessProfile.taxId || 'Not provided'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  {editing ? (
                    <Input
                      value={formData.businessProfile.registrationNumber || ''}
                      onChange={(e) => handleInputChange('registrationNumber', e.target.value, true, 'businessProfile')}
                      placeholder="Business registration number"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.businessProfile.registrationNumber || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Verified</span>
                <span className={`text-sm font-medium ${
                  profile.isEmailVerified ? 'text-green-600' : 'text-red-600'
                }`}>
                  {profile.isEmailVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Account Type</span>
                <span className="text-sm font-medium text-gray-900">Business</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium text-gray-900">
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
                <PhoneIcon className="h-4 w-4 mr-2" />
                Update Notifications
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MapPinIcon className="h-4 w-4 mr-2" />
                Manage Addresses
              </Button>
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card>
            <CardHeader>
              <CardTitle>Help & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Need help with your account? Contact our support team.
              </p>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withRole(BusinessProfilePage, ['business', 'admin']);