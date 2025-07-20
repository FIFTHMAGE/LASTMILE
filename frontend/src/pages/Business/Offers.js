import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { businessAPI } from '../../services/api';
import { Button, Card, Badge, LoadingSpinner, Input, Select } from '../../components/UI';
import { Plus, Search, Filter, MapPin, Clock, DollarSign, Package } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOffers: 0,
    hasNext: false,
    hasPrev: false
  });

  useEffect(() => {
    fetchOffers();
  }, [filters]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const response = await businessAPI.getOffers({
        ...filters,
        page: pagination.currentPage,
        limit: 10
      });
      
      setOffers(response.data.offers);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch offers');
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleCancelOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to cancel this offer?')) {
      return;
    }

    try {
      await businessAPI.cancelOffer(offerId, 'Cancelled by business');
      toast.success('Offer cancelled successfully');
      fetchOffers();
    } catch (error) {
      toast.error('Failed to cancel offer');
      console.error('Error cancelling offer:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-green-100 text-green-800',
      accepted: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading && offers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Offers</h1>
          <p className="text-gray-600">Manage your delivery offers</p>
        </div>
        <Link to="/offers/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Offer
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search offers..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          
          <Select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'picked_up', label: 'Picked Up' },
              { value: 'in_transit', label: 'In Transit' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />

          <Input
            type="date"
            placeholder="From date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />

          <Input
            type="date"
            placeholder="To date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>
      </Card>

      {/* Offers List */}
      <div className="space-y-4">
        {offers.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers found</h3>
            <p className="text-gray-600 mb-4">
              {filters.search || filters.status ? 
                'Try adjusting your filters to see more offers.' :
                'Create your first delivery offer to get started.'
              }
            </p>
            {!filters.search && !filters.status && (
              <Link to="/offers/create">
                <Button>Create Your First Offer</Button>
              </Link>
            )}
          </Card>
        ) : (
          offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{offer.title}</h3>
                    <Badge className={getStatusColor(offer.status)}>
                      {formatStatus(offer.status)}
                    </Badge>
                  </div>
                  
                  {offer.description && (
                    <p className="text-gray-600 mb-3">{offer.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium">From: {offer.pickup.address}</div>
                        <div>To: {offer.delivery.address}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <div>
                        <div className="font-medium text-lg text-gray-900">
                          ${offer.payment.amount}
                        </div>
                        <div>{offer.payment.currency}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <div>
                        <div>Created: {format(new Date(offer.createdAt), 'MMM dd, yyyy')}</div>
                        {offer.acceptedAt && (
                          <div>Accepted: {format(new Date(offer.acceptedAt), 'MMM dd, yyyy')}</div>
                        )}
                      </div>
                    </div>

                    {offer.rider && (
                      <div className="flex items-center text-gray-600">
                        <div>
                          <div className="font-medium">Rider: {offer.rider.name}</div>
                          <div>Phone: {offer.rider.phone}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {offer.status === 'open' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelOffer(offer.id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>

              {/* Package Details */}
              {offer.packageDetails && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Package Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div>Weight: {offer.packageDetails.weight}kg</div>
                    {offer.packageDetails.dimensions && (
                      <div>
                        Size: {offer.packageDetails.dimensions.length}×
                        {offer.packageDetails.dimensions.width}×
                        {offer.packageDetails.dimensions.height}cm
                      </div>
                    )}
                    <div>Fragile: {offer.packageDetails.fragile ? 'Yes' : 'No'}</div>
                    {offer.estimatedDistance && (
                      <div>Distance: {(offer.estimatedDistance / 1000).toFixed(1)}km</div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <Button
            variant="outline"
            disabled={!pagination.hasPrev}
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            disabled={!pagination.hasNext}
            onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Offers;