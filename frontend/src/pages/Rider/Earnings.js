import React, { useState, useEffect } from 'react';
import { riderAPI } from '../../services/api';
import { Card, LoadingSpinner, Select, Button } from '../../components/UI';
import { DollarSign, TrendingUp, Package, Clock, Calendar, Download } from 'lucide-react';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import toast from 'react-hot-toast';

const Earnings = () => {
  const [earnings, setEarnings] = useState(null);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    fetchEarningsData();
  }, [timeRange]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selection
      const dateRange = getDateRange(timeRange);
      
      // Fetch earnings and stats
      const [earningsResponse, statsResponse] = await Promise.all([
        riderAPI.getEarnings(dateRange),
        riderAPI.getStats(dateRange)
      ]);
      
      setEarnings(earningsResponse.data);
      setStats(statsResponse.data);
      
      // Generate chart data
      generateChartData(earningsResponse.data.history, timeRange);
      
    } catch (error) {
      toast.error('Failed to fetch earnings data');
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (range) => {
    const now = new Date();
    let dateFrom, dateTo;

    switch (range) {
      case 'week':
        dateFrom = startOfWeek(now);
        dateTo = endOfWeek(now);
        break;
      case 'month':
        dateFrom = startOfMonth(now);
        dateTo = endOfMonth(now);
        break;
      case 'last7days':
        dateFrom = subDays(now, 7);
        dateTo = now;
        break;
      case 'last30days':
        dateFrom = subDays(now, 30);
        dateTo = now;
        break;
      case 'last3months':
        dateFrom = subMonths(now, 3);
        dateTo = now;
        break;
      default:
        dateFrom = startOfWeek(now);
        dateTo = endOfWeek(now);
    }

    return {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString()
    };
  };

  const generateChartData = (history, range) => {
    if (!history || history.length === 0) {
      setChartData([]);
      return;
    }

    // Group data by day/week/month based on range
    const groupedData = {};
    
    history.forEach(item => {
      let key;
      const date = new Date(item.date);
      
      if (range === 'week' || range === 'last7days') {
        key = format(date, 'MMM dd');
      } else if (range === 'month' || range === 'last30days') {
        key = format(date, 'MMM dd');
      } else {
        key = format(date, 'MMM yyyy');
      }
      
      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          earnings: 0,
          deliveries: 0
        };
      }
      
      groupedData[key].earnings += item.earnings;
      groupedData[key].deliveries += item.deliveries;
    });

    setChartData(Object.values(groupedData));
  };

  const downloadReport = async () => {
    try {
      toast.success('Downloading earnings report...');
      // In a real app, this would trigger a PDF/CSV download
      console.log('Download report for:', timeRange, earnings);
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600">Track your delivery earnings and performance</p>
        </div>
        <div className="flex gap-3">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'last7days', label: 'Last 7 Days' },
              { value: 'last30days', label: 'Last 30 Days' },
              { value: 'last3months', label: 'Last 3 Months' }
            ]}
          />
          <Button variant="outline" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${earnings.totalEarnings?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalDeliveries || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg per Delivery</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${earnings.avgEarningsPerDelivery?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hours Worked</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.hoursWorked?.toFixed(1) || '0.0'}h
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Earnings']}
                />
                <Line 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No earnings data available for this period
            </div>
          )}
        </Card>

        {/* Deliveries Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deliveries Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Deliveries']}
                />
                <Bar dataKey="deliveries" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No delivery data available for this period
            </div>
          )}
        </Card>
      </div>

      {/* Recent Earnings */}
      {earnings?.recentEarnings && earnings.recentEarnings.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Earnings</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {earnings.recentEarnings.map((earning, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(earning.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {earning.offerTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {earning.businessName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${earning.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        earning.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {earning.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Performance Metrics */}
      {stats && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.completionRate?.toFixed(1) || '0.0'}%
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.avgRating?.toFixed(1) || '0.0'}
              </div>
              <div className="text-sm text-gray-600">Average Rating</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats.avgDeliveryTime?.toFixed(0) || '0'}min
              </div>
              <div className="text-sm text-gray-600">Avg Delivery Time</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Earnings;