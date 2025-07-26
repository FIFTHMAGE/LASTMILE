/**
 * Rider dashboard page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, LoadingSpinner } from '@/components/ui';
import { withRole } from '@/contexts/AuthContext';
import { 
  TruckIcon, 
  CurrencyDollarIcon, 
  ClockIcon, 
  StarIcon,
  MapPinIcon,
  EyeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface RiderStats {
  totalDeliveries: number;
  activeDeliveries: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  averageRating: number;
  completionRate: number;
  isAvailable: boolean;
}

interface AvailableOffer {
  id: string;
  package: {
    description: string;
    type: string;
  };
  pickup: {
    address: string;
    scheduledTime: string;
  };
  delivery: {
    address: string;
    scheduledTime: string;
  };
  pricing: {
    total: number;
  };
  urgency: string;
  distanceFromRider?: number;
  business: {
    name: string;
  };
}

interface ActiveDelivery {
  id: string;
  status: string;
  package: {
    description: string;
  };
  pickup: {
    address: string;
  };
  delivery: {
    address: string;
  };
  pricing: {
    total: number;
  };
  business: {
    name: string;
  };
}

function RiderDashboardPage() {
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [availableOffers, setAvailableOffers] = useState<AvailableOffer[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/user/dashboard/rider', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
        setAvailableOffers(data.data.availableOffers);
        setActiveDeliveries(data.data.activeDeliveries);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
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
          isAvailable: !stats?.isAvailable
        }),
      });

      if (response.ok) {
        setStats(prev => prev ? { ...prev, isAvailable: !prev.isAvailable } : null);
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  const acceptOffer = async (offerId: string) => {
    try {
      const response = await fetch(`/api/offers/${offerId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        // Refresh dashboard data
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to accept offer:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      accepted: 'warning',
      picked_up: 'info',
      in_transit: 'info',
      delivered: 'success',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      low: 'default',
      standard: 'info',
      high: 'warning',
      urgent: 'error',
    };

    return (
      <Badge variant={variants[urgency] || 'default'} size="sm">
        {urgency.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Rider Dashboard">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Rider Dashboard"
      description="Find delivery opportunities and track your earnings"
    >
      {/* Availability Toggle */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${stats?.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    You are {stats?.isAvailable ? 'Available' : 'Offline'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {stats?.isAvailable 
                      ? 'You can receive new delivery offers' 
                      : 'Turn on availability to start receiving offers'
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={toggleAvailability}
                variant={stats?.isAvailable ? 'outline' : 'default'}
              >
                {stats?.isAvailable ? 'Go Offline' : 'Go Online'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TruckIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalDeliveries || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats?.totalEarnings?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <StarIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.averageRating?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.completionRate?.toFixed(0) || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>Active Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            {activeDeliveries.length > 0 ? (
              <div className="space-y-4">
                {activeDeliveries.map((delivery) => (
                  <div key={delivery.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {delivery.package.description || 'Package Delivery'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {delivery.business.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">
                          ${delivery.pricing.total.toFixed(2)}
                        </span>
                        {getStatusBadge(delivery.status)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        From: {delivery.pickup.address}
                      </div>
                      <div className="flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        To: {delivery.delivery.address}
                      </div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="outline">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {delivery.status === 'accepted' && (
                        <Button size="sm">
                          Confirm Pickup
                        </Button>
                      )}
                      {delivery.status === 'picked_up' && (
                        <Button size="sm">
                          Mark In Transit
                        </Button>
                      )}
                      {delivery.status === 'in_transit' && (
                        <Button size="sm">
                          Confirm Delivery
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No active deliveries</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Offers */}
        <Card>
          <CardHeader>
            <CardTitle>Available Offers</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.isAvailable ? (
              availableOffers.length > 0 ? (
                <div className="space-y-4">
                  {availableOffers.map((offer) => (
                    <div key={offer.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {offer.package.description || 'Package Delivery'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {offer.business.name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            ${offer.pricing.total.toFixed(2)}
                          </span>
                          {getUrgencyBadge(offer.urgency)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          From: {offer.pickup.address}
                        </div>
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          To: {offer.delivery.address}
                        </div>
                        {offer.distanceFromRider && (
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {offer.distanceFromRider.toFixed(1)} km away
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="outline">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => acceptOffer(offer.id)}
                        >
                          Accept Offer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No offers available</p>
                  <p className="text-xs text-gray-500">Check back later for new opportunities</p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">You are currently offline</p>
                <p className="text-xs text-gray-500">Go online to see available offers</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default withRole(RiderDashboardPage, ['rider', 'admin']);