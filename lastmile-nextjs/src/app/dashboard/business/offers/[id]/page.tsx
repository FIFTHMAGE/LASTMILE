/**
 * Offer details page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, LoadingSpinner } from '@/components/ui';
import { withRole } from '@/contexts/AuthContext';
import { 
  ArrowLeftIcon, 
  MapPinIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  UserIcon,
  PhoneIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface OfferDetails {
  id: string;
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
    completedAt?: string;
  };
  delivery: {
    address: string;
    contactName: string;
    contactPhone: string;
    scheduledTime: string;
    instructions: string;
    completedAt?: string;
  };
  pricing: {
    budget: number;
    total: number;
    urgency: string;
  };
  status: string;
  rider?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    rating: number;
  };
  business: {
    id: string;
    name: string;
    email: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

function OfferDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const offerId = params.id as string;
  
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (offerId) {
      fetchOfferDetails();
    }
  }, [offerId]);

  const fetchOfferDetails = async () => {
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOffer(data.data);
      } else {
        router.push('/dashboard/business/offers');
      }
    } catch (error) {
      console.error('Failed to fetch offer details:', error);
      router.push('/dashboard/business/offers');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!confirm('Are you sure you want to cancel this offer?')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        fetchOfferDetails(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to cancel offer:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'error'; icon: React.ReactNode }> = {
      pending: { 
        variant: 'warning', 
        icon: <ClockIcon className="h-4 w-4" /> 
      },
      accepted: { 
        variant: 'info', 
        icon: <CheckCircleIcon className="h-4 w-4" /> 
      },
      picked_up: { 
        variant: 'info', 
        icon: <TruckIcon className="h-4 w-4" /> 
      },
      in_transit: { 
        variant: 'info', 
        icon: <TruckIcon className="h-4 w-4" /> 
      },
      delivered: { 
        variant: 'success', 
        icon: <CheckCircleIcon className="h-4 w-4" /> 
      },
      completed: { 
        variant: 'success', 
        icon: <CheckCircleIcon className="h-4 w-4" /> 
      },
      cancelled: { 
        variant: 'error', 
        icon: <XCircleIcon className="h-4 w-4" /> 
      },
    };

    const config = variants[status] || { variant: 'default' as const, icon: null };

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const canEditOffer = (status: string) => {
    return status === 'pending';
  };

  const canCancelOffer = (status: string) => {
    return ['pending', 'accepted'].includes(status);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600',
      accepted: 'text-blue-600',
      picked_up: 'text-blue-600',
      in_transit: 'text-blue-600',
      delivered: 'text-green-600',
      completed: 'text-green-600',
      cancelled: 'text-red-600',
    };
    return colors[status] || 'text-gray-600';
  };

  if (loading) {
    return (
      <DashboardLayout title="Offer Details">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading offer details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!offer) {
    return (
      <DashboardLayout title="Offer Not Found">
        <div className="text-center py-12">
          <p className="text-gray-600">Offer not found or you don't have permission to view it.</p>
          <Button 
            className="mt-4"
            onClick={() => router.push('/dashboard/business/offers')}
          >
            Back to Offers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Offer Details"
      description={`Offer #${offer.id.slice(-8)}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Offers
        </Button>

        <div className="flex items-center gap-3">
          {getStatusBadge(offer.status)}
          <div className="flex gap-2">
            {canEditOffer(offer.status) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/dashboard/business/offers/${offer.id}/edit`)}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {canCancelOffer(offer.status) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelOffer}
                disabled={actionLoading}
                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
              >
                {actionLoading ? (
                  <LoadingSpinner size="sm" color="red" />
                ) : (
                  <>
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Package Information */}
          <Card>
            <CardHeader>
              <CardTitle>Package Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900">{offer.package.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="text-gray-900 capitalize">{offer.package.type}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Weight</label>
                  <p className="text-gray-900">{offer.package.weight} kg</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Length</label>
                  <p className="text-gray-900">{offer.package.dimensions.length} cm</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Width</label>
                  <p className="text-gray-900">{offer.package.dimensions.width} cm</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Height</label>
                  <p className="text-gray-900">{offer.package.dimensions.height} cm</p>
                </div>
              </div>

              {offer.package.specialInstructions && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Special Instructions</label>
                  <p className="text-gray-900">{offer.package.specialInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pickup & Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPinIcon className="h-5 w-5 text-green-600 mr-2" />
                  Pickup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{offer.pickup.address}</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact</label>
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{offer.pickup.contactName}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{offer.pickup.contactPhone}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Scheduled Time</label>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{formatDateTime(offer.pickup.scheduledTime)}</span>
                  </div>
                </div>
                {offer.pickup.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Completed At</label>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-gray-900">{formatDateTime(offer.pickup.completedAt)}</span>
                    </div>
                  </div>
                )}
                {offer.pickup.instructions && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Instructions</label>
                    <p className="text-gray-900 text-sm">{offer.pickup.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPinIcon className="h-5 w-5 text-orange-600 mr-2" />
                  Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-900">{offer.delivery.address}</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact</label>
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{offer.delivery.contactName}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{offer.delivery.contactPhone}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Scheduled Time</label>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{formatDateTime(offer.delivery.scheduledTime)}</span>
                  </div>
                </div>
                {offer.delivery.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Completed At</label>
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-gray-900">{formatDateTime(offer.delivery.completedAt)}</span>
                    </div>
                  </div>
                )}
                {offer.delivery.instructions && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Instructions</label>
                    <p className="text-gray-900 text-sm">{offer.delivery.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-purple-600 mr-2" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Budget:</span>
                <span className="font-semibold">${offer.pricing.budget.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold text-lg">${offer.pricing.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Urgency:</span>
                <span className="font-semibold capitalize">{offer.pricing.urgency}</span>
              </div>
            </CardContent>
          </Card>

          {/* Rider Information */}
          {offer.rider && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TruckIcon className="h-5 w-5 text-blue-600 mr-2" />
                  Assigned Rider
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-900">{offer.rider.name}</p>
                  <p className="text-sm text-gray-600">{offer.rider.email}</p>
                  <p className="text-sm text-gray-600">{offer.rider.phone}</p>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-2">Rating:</span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(offer.rider!.rating) 
                            ? 'text-yellow-400' 
                            : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-1 text-sm text-gray-600">
                      ({offer.rider.rating.toFixed(1)})
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {offer.timeline.map((event, index) => (
                  <div key={index} className="flex items-start">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 mr-3 ${getStatusColor(event.status).replace('text-', 'bg-')}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${getStatusColor(event.status)}`}>
                        {event.status.replace('_', ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(event.timestamp)}
                      </p>
                      {event.note && (
                        <p className="text-xs text-gray-600 mt-1">{event.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withRole(OfferDetailsPage, ['business', 'admin']);