import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAPI } from '../../services/api';
import { Button, Card, Input, Select } from '../../components/UI';
import { ArrowLeft, MapPin, Package, DollarSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const CreateOffer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    packageDetails: {
      weight: '',
      dimensions: {
        length: '',
        width: '',
        height: ''
      },
      fragile: false,
      specialInstructions: ''
    },
    pickup: {
      address: '',
      contactName: '',
      contactPhone: '',
      instructions: ''
    },
    delivery: {
      address: '',
      contactName: '',
      contactPhone: '',
      instructions: ''
    },
    payment: {
      amount: '',
      currency: 'USD',
      paymentMethod: 'card'
    }
  });
  const [errors, setErrors] = useState({});

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

    // Basic info validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Package details validation
    if (!formData.packageDetails.weight || formData.packageDetails.weight <= 0) {
      newErrors['packageDetails.weight'] = 'Package weight is required';
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

    // Payment validation
    if (!formData.payment.amount || formData.payment.amount <= 0) {
      newErrors['payment.amount'] = 'Payment amount is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      // Convert string values to numbers where needed
      const offerData = {
        ...formData,
        packageDetails: {
          ...formData.packageDetails,
          weight: parseFloat(formData.packageDetails.weight),
          dimensions: {
            length: parseFloat(formData.packageDetails.dimensions.length) || 0,
            width: parseFloat(formData.packageDetails.dimensions.width) || 0,
            height: parseFloat(formData.packageDetails.dimensions.height) || 0
          }
        },
        payment: {
          ...formData.payment,
          amount: parseFloat(formData.payment.amount)
        }
      };

      await businessAPI.createOffer(offerData);
      toast.success('Offer created successfully!');
      navigate('/offers');
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to create offer';
      toast.error(message);
      console.error('Error creating offer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/offers')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Offers
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Offer</h1>
          <p className="text-gray-600">Fill in the details for your delivery request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <Input
              label="Offer Title"
              value={formData.title}
              onChange={(e) => handleChange(null, 'title', e.target.value)}
              placeholder="e.g., Document delivery to downtown office"
              error={errors.title}
              required
              fullWidth
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange(null, 'description', e.target.value)}
                placeholder="Additional details about the delivery..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Package Details */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Package Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              min="0.1"
              value={formData.packageDetails.weight}
              onChange={(e) => handleChange('packageDetails', 'weight', e.target.value)}
              placeholder="2.5"
              error={errors['packageDetails.weight']}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Dimensions (cm) - Optional
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Length"
                  value={formData.packageDetails.dimensions.length}
                  onChange={(e) => handleNestedChange('packageDetails', 'dimensions', 'length', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Width"
                  value={formData.packageDetails.dimensions.width}
                  onChange={(e) => handleNestedChange('packageDetails', 'dimensions', 'width', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Height"
                  value={formData.packageDetails.dimensions.height}
                  onChange={(e) => handleNestedChange('packageDetails', 'dimensions', 'height', e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.packageDetails.fragile}
                  onChange={(e) => handleChange('packageDetails', 'fragile', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Fragile item</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions (Optional)
              </label>
              <textarea
                value={formData.packageDetails.specialInstructions}
                onChange={(e) => handleChange('packageDetails', 'specialInstructions', e.target.value)}
                placeholder="Handle with care, keep upright, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Pickup Details */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Pickup Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Pickup Address"
                value={formData.pickup.address}
                onChange={(e) => handleChange('pickup', 'address', e.target.value)}
                placeholder="123 Main St, New York, NY 10001"
                error={errors['pickup.address']}
                required
                fullWidth
              />
            </div>

            <Input
              label="Contact Name"
              value={formData.pickup.contactName}
              onChange={(e) => handleChange('pickup', 'contactName', e.target.value)}
              placeholder="John Doe"
              error={errors['pickup.contactName']}
              required
            />

            <Input
              label="Contact Phone"
              type="tel"
              value={formData.pickup.contactPhone}
              onChange={(e) => handleChange('pickup', 'contactPhone', e.target.value)}
              placeholder="(555) 123-4567"
              error={errors['pickup.contactPhone']}
              required
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Instructions (Optional)
              </label>
              <textarea
                value={formData.pickup.instructions}
                onChange={(e) => handleChange('pickup', 'instructions', e.target.value)}
                placeholder="Ring doorbell, ask for reception, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Delivery Details */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Delivery Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Delivery Address"
                value={formData.delivery.address}
                onChange={(e) => handleChange('delivery', 'address', e.target.value)}
                placeholder="456 Oak Ave, Brooklyn, NY 11201"
                error={errors['delivery.address']}
                required
                fullWidth
              />
            </div>

            <Input
              label="Contact Name"
              value={formData.delivery.contactName}
              onChange={(e) => handleChange('delivery', 'contactName', e.target.value)}
              placeholder="Jane Smith"
              error={errors['delivery.contactName']}
              required
            />

            <Input
              label="Contact Phone"
              type="tel"
              value={formData.delivery.contactPhone}
              onChange={(e) => handleChange('delivery', 'contactPhone', e.target.value)}
              placeholder="(555) 987-6543"
              error={errors['delivery.contactPhone']}
              required
            />

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Instructions (Optional)
              </label>
              <textarea
                value={formData.delivery.instructions}
                onChange={(e) => handleChange('delivery', 'instructions', e.target.value)}
                placeholder="Leave at front desk, call upon arrival, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        {/* Payment Details */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Payment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Payment Amount"
              type="number"
              step="0.01"
              min="1"
              value={formData.payment.amount}
              onChange={(e) => handleChange('payment', 'amount', e.target.value)}
              placeholder="25.00"
              error={errors['payment.amount']}
              required
            />

            <Select
              label="Currency"
              value={formData.payment.currency}
              onChange={(e) => handleChange('payment', 'currency', e.target.value)}
              options={[
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' }
              ]}
            />

            <Select
              label="Payment Method"
              value={formData.payment.paymentMethod}
              onChange={(e) => handleChange('payment', 'paymentMethod', e.target.value)}
              options={[
                { value: 'card', label: 'Credit Card' },
                { value: 'cash', label: 'Cash' },
                { value: 'digital', label: 'Digital Wallet' }
              ]}
            />
          </div>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/offers')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
          >
            Create Offer
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateOffer;