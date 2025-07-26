/**
 * Performance monitoring dashboard component for admin users
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner, Badge } from '@/components/ui';
import { 
  ChartBarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface SystemMetrics {
  server: {
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    responseTime: number;
  };
  database: {
    connections: number;
    queryTime: number;
    slowQueries: number;
    cacheHitRate: number;
  };
  api: {
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
    activeConnections: number;
  };
  business: {
    activeUsers: number;
    totalOffers: number;
    completionRate: number;
    averageDeliveryTime: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  metric: string;
  value: number;
  threshold: number;
}

export interface PerformanceMonitorProps {
  refreshInterval?: number;
  className?: string;
}

export function PerformanceMonitor({ 
  refreshInterval = 30000, // 30 seconds
  className = '' 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchMetrics();
    
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/performance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lastmile_auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data.data.metrics);
        setAlerts(data.data.alerts || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (value: number, thresholds: { warning: number; critical: number }, inverted = false) => {
    if (inverted) {
      if (value < thresholds.critical) return 'critical';
      if (value < thresholds.warning) return 'warning';
      return 'healthy';
    } else {
      if (value > thresholds.critical) return 'critical';
      if (value > thresholds.warning) return 'warning';
      return 'healthy';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'critical':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" text="Loading performance metrics..." />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">Failed to load performance metrics</p>
      </div>
    );
  }

  const serverCpuStatus = getHealthStatus(metrics.server.cpuUsage, { warning: 70, critical: 90 });
  const serverMemoryStatus = getHealthStatus(metrics.server.memoryUsage, { warning: 80, critical: 95 });
  const apiErrorStatus = getHealthStatus(metrics.api.errorRate, { warning: 5, critical: 10 });
  const dbCacheStatus = getHealthStatus(metrics.database.cacheHitRate, { warning: 80, critical: 60 }, true);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitor</h2>
          <p className="text-sm text-gray-600">
            Real-time system performance and health metrics
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Last updated: {lastUpdated?.toLocaleTimeString()}
          </p>
          <div className="flex items-center mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-xs text-gray-500">Live monitoring</span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter(alert => !alert.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Active Alerts ({alerts.filter(alert => !alert.resolved).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.filter(alert => !alert.resolved).map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${
                  alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`text-sm font-medium ${
                        alert.type === 'critical' ? 'text-red-800' :
                        alert.type === 'warning' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                        {alert.title}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        alert.type === 'critical' ? 'text-red-700' :
                        alert.type === 'warning' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {alert.metric}: {alert.value} (threshold: {alert.threshold})
                      </p>
                    </div>
                    <Badge variant={alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'default'}>
                      {alert.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Server Health */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <ServerIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Server</p>
                  <p className="text-xs text-gray-500">Uptime: {formatUptime(metrics.server.uptime)}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor('healthy')}`}>
                {getStatusIcon('healthy')}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Response Time</span>
                <span>{metrics.server.responseTime}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPU Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CpuChipIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.server.cpuUsage}%</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(serverCpuStatus)}`}>
                {getStatusIcon(serverCpuStatus)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  serverCpuStatus === 'critical' ? 'bg-red-500' :
                  serverCpuStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${metrics.server.cpuUsage}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <CircleStackIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Memory</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.server.memoryUsage}%</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(serverMemoryStatus)}`}>
                {getStatusIcon(serverMemoryStatus)}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  serverMemoryStatus === 'critical' ? 'bg-red-500' :
                  serverMemoryStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${metrics.server.memoryUsage}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* API Performance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <GlobeAltIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">API</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.api.requestsPerMinute}</p>
                  <p className="text-xs text-gray-500">req/min</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(apiErrorStatus)}`}>
                {getStatusIcon(apiErrorStatus)}
              </div>
            </div>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Error Rate</span>
                <span>{metrics.api.errorRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Response</span>
                <span>{metrics.api.averageResponseTime}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CircleStackIcon className="h-5 w-5 text-blue-600 mr-2" />
              Database Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Connections</span>
                <span className="text-sm font-medium">{metrics.database.connections}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Query Time</span>
                <span className="text-sm font-medium">{metrics.database.queryTime}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Slow Queries</span>
                <span className="text-sm font-medium">{metrics.database.slowQueries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cache Hit Rate</span>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">{metrics.database.cacheHitRate}%</span>
                  <div className={`px-2 py-1 rounded-full border text-xs ${getStatusColor(dbCacheStatus)}`}>
                    {getStatusIcon(dbCacheStatus)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-green-600 mr-2" />
              Business Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-sm font-medium">{metrics.business.activeUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Offers</span>
                <span className="text-sm font-medium">{metrics.business.totalOffers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-medium">{metrics.business.completionRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Delivery Time</span>
                <span className="text-sm font-medium">{metrics.business.averageDeliveryTime} min</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}