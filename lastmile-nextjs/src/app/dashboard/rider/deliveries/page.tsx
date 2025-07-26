/**
 * Rider deliveries management page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, LoadingSpinner, Select, Input } from '@/components/ui';
import { withRole } from '@/contexts/AuthContext';
import { 
  TruckIcon, 
  MapPinIcon, 
  ClockIcon, 
  PhoneIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface Delivery {
  id: string;
  status: 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  package: {
    description: string;
    type: string;
    weight: number;
    specialInstructions?: string;
  };
  pickup: {
    address: string;
    contactName: string;
    contactPhone: string;
    scheduledTime: string;
    completedAt?: string;
    instructions?: string;
  };
  delivery: {
    address: string;
    contactName: string;
    contactPhone: string;
    scheduledTime: string;
    completedAt?: string;
    instructions?: string;
  };
  pricing: {
    total: number;
    urgency: string;
  };
  business: {
    name: string;
    email: string;
    phone: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

function RiderDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDeliveries();
  }, [currentPage, statusFilter]);

  const fetchDeliveries = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/offers?rider=true&${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.data.offers);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDeliveries();
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    setActionLoading(deliveryId);
    try {
      const response = await fetch(`/api/offers/${deliveryId}/${newStatus}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        // Update the delivery in the list
        setDeliveries(deliveries.map(delivery => 
          delivery.id === deliveryId 
            ? { ...delivery, status: newStatus as any }
            : delivery
        ));
      }
    } catch (error) {
      console.error(`Failed to update delivery status to ${newStatus}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'error'; icon: React.ReactNode }> = {
      accepted: { 
        variant: 'warning', 
        icon: <ClockIcon className="h-4 w-4" /> 
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

  const getNextAction = (status: string) => {
    switch (status) {
      case 'accepted':
        return { action: 'pickup', label: 'Confirm Pickup', variant: 'default' as const };
      case 'picked_up':
        return { action: 'in-transit', label: 'Start Transit', variant: 'default' as const };
      case 'in_transit':
        return { action: 'delivered', label: 'Confirm Delivery', variant: 'success' as const };
      default:
        return null;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isActiveDelivery = (status: string) => {
    return ['accepted', 'picked_up', 'in_transit'].includes(status);
  };

  if (loading) {
    return (
      <DashboardLayout title="My Deliveries">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading deliveries..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="My Deliveries"
      description="Manage your delivery assignments and track progress"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/dashboard/rider/offers'}>
            Browse New Offers
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex gap-2">
            <Input
              placeholder="Search deliveries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
            <Button variant="outline" onClick={handleSearch}>
              Search
            </Button>
          </div>
          
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <option value="all">All Status</option>
            <option value="accepted">Accepted</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {/* Deliveries List */}
      {deliveries.length > 0 ? (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className={`${isActiveDelivery(delivery.status) ? 'border-blue-200 bg-blue-50/30' : ''}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Main Content */}
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {delivery.package.description || 'Package Delivery'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Order #{delivery.id.slice(-8)} • {delivery.business.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-600">
                          ${delivery.pricing.total.toFixed(2)}
                        </span>
                        {getStatusBadge(delivery.status)}
                      </div>
                    </div>

                    {/* Route Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Pickup */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center text-green-600 mb-2">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span className="font-medium text-sm">PICKUP</span>
                          {delivery.pickup.completedAt && (
                            <CheckCircleIcon className="h-4 w-4 ml-2 text-green-500" />
                          )}
                        </div>
                        <p className="text-gray-900 text-sm mb-2">{delivery.pickup.address}</p>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            {delivery.pickup.contactName}
                          </div>
                          <div className="flex items-center">
                            <PhoneIcon className="h-3 w-3 mr-1" />
                            {delivery.pickup.contactPhone}
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {formatDateTime(delivery.pickup.scheduledTime)}
                          </div>
                          {delivery.pickup.completedAt && (
                            <div className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Completed: {formatDateTime(delivery.pickup.completedAt)}
                            </div>
                          )}
                        </div>
                        {delivery.pickup.instructions && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            "{delivery.pickup.instructions}"
                          </p>
                        )}
                      </div>

                      {/* Delivery */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center text-orange-600 mb-2">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          <span className="font-medium text-sm">DELIVERY</span>
                          {delivery.delivery.completedAt && (
                            <CheckCircleIcon className="h-4 w-4 ml-2 text-green-500" />
                          )}
                        </div>
                        <p className="text-gray-900 text-sm mb-2">{delivery.delivery.address}</p>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            {delivery.delivery.contactName}
                          </div>
                          <div className="flex items-center">
                            <PhoneIcon className="h-3 w-3 mr-1" />
                            {delivery.delivery.contactPhone}
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {formatDateTime(delivery.delivery.scheduledTime)}
                          </div>
                          {delivery.delivery.completedAt && (
                            <div className="flex items-center text-green-600">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Completed: {formatDateTime(delivery.delivery.completedAt)}
                            </div>
                          )}
                        </div>
                        {delivery.delivery.instructions && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            "{delivery.delivery.instructions}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Package Details */}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Type: {delivery.package.type}</span>
                      <span>Weight: {delivery.package.weight}kg</span>
                      <span>Urgency: {delivery.pricing.urgency}</span>
                    </div>

                    {delivery.package.specialInstructions && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <strong>Special Instructions:</strong> {delivery.package.specialInstructions}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Sidebar */}
                  <div className="lg:w-48 flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      View Details
                    </Button>

                    {/* Status-specific actions */}
                    {(() => {
                      const nextAction = getNextAction(delivery.status);
                      if (nextAction) {
                        return (
                          <Button 
                            size="sm"
                            variant={nextAction.variant}
                            onClick={() => updateDeliveryStatus(delivery.id, nextAction.action)}
                            disabled={actionLoading === delivery.id}
                            className="w-full"
                          >
                            {actionLoading === delivery.id ? (
                              <LoadingSpinner size="sm" color="white" />
                            ) : (
                              nextAction.label
                            )}
                          </Button>
                        );
                      }
                      return null;
                    })()}

                    {/* Contact buttons for active deliveries */}
                    {isActiveDelivery(delivery.status) && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => window.open(`tel:${delivery.business.phone}`)}
                        >
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          Call Business
                        </Button>
                        
                        {delivery.status !== 'accepted' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(`tel:${delivery.delivery.contactPhone}`)}
                          >
                            <PhoneIcon className="h-4 w-4 mr-2" />
                            Call Customer
                          </Button>
                        )}
                      </>
                    )}
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
              {searchTerm || statusFilter !== 'all'
                ? 'No deliveries match your filters' 
                : 'No deliveries yet'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button className="mt-4" onClick={() => window.location.href = '/dashboard/rider/offers'}>
                Browse Available Offers
              </Button>
            )}
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

export default withRole(RiderDeliveriesPage, ['rider', 'admin']);