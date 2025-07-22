import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { Card, LoadingSpinner, Badge, Button } from '../../components/UI';
import { Users, Package, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {
    fetchStats();
    // Set up polling for real-time updates
    const interval = setInterval(fetchStats, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch admin statistics');
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use real chart data from the API
  const chartData = stats?.charts?.daily || [];

  const pieData = stats ? [
    { name: 'Completed', value: stats.offers?.completed || 0, color: '#10B981' },
    { name: 'In Progress', value: stats.offers?.inProgress || 0, color: '#3B82F6' },
    { name: 'Open', value: stats.offers?.open || 0, color: '#F59E0B' },
    { name: 'Cancelled', value: stats.offers?.cancelled || 0, color: '#EF4444' }
  ] : [];

  if (loading && !stats) {
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
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and management</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchStats}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.users?.total || 0}</p>
                <p className="text-xs text-green-600">
                  +{stats.users?.newThisMonth || 0} this month
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Offers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.offers?.total || 0}</p>
                <p className="text-xs text-green-600">
                  {stats.offers?.completionRate || 0}% completion rate
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.payments?.totalVolume || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600">
                  ${(stats.payments?.thisMonth || 0).toLocaleString()} this month
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.payments?.avgOrderValue || 0).toFixed(2)}
                </p>
                <p className="text-xs text-gray-600">
                  Platform revenue: ${(stats.payments?.platformRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Offers Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Offers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="offers" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Offer Status Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Offer Status Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center text-sm">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* User Breakdown */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Breakdown</h3>
          {stats && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Businesses</span>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900 mr-2">
                    {stats.users?.businesses || 0}
                  </span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {((stats.users?.businesses || 0) / (stats.users?.total || 1) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Riders</span>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900 mr-2">
                    {stats.users?.riders || 0}
                  </span>
                  <Badge className="bg-green-100 text-green-800">
                    {((stats.users?.riders || 0) / (stats.users?.total || 1) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Users</span>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900 mr-2">
                    {stats.users?.active || 0}
                  </span>
                  <Badge className="bg-purple-100 text-purple-800">
                    {((stats.users?.active || 0) / (stats.users?.total || 1) * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Performance Metrics */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
          {stats && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Delivery Time</span>
                <span className="text-lg font-semibold text-gray-900">
                  {stats.performance?.avgDeliveryTime || 0}min
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Rider Rating</span>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {stats.performance?.avgRiderRating || 0}
                  </span>
                  <span className="text-yellow-500 ml-1">★</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Business Rating</span>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {stats.performance?.avgBusinessRating || 0}
                  </span>
                  <span className="text-yellow-500 ml-1">★</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {/* Mock recent activity - in a real app, this would come from the API */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New delivery completed</p>
              <p className="text-xs text-gray-600">Package delivered from Downtown to Brooklyn - $25.50</p>
            </div>
            <span className="text-xs text-gray-500">2 min ago</span>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Users className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New rider registered</p>
              <p className="text-xs text-gray-600">John Smith joined as a bike rider</p>
            </div>
            <span className="text-xs text-gray-500">5 min ago</span>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Package className="h-5 w-5 text-purple-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">New offer created</p>
              <p className="text-xs text-gray-600">Express delivery needed in Manhattan - $35.00</p>
            </div>
            <span className="text-xs text-gray-500">8 min ago</span>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Payment issue reported</p>
              <p className="text-xs text-gray-600">Business reported payment processing delay</p>
            </div>
            <span className="text-xs text-gray-500">15 min ago</span>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="outline" className="justify-start">
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </Button>
          <Button variant="outline" className="justify-start">
            <Package className="h-4 w-4 mr-2" />
            View All Offers
          </Button>
          <Button variant="outline" className="justify-start">
            <DollarSign className="h-4 w-4 mr-2" />
            Payment Reports
          </Button>
          <Button variant="outline" className="justify-start">
            <AlertCircle className="h-4 w-4 mr-2" />
            Support Tickets
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;