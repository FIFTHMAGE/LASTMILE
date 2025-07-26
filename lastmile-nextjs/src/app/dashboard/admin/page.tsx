/**
 * Admin dashboard page
 */
'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, LoadingSpinner } from '@/components/ui';
import { withRole } from '@/contexts/AuthContext';
import { 
  UsersIcon, 
  TruckIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface AdminStats {
  totalUsers: number;
  totalBusinesses: number;
  totalRiders: number;
  activeOffers: number;
  completedOffers: number;
  totalRevenue: number;
  pendingVerifications: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'offer_created' | 'delivery_completed' | 'payment_processed';
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  user?: {
    name: string;
    role: string;
  };
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
        setRecentActivity(data.data.recentActivity);
        setSystemAlerts(data.data.systemAlerts);
      }
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <UsersIcon className="h-4 w-4" />;
      case 'offer_created':
        return <ClockIcon className="h-4 w-4" />;
      case 'delivery_completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'payment_processed':
        return <CurrencyDollarIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getActivityBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
      success: 'success',
      warning: 'warning',
      error: 'error',
    };

    return (
      <Badge variant={variants[status] || 'default'} size="sm">
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSystemHealthBadge = (health: string) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'error'; text: string }> = {
      healthy: { variant: 'success', text: 'Healthy' },
      warning: { variant: 'warning', text: 'Warning' },
      critical: { variant: 'error', text: 'Critical' },
    };

    const config = variants[health] || { variant: 'default' as const, text: 'Unknown' };

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" text="Loading dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Admin Dashboard"
      description="System overview and management"
    >
      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Button className="flex items-center">
          <UsersIcon className="h-4 w-4 mr-2" />
          Manage Users
        </Button>
        <Button variant="outline" className="flex items-center">
          <TruckIcon className="h-4 w-4 mr-2" />
          View All Offers
        </Button>
        <Button variant="outline" className="flex items-center">
          <ChartBarIcon className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>

      {/* System Health */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900 mr-3">
                    System Status
                  </h3>
                  {stats && getSystemHealthBadge(stats.systemHealth)}
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
                <Button variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalUsers || 0}
                </p>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <span>{stats?.totalBusinesses || 0} businesses</span>
                  <span className="mx-1">•</span>
                  <span>{stats?.totalRiders || 0} riders</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TruckIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Offers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.activeOffers || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.completedOffers || 0} completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats?.totalRevenue?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Platform earnings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.pendingVerifications || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Require attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {activity.description}
                      </p>
                      {activity.user && (
                        <p className="text-xs text-gray-600">
                          by {activity.user.name} ({activity.user.role})
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(activity.timestamp)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getActivityBadge(activity.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {systemAlerts.length > 0 ? (
              <div className="space-y-4">
                {systemAlerts.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border ${
                    alert.resolved 
                      ? 'bg-gray-50 border-gray-200' 
                      : alert.type === 'error' 
                        ? 'bg-red-50 border-red-200' 
                        : alert.type === 'warning'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className={`text-sm font-medium ${
                          alert.resolved 
                            ? 'text-gray-700' 
                            : alert.type === 'error' 
                              ? 'text-red-800' 
                              : alert.type === 'warning'
                                ? 'text-yellow-800'
                                : 'text-blue-800'
                        }`}>
                          {alert.title}
                          {alert.resolved && (
                            <span className="ml-2 text-xs text-gray-500">(Resolved)</span>
                          )}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          alert.resolved 
                            ? 'text-gray-600' 
                            : alert.type === 'error' 
                              ? 'text-red-700' 
                              : alert.type === 'warning'
                                ? 'text-yellow-700'
                                : 'text-blue-700'
                        }`}>
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDateTime(alert.timestamp)}
                        </p>
                      </div>
                      {!alert.resolved && (
                        <div className="flex-shrink-0 ml-4">
                          <Button variant="outline" size="sm">
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
                <p className="mt-2 text-sm text-gray-600">No active alerts</p>
                <p className="text-xs text-gray-500">System is running smoothly</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Summary */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                  <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Businesses</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">
                  {stats?.totalBusinesses || 0}
                </p>
                <p className="text-sm text-gray-600">
                  Active business accounts
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                  <TruckIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Riders</h3>
                <p className="text-3xl font-bold text-green-600 mb-2">
                  {stats?.totalRiders || 0}
                </p>
                <p className="text-sm text-gray-600">
                  Registered delivery riders
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-3">
                  <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Completion Rate</h3>
                <p className="text-3xl font-bold text-yellow-600 mb-2">
                  {stats?.completedOffers && stats?.activeOffers 
                    ? Math.round((stats.completedOffers / (stats.completedOffers + stats.activeOffers)) * 100)
                    : 0
                  }%
                </p>
                <p className="text-sm text-gray-600">
                  Successful deliveries
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default withRole(AdminDashboardPage, ['admin']);