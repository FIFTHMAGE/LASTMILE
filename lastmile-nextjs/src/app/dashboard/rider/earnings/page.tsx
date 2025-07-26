/**
 * Rider earnings tracking page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, LoadingSpinner, Select } from '@/components/ui';
import { withRole } from '@/contexts/AuthContext';
import { 
  CurrencyDollarIcon, 
  TruckIcon, 
  ClockIcon, 
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  StarIcon,
  TrendingUpIcon
} from '@heroicons/react/24/outline';

interface EarningsStats {
  totalEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  todayEarnings: number;
  totalDeliveries: number;
  averagePerDelivery: number;
  hoursWorked: number;
  averagePerHour: number;
}

interface EarningsRecord {
  id: string;
  offerId: string;
  amount: number;
  date: string;
  deliveryType: string;
  urgencyBonus: number;
  distanceBonus: number;
  tips: number;
  offer: {
    package: {
      description: string;
    };
    business: {
      name: string;
    };
    pickup: {
      address: string;
    };
    delivery: {
      address: string;
    };
  };
}

interface WeeklyEarnings {
  week: string;
  earnings: number;
  deliveries: number;
  hours: number;
}

function RiderEarningsPage() {
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [earnings, setEarnings] = useState<EarningsRecord[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyEarnings[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('this_month');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEarningsData();
  }, [timeFilter, currentPage]);

  const fetchEarningsData = async () => {
    try {
      const params = new URLSearchParams({
        period: timeFilter,
        page: currentPage.toString(),
        limit: '10',
      });

      const response = await fetch(`/api/user/earnings?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
        setEarnings(data.data.earnings);
        setWeeklyData(data.data.weeklyData || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportEarnings = async () => {
    try {
      const params = new URLSearchParams({
        period: timeFilter,
        format: 'csv'
      });

      const response = await fetch(`/api/user/earnings/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `earnings-${timeFilter}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export earnings:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEarningsBreakdown = (record: EarningsRecord) => {
    const baseAmount = record.amount - record.urgencyBonus - record.distanceBonus - record.tips;
    return {
      base: baseAmount,
      urgencyBonus: record.urgencyBonus,
      distanceBonus: record.distanceBonus,
      tips: record.tips,
    };
  };

  if (loading) {
    return (
      <DashboardLayout title="Earnings">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading earnings..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Earnings"
      description="Track your delivery earnings and performance"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-2">
          <Select
            value={timeFilter}
            onValueChange={setTimeFilter}
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
          </Select>
        </div>

        <Button 
          variant="outline"
          onClick={handleExportEarnings}
          className="flex items-center"
        >
          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalEarnings)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TruckIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Deliveries</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalDeliveries}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg per Delivery</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.averagePerDelivery)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg per Hour</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.averagePerHour)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Period Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-blue-600 mr-2" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(stats.todayEarnings)}
              </div>
              <p className="text-sm text-gray-600">
                From today's deliveries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(stats.thisWeekEarnings)}
              </div>
              <p className="text-sm text-gray-600">
                Weekly performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <StarIcon className="h-5 w-5 text-yellow-600 mr-2" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(stats.thisMonthEarnings)}
              </div>
              <p className="text-sm text-gray-600">
                Monthly total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Chart (Simple representation) */}
      {weeklyData.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyData.map((week, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{week.week}</p>
                    <p className="text-sm text-gray-600">
                      {week.deliveries} deliveries • {week.hours}h worked
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(week.earnings)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatCurrency(week.earnings / week.hours)}/hr
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length > 0 ? (
            <div className="space-y-4">
              {earnings.map((record) => {
                const breakdown = getEarningsBreakdown(record);
                return (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {record.offer.package.description || 'Package Delivery'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {record.offer.business.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDateTime(record.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(record.amount)}
                        </p>
                        <Badge variant="default" size="sm">
                          {record.deliveryType}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <div className="flex items-center mb-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        From: {record.offer.pickup.address}
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                        To: {record.offer.delivery.address}
                      </div>
                    </div>

                    {/* Earnings Breakdown */}
                    <div className="bg-gray-50 rounded-md p-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Earnings Breakdown</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Base:</span>
                          <span className="ml-1 font-medium">{formatCurrency(breakdown.base)}</span>
                        </div>
                        {breakdown.urgencyBonus > 0 && (
                          <div>
                            <span className="text-gray-600">Urgency:</span>
                            <span className="ml-1 font-medium text-orange-600">
                              +{formatCurrency(breakdown.urgencyBonus)}
                            </span>
                          </div>
                        )}
                        {breakdown.distanceBonus > 0 && (
                          <div>
                            <span className="text-gray-600">Distance:</span>
                            <span className="ml-1 font-medium text-blue-600">
                              +{formatCurrency(breakdown.distanceBonus)}
                            </span>
                          </div>
                        )}
                        {breakdown.tips > 0 && (
                          <div>
                            <span className="text-gray-600">Tips:</span>
                            <span className="ml-1 font-medium text-green-600">
                              +{formatCurrency(breakdown.tips)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                No earnings records for this period
              </p>
              <p className="text-xs text-gray-500">
                Complete deliveries to start earning
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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

export default withRole(RiderEarningsPage, ['rider', 'admin']);