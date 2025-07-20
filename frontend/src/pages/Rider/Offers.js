import React, { useState, useEffect } from 'react';
import { riderAPI } from '../../services/api';
import { Button, Card, Badge, LoadingSpinner, Input, Select } from '../../components/UI';
import { MapPin, DollarSign, Package, Clock, Navigation, Filter } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingOffer, setAcceptingOffer] = useState(null);
  const [location, setLocation] = useState(null);
  const [filters, setFilters] = useState({
    maxDistance: 10000, // 10km default
    minPayment: '',
    maxPayment: '',
    sortBy: 'distance',
    sortOrder: 'asc'
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (location) {
      fetchNearbyOffers();
    }
  }, [location, filters]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Using default location.');
          // Use default NYC location
          setLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
      setLocation({ lat: 40.7128, lng: -74.0060 });
    }
  };

  const fetchNearbyOffers = async () => {
    try {
      setLoading(true);
      const response = await riderAPI.getNearbyOffers({
        lat: location.lat,
        lng: location.lng,
        ...filters
      });
      
      setOffers(response.data.offers);
    } catch (error) {
      toast.error('Failed to fetch nearby offers');
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to accept this offer?')) {
      return;
    }

    setAcceptingOffer(offerId);
    try {
      await riderAPI.acceptOffer(offerId);
      toast.success('Offer accepted successfully!');
      // Remove the accepted offer from the list
      setOffers(prev => prev.filter(offer => offer.id !== offerId));
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to accept offer';
      toast.error(message);
      console.error('Error accepting offer:', error);
    } finally {
      setAcceptingOffer(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatDuration = (duration) => {
    if (duration < 60) {
      return `${Math.round(duration)}min`;
    }
    return `${Math.floor(duration / 60)}h ${Math.round(duration % 60)}min`;
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
          <h1 className="text-2xl font-bold text-gray-900">Available Offers</h1>
          <p className="text-gray-600">Find delivery opportunities near you</p>
        </div>
        <Button onClick={fetchNearbyOffers} disabled={loading}>
          <Navigation className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Location Status */}
      {location && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center text-blue-800">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="text-sm">
              Showing offers near your location ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
            </span>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Max Distance"
            value={filters.maxDistance}
            onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value))}
            options={[
              { value: 1000, label: '1km' },
              { value: 5000, label: '5km' },
              { value: 10000, label: '10km' },
              { value: 20000, label: '20km' },
              { value: 50000, label: '50km' }
            ]}
          />

          <Input
            label="Min Payment ($)"
            type="number"
            step="0.01"
            value={filters.minPayment}
            onChange={(e) => handleFilterChange('minPayment', e.target.value)}
            placeholder="0.00"
          />

          <Input
            label="Max Payment ($)"
            type="number"
            step="0.01"
            value={filters.maxPayment}
            onChange={(e) => handleFilterChange('maxPayment', e.target.value)}
            placeholder="1000.00"
          />

          <Select
            label="Sort By"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            options={[
              { value: 'distance', label: 'Distance' },
              { value: 'payment', label: 'Payment' },
              { value: 'created', label: 'Created Time' }
            ]}
          />
        </div>
      </Card>

      {/* Offers List */}
      <div className="space-y-4">
        {offers.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No offers available</h3>
            <p className="text-gray-600 mb-4">
              There are no delivery offers in your area right now. Try adjusting your filters or check back later.
            </p>
            <Button onClick={fetchNearbyOffers}>
              <Navigation className="h-4 w-4 mr-2" />
              Refresh Offers
            </Button>
          </Card>
        ) : (
          offers.map((offer) => (
            <Card key={offer.id} className="hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{offer.title}</h3>
                    <Badge className="bg-green-100 text-green-800">
                      ${offer.payment.amount}
                    </Badge>
                  </div>

                  {offer.description && (
                    <p className="text-gray-600 mb-3">{offer.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Route Information */}
                    <div className="space-y-2">
                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-green-600" />
                        <div>
                          <div className="font-medium text-gray-900">Pickup</div>
                          <div className="text-gray-600">{offer.pickup.address}</div>
                          <div className="text-gray-500">Contact: {offer.pickup.contactName}</div>
                        </div>
                      </div>

                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 mt-0.5 text-red-600" />
                        <div>
                          <div className="font-medium text-gray-900">Delivery</div>
                          <div className="text-gray-600">{offer.delivery.address}</div>
                          <div className="text-gray-500">Contact: {offer.delivery.contactName}</div>
                        </div>
                      </div>
                    </div>

                    {/* Offer Details */}
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <div>
                          <div className="font-medium text-lg text-gray-900">
                            ${offer.payment.amount} {offer.payment.currency}
                          </div>
                          <div>Payment: {offer.payment.paymentMethod}</div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Navigation className="h-4 w-4 mr-2" />
                        <div>
                          <div>Distance: {formatDistance(offer.distanceFromRider)}</div>
                          {offer.estimatedDuration && (
                            <div>Est. time: {formatDuration(offer.estimatedDuration)}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <div>
                          <div>Posted: {format(new Date(offer.createdAt), 'MMM dd, HH:mm')}</div>
                          <div>Business: {offer.business.businessName}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Package Details */}
                  {offer.packageDetails && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center mb-2">
                        <Package className="h-4 w-4 mr-2" />
                        <span className="font-medium text-gray-900">Package Details</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>Weight: {offer.packageDetails.weight}kg</div>
                        {offer.packageDetails.dimensions && (
                          <div>
                            Size: {offer.packageDetails.dimensions.length}×
                            {offer.packageDetails.dimensions.width}×
                            {offer.packageDetails.dimensions.height}cm
                          </div>
                        )}
                        <div>
                          Fragile: {offer.packageDetails.fragile ? 
                            <span className="text-red-600 font-medium">Yes</span> : 
                            'No'
                          }
                        </div>
                        <div>Route: {formatDistance(offer.estimatedDistance)}</div>
                      </div>
                      {offer.packageDetails.specialInstructions && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Instructions:</span> {offer.packageDetails.specialInstructions}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="ml-4 flex flex-col gap-2">
                  <Button
                    onClick={() => handleAcceptOffer(offer.id)}
                    loading={acceptingOffer === offer.id}
                    disabled={acceptingOffer !== null}
                    className="whitespace-nowrap"
                  >
                    Accept Offer
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Refresh Button */}
      {offers.length > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={fetchNearbyOffers}
            disabled={loading}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Refresh Offers
          </Button>
        </div>
      )}
    </div>
  );
};

export default Offers;