import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, LoadingSpinner, Badge } from '../../components/UI';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Plus,
  Eye,
  MapPin,
  Calendar,

} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    // Simulate loading and set mock data
    const timer = setTimeout(() => {
      setDashboardData({
        overview: {
          totalOffers: 12,
          activeOffers: 3,
          totalSpent: 98200.00,
          avgDeliveryTime: 28,
          newOffersThisMonth: 5,
          completionRate: 85,
          thisMonthSpent: 35700.00,
          onTimeRate: 92
        },
        recentOffers: [
          {
            id: '1',
            title: 'Document Delivery to Downtown',
            status: 'in_transit',
            pickup: { address: '123 Main St, City Center' },
            createdAt: new Date().toISOString(),
            payment: { amount: 10000.00 },
            rider: { name: 'John Doe' }
          },
          {
            id: '2',
            title: 'Package Pickup from Warehouse',
            status: 'open',
            pickup: { address: '456 Industrial Ave, Warehouse District' },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            payment: { amount: 14000.00 }
          }
        ],
        monthlyTrends: [
          { month: 'January', offers: 8, totalSpent: 72000.00, completionRate: 88 },
          { month: 'February', offers: 12, totalSpent: 98200.00, completionRate: 85 }
        ]
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { overview, recentOffers, monthlyTrends } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">Manage your delivery operations</p>
        </div>
        <Link to="/offers/create">
          <Button size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create Offer
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Offers"
          value={overview?.totalOffers || 0}
          icon={<Package className="h-6 w-6" />}
          color="blue"
          change={`+${overview?.newOffersThisMonth || 0} this month`}
        />
        <StatsCard
          title="Active Offers"
          value={overview?.activeOffers || 0}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
          change={`${overview?.completionRate || 0}% completion rate`}
        />
        <StatsCard
          title="Total Spent"
          value={`₦${(overview?.totalSpent || 0).toLocaleString('en-NG')}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          change={`₦${(overview?.thisMonthSpent || 0).toLocaleString('en-NG')} this month`}
        />
        <StatsCard
          title="Avg Delivery Time"
          value={`${overview?.avgDeliveryTime || 0} min`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
          change={`${overview?.onTimeRate || 0}% on-time rate`}
        />
      </div>

      {/* Recent Offers and Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Offers */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Recent Offers</h3>
            <Link to="/offers">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentOffers?.length > 0 ? (
              recentOffers.slice(0, 5).map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No recent offers</p>
                <Link to="/offers/create">
                  <Button className="mt-2">Create Your First Offer</Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Monthly Performance</h3>
            <div className="text-sm text-gray-500">Last 2 months</div>
          </div>
          
          <div className="space-y-4">
            {monthlyTrends?.length > 0 ? (
              monthlyTrends.map((trend, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{trend.month}</p>
                    <p className="text-sm text-gray-600">{trend.offers} offers</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₦{trend.totalSpent?.toLocaleString('en-NG')}</p>
                    <p className="text-sm text-gray-600">{trend.completionRate}% completed</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No trend data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/offers/create">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Plus className="h-8 w-8 text-blue-600 mb-2" />
              <h4 className="font-medium">Create New Offer</h4>
              <p className="text-sm text-gray-600">Post a new delivery request</p>
            </div>
          </Link>
          
          <Link to="/offers">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Eye className="h-8 w-8 text-green-600 mb-2" />
              <h4 className="font-medium">View All Offers</h4>
              <p className="text-sm text-gray-600">Manage your delivery offers</p>
            </div>
          </Link>
          
          <Link to="/earnings">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <DollarSign className="h-8 w-8 text-purple-600 mb-2" />
              <h4 className="font-medium">View Earnings</h4>
              <p className="text-sm text-gray-600">Track your spending and ROI</p>
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
const OfferCard = ({ offer }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'blue';
      case 'accepted': return 'yellow';
      case 'picked_up': return 'orange';
      case 'in_transit': return 'purple';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-900">{offer.title}</h4>
          <Badge variant={getStatusColor(offer.status)}>
            {offer.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center text-sm text-gray-600 space-x-4">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{offer.pickup?.address?.split(',')[0]}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{new Date(offer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-1" />
            <span>₦{offer.payment?.amount?.toLocaleString('en-NG')}</span>
          </div>
        </div>
        
        {offer.rider && (
          <div className="mt-2 text-sm text-gray-600">
            <span>Rider: {offer.rider.name}</span>
          </div>
        )}
      </div>
      
      <Link to={`/offers/${offer.id}`}>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
};

export default Dashboard;