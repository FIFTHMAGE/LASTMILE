import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, LoadingSpinner, Badge } from '../../components/UI';
import { 
  MapPin, 
  DollarSign, 
  Package, 
  Star,
  Navigation,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [nearbyOffers, setNearbyOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);

  // Get user's location
  useEffect(() => {
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
          toast.error('Unable to get your location. Please enable location services.');
          // Set default location for demo
          setLocation({
            lat: 6.5244,
            lng: 3.3792
          });
        }
      );
    } else {
      // Set default location for demo (Lagos, Nigeria)
      setLocation({
        lat: 6.5244,
        lng: 3.3792
      });
    }
  }, []);

  // Load dashboard data
  useEffect(() => {
    const timer = setTimeout(() => {
      setDashboardData({
        overview: {
          totalDeliveries: 47,
          activeDeliveries: 2,
          totalEarnings: 156800.00,
          avgRating: 4.8,
          completionRate: 96,
          thisMonthEarnings: 45200.00
        },
        recentDeliveries: [
          {
            id: '1',
            title: 'Package Delivery to Victoria Island',
            status: 'delivered',
            pickup: 'Ikeja Mall, Lagos',
            amount: 8500.00,
            acceptedAt: new Date().toISOString()
          },
          {
            id: '2',
            title: 'Document Delivery',
            status: 'in_transit',
            pickup: 'Lekki Phase 1, Lagos',
            amount: 6000.00,
            acceptedAt: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Load nearby offers when location is available
  useEffect(() => {
    if (location) {
      setOffersLoading(true);
      const timer = setTimeout(() => {
        setNearbyOffers([
          {
            id: '1',
            title: 'Urgent Document Delivery',
            description: 'Legal documents need to be delivered to law firm',
            payment: { amount: 12000.00 },
            distanceFromRider: 850,
            pickup: { address: 'Victoria Island, Lagos, Nigeria' },
            delivery: { address: 'Ikoyi, Lagos, Nigeria' },
            business: { businessName: 'Legal Associates Ltd' }
          },
          {
            id: '2',
            title: 'Package Pickup and Delivery',
            description: 'Electronics package from store to customer',
            payment: { amount: 15000.00 },
            distanceFromRider: 1200,
            pickup: { address: 'Computer Village, Ikeja, Lagos' },
            delivery: { address: 'Surulere, Lagos, Nigeria' },
            business: { businessName: 'Tech Store Nigeria' }
          }
        ]);
        setOffersLoading(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleAvailabilityToggle = () => {
    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);
    toast.success(`You are now ${newAvailability ? 'available' : 'unavailable'} for deliveries`);
  };

  const handleLocationUpdate = () => {
    if (location) {
      toast.success('Location updated successfully');
    } else {
      toast.error('Location not available');
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      // Remove the accepted offer from the list
      setNearbyOffers(prev => prev.filter(offer => offer.id !== offerId));
      toast.success('Offer accepted successfully!');
      
      // Update dashboard stats
      setDashboardData(prev => ({
        ...prev,
        overview: {
          ...prev.overview,
          activeDeliveries: prev.overview.activeDeliveries + 1
        }
      }));
    } catch (error) {
      toast.error('Failed to accept offer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { overview, recentDeliveries } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">Find deliveries and track your earnings</p>
        </div>
        
        {/* Availability Toggle */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Available for deliveries:</span>
            <button
              onClick={handleAvailabilityToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAvailable ? 'bg-green-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAvailable ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <Button
            onClick={handleLocationUpdate}
            variant="outline"
            size="sm"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Update Location
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {!isAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">
              You're currently unavailable for deliveries. Toggle availability to start receiving offers.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Deliveries"
          value={overview?.totalDeliveries || 0}
          icon={<Package className="h-6 w-6" />}
          color="blue"
          change={`${overview?.completionRate || 0}% completion rate`}
        />
        <StatsCard
          title="Active Deliveries"
          value={overview?.activeDeliveries || 0}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
          change="In progress"
        />
        <StatsCard
          title="Total Earnings"
          value={`₦${(overview?.totalEarnings || 0).toLocaleString('en-NG')}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          change={`₦${(overview?.thisMonthEarnings || 0).toLocaleString('en-NG')} this month`}
        />
        <StatsCard
          title="Rating"
          value={`${(overview?.avgRating || 0).toFixed(1)}`}
          icon={<Star className="h-6 w-6" />}
          color="purple"
          change="Average rating"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nearby Offers */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Nearby Offers</h3>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  setOffersLoading(true);
                  setTimeout(() => setOffersLoading(false), 1000);
                  toast.success('Offers refreshed');
                }}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Link to="/offers">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="space-y-4">
            {offersLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : nearbyOffers.length > 0 ? (
              nearbyOffers.map((offer) => (
                <OfferCard 
                  key={offer.id} 
                  offer={offer} 
                  onAccept={handleAcceptOffer}
                  disabled={!isAvailable}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No nearby offers available</p>
                <p className="text-sm">Check back later or expand your search radius</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Deliveries */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Deliveries</h3>
            <Link to="/deliveries">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentDeliveries?.length > 0 ? (
              recentDeliveries.slice(0, 5).map((delivery) => (
                <DeliveryCard key={delivery.id} delivery={delivery} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No recent deliveries</p>
                <p className="text-sm">Accept your first offer to get started</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/offers">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <MapPin className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-medium">Find Offers</h4>
              <p className="text-sm text-gray-600">Browse available delivery offers</p>
            </div>
          </Link>
          
          <Link to="/deliveries">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Package className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="font-medium">My Deliveries</h4>
              <p className="text-sm text-gray-600">Track your active deliveries</p>
            </div>
          </Link>
          
          <Link to="/earnings">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <DollarSign className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="font-medium">View Earnings</h4>
              <p className="text-sm text-gray-600">Track your income and statistics</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, color, change }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className="text-sm text-gray-500 mt-1">{change}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

// Offer Card Component
const OfferCard = ({ offer, onAccept, disabled }) => {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(offer.id);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{offer.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{offer.description}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-600">₦{offer.payment?.amount?.toLocaleString('en-NG')}</p>
          <p className="text-xs text-gray-500">{Math.round(offer.distanceFromRider)}m away</p>
        </div>
      </div>
      
      <div className="flex items-center text-sm text-gray-600 space-x-4 mb-3">
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{offer.pickup?.address?.split(',')[0]}</span>
        </div>
        <div className="flex items-center">
          <Navigation className="h-4 w-4 mr-1" />
          <span>{offer.delivery?.address?.split(',')[0]}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <span>Business: {offer.business?.businessName || offer.business?.name}</span>
        </div>
        <Button
          onClick={handleAccept}
          size="sm"
          loading={accepting}
          disabled={disabled || accepting}
        >
          Accept Offer
        </Button>
      </div>
    </div>
  );
};

// Delivery Card Component
const DeliveryCard = ({ delivery }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'yellow';
      case 'picked_up': return 'orange';
      case 'in_transit': return 'purple';
      case 'delivered': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">{delivery.title || 'Delivery'}</h4>
          <Badge variant={getStatusColor(delivery.status)}>
            {delivery.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 space-x-4">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{delivery.pickup?.split(',')[0]}</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            <span>₦{delivery.amount?.toLocaleString('en-NG')}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{format(new Date(delivery.acceptedAt), 'MMM dd')}</span>
          </div>
        </div>
      </div>
      
      <Link to={`/deliveries/${delivery.id}`}>
        <Button variant="outline" size="sm">
          View
        </Button>
      </Link>
    </div>
  );
};

export default Dashboard;