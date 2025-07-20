import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { commonAPI } from '../../services/api';
import { Button, Card, Input, Select } from '../../components/UI';
import { User, Mail, Phone, MapPin, Truck, Building, Save, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await commonAPI.getProfile();
      setProfile(response.data.user);
      setFormData(response.data.user);
    } catch (error) {
      toast.error('Failed to fetch profile');
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await commonAPI.updateProfile(formData);
      setProfile(response.data.user);
      updateUser(response.data.user);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to update profile';
      toast.error(message);
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setFormData(profile);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={formData.name || ''}
              onChange={(e) => handleChange(null, 'name', e.target.value)}
              disabled={!editing}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange(null, 'email', e.target.value)}
              disabled={!editing}
              required
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  user.role === 'business' 
                    ? 'bg-blue-100 text-blue-800' 
                    : user.role === 'rider'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                <span className="text-sm text-gray-500">
                  Account created on {new Date(formData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Role-specific Information */}
        {user.role === 'business' && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Business Information
            </h2>
            <div className="space-y-4">
              <Input
                label="Business Name"
                value={formData.profile?.businessName || ''}
                onChange={(e) => handleChange('profile', 'businessName', e.target.value)}
                disabled={!editing}
                required
              />

              <Input
                label="Business Phone"
                type="tel"
                value={formData.profile?.businessPhone || ''}
                onChange={(e) => handleChange('profile', 'businessPhone', e.target.value)}
                disabled={!editing}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Street Address"
                      value={formData.profile?.businessAddress?.street || ''}
                      onChange={(e) => handleNestedChange('profile', 'businessAddress', 'street', e.target.value)}
                      disabled={!editing}
                      required
                    />
                  </div>
                  <Input
                    placeholder="City"
                    value={formData.profile?.businessAddress?.city || ''}
                    onChange={(e) => handleNestedChange('profile', 'businessAddress', 'city', e.target.value)}
                    disabled={!editing}
                    required
                  />
                  <Input
                    placeholder="State"
                    value={formData.profile?.businessAddress?.state || ''}
                    onChange={(e) => handleNestedChange('profile', 'businessAddress', 'state', e.target.value)}
                    disabled={!editing}
                    required
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={formData.profile?.businessAddress?.zipCode || ''}
                    onChange={(e) => handleNestedChange('profile', 'businessAddress', 'zipCode', e.target.value)}
                    disabled={!editing}
                    required
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {user.role === 'rider' && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Rider Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                type="tel"
                value={formData.profile?.phone || ''}
                onChange={(e) => handleChange('profile', 'phone', e.target.value)}
                disabled={!editing}
                required
              />

              <Select
                label="Vehicle Type"
                value={formData.profile?.vehicleType || ''}
                onChange={(e) => handleChange('profile', 'vehicleType', e.target.value)}
                disabled={!editing}
                options={[
                  { value: 'bike', label: 'Bicycle' },
                  { value: 'scooter', label: 'Scooter' },
                  { value: 'car', label: 'Car' },
                  { value: 'van', label: 'Van' }
                ]}
                required
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Performance Stats
                </label>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {formData.profile?.rating?.toFixed(1) || '0.0'}
                    </div>
                    <div className="text-sm text-gray-600">Rating</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formData.profile?.completedDeliveries || 0}
                    </div>
                    <div className="text-sm text-gray-600">Deliveries</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {formData.profile?.isAvailable ? 'Available' : 'Offline'}
                    </div>
                    <div className="text-sm text-gray-600">Status</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Account Security */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Password</h3>
                <p className="text-sm text-gray-600">Last changed 30 days ago</p>
              </div>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" size="sm">
                Enable 2FA
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Email Verification</h3>
                <p className="text-sm text-gray-600">
                  {formData.isVerified ? 
                    'Your email address is verified' : 
                    'Please verify your email address'
                  }
                </p>
              </div>
              {!formData.isVerified && (
                <Button variant="outline" size="sm">
                  Verify Email
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">Receive updates about your deliveries via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-600">Get instant notifications on your device</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                <p className="text-sm text-gray-600">Receive text messages for urgent updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-medium text-red-900">Delete Account</h3>
                <p className="text-sm text-red-600">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default ProfilePage;