/**
 * Rider offers browsing page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, LoadingSpinner, Select, Input } from '@/components/ui';
import { withRole } from '@/contexts/AuthContext';
import { 
  MapPinIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

interface Offer {
  id: string;
  package: {
    description: string;
    type: string;
    weight: number;
  };
  pickup: {
    address: string;
    scheduledTime: string;
    contactName: string;
    contactPhone: string;
  };
  delivery: {
    address: string;
    scheduledTime: string;
    contactName: string;
    contactPhone: string;
  };
  pricing: {
    total: number;
    urgency: string;
  };
  business: {
    name: string;
    rating: number;
  };
  distanceFromRider?: number;
  estimatedDuration?: number;
  createdAt: string;
  status: string;
}

function RiderOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [distanceFilter, setDistanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    fetchOffers();
    checkAvailability();
  }, [currentPage, urgencyFilter, distanceFilter, sortBy]);

  const fetchOffers = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(urgencyFilter !== 'all' && { urgency: urgencyFilter }),
        ...(distanceFilter !== 'all' && { maxDistance: distanceFilter }),
        ...(searchTerm && { search: searchTerm }),
        sortBy,
      });

      const response = await fetch(`/api/offers/nearby?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data.data.offers);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAvailable(data.data.riderProfile?.isAvailable || false);
      }
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOffers();
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
        // Remove accepted offer from list
        setOffers(offers.filter(offer => offer.id !== offerId));
      }
    } catch (error) {
      console.error('Failed to accept offer:', error);
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
          isAvailable: !isAvailable
        }),
      });

      if (response.ok) {
        setIsAvailable(!isAvailable);
        if (!isAvailable) {
          fetchOffers(); // Refresh offers when going online
        }
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      standard: 'default',
      express: 'warning',
      urgent: 'error',
    };

    return (
      <Badge variant={variants[urgency] || 'default'} size="sm">
        {urgency.toUpperCase()}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <DashboardLayout title="Available Offers">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading offers..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Available Offers"
      description="Browse and accept delivery opportunities"
    >
      {/* Availability Status */}
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm font-medium text-gray-900">
                  Status: {isAvailable ? 'Available for deliveries' : 'Offline'}
                </span>
              </div>
              <Button
                size="sm"
                onClick={toggleAvailability}
                variant={isAvailable ? 'outline' : 'default'}
              >
                {isAvailable ? 'Go Offline' : 'Go Online'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <Select
            value={sortBy}
            onValueChange={setSortBy}
          >
            <option value="distance">Sort by Distance</option>
            <option value="price">Sort by Price</option>
            <option value="urgency">Sort by Urgency</option>
            <option value="created">Sort by Date</option>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Search offers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
            <Button variant="outline" onClick={handleSearch}>
              Search
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Select
              value={urgencyFilter}
              onValueChange={setUrgencyFilter}
            >
              <option value="all">All Urgency</option>
              <option value="standard">Standard</option>
              <option value="express">Express</option>
              <option value="urgent">Urgent</option>
            </Select>

            <Select
              value={distanceFilter}
              onValueChange={setDistanceFilter}
            >
              <option value="all">All Distances</option>
              <option value="5">Within 5km</option>
              <option value="10">Within 10km</option>
              <option value="20">Within 20km</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Offers List */}
      {!isAvailable ? (
        <Card>
          <CardContent className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">You are currently offline</p>
            <p className="text-xs text-gray-500 mb-4">Go online to see available offers</p>
            <Button onClick={toggleAvailability}>
              Go Online
            </Button>
          </CardContent>
        </Card>
      ) : offers.length > 0 ? (
        <div className="space-y-4">
          {offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Offer Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {offer.package.description || 'Package Delivery'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {offer.business.name}
                          {offer.business.rating && (
                            <span className="ml-2">
                              ⭐ {offer.business.rating.toFixed(1)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-600">
                          ${offer.pricing.total.toFixed(2)}
                        </span>
                        {getUrgencyBadge(offer.pricing.urgency)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {/* Pickup */}
                      <div>
                        <div className="flex items-center text-gray-600 mb-1">
                          <MapPinIcon className="h-4 w-4 mr-1 text-green-500" />
                          <span className="font-medium">Pickup</span>
                        </div>
                        <p className="text-gray-900 truncate">{offer.pickup.address}</p>
                        <div className="flex items-center text-gray-500 mt-1">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatDateTime(offer.pickup.scheduledTime)}
                        </div>
                      </div>

                      {/* Delivery */}
                      <div>
                        <div className="flex items-center text-gray-600 mb-1">
                          <MapPinIcon className="h-4 w-4 mr-1 text-orange-500" />
                          <span className="font-medium">Delivery</span>
                        </div>
                        <p className="text-gray-900 truncate">{offer.delivery.address}</p>
                        <div className="flex items-center text-gray-500 mt-1">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatDateTime(offer.delivery.scheduledTime)}
                        </div>
                      </div>
                    </div>

                    {/* Package Details */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <span>Type: {offer.package.type}</span>
                      <span>Weight: {offer.package.weight}kg</span>
                      {offer.distanceFromRider && (
                        <span>Distance: {offer.distanceFromRider.toFixed(1)}km</span>
                      )}
                      {offer.estimatedDuration && (
                        <span>Est. Duration: {formatDuration(offer.estimatedDuration)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 lg:flex-col lg:w-32">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center justify-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => acceptOffer(offer.id)}
                      className="flex items-center justify-center"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {searchTerm || urgencyFilter !== 'all' || distanceFilter !== 'all'
                ? 'No offers match your filters' 
                : 'No offers available right now'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {searchTerm || urgencyFilter !== 'all' || distanceFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back later for new opportunities'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default withRole(RiderOffersPage, ['rider', 'admin']);