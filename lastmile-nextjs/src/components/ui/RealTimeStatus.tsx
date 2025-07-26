/**
 * Real-time status updates component with WebSocket integration
 */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Badge, LoadingSpinner } from '@/components/ui';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  TruckIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  MapPinIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

export interface StatusUpdate {
  id: string;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'completed' | 'cancelled';
  timestamp: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  message?: string;
  riderInfo?: {
    name: string;
    phone: string;
    vehicleType: string;
    rating: number;
  };
  estimatedArrival?: string;
}

export interface RealTimeStatusProps {
  offerId: string;
  initialStatus?: string;
  onStatusChange?: (status: StatusUpdate) => void;
  showRiderInfo?: boolean;
  showLocation?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Pending',
    description: 'Waiting for a rider to accept'
  },
  accepted: {
    icon: CheckCircleIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Accepted',
    description: 'Rider is on the way to pickup'
  },
  picked_up: {
    icon: TruckIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Picked Up',
    description: 'Package has been collected'
  },
  in_transit: {
    icon: TruckIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: 'In Transit',
    description: 'Package is on the way to destination'
  },
  delivered: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Delivered',
    description: 'Package has been delivered'
  },
  completed: {
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Completed',
    description: 'Delivery completed successfully'
  },
  cancelled: {
    icon: XCircleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Cancelled',
    description: 'Delivery has been cancelled'
  }
};

export function RealTimeStatus({ 
  offerId, 
  initialStatus = 'pending',
  onStatusChange,
  showRiderInfo = true,
  showLocation = true,
  className = ''
}: RealTimeStatusProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate>({
    id: offerId,
    status: initialStatus as any,
    timestamp: new Date().toISOString()
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [offerId]);

  const connectWebSocket = () => {
    try {
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `wss://${window.location.host}/ws/offers/${offerId}`
        : `ws://localhost:3001/ws/offers/${offerId}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Send authentication token
        const token = localStorage.getItem('lastmile_auth_token');
        if (token) {
          wsRef.current?.send(JSON.stringify({
            type: 'auth',
            token
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'status_update') {
            const statusUpdate: StatusUpdate = {
              id: data.offerId,
              status: data.status,
              timestamp: data.timestamp,
              location: data.location,
              message: data.message,
              riderInfo: data.riderInfo,
              estimatedArrival: data.estimatedArrival
            };
            
            setCurrentStatus(statusUpdate);
            onStatusChange?.(statusUpdate);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionError('Failed to establish real-time connection');
    }
  };

  const config = statusConfig[currentStatus.status];
  const IconComponent = config.icon;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatEstimatedArrival = (arrival: string) => {
    const date = new Date(arrival);
    const now = new Date();
    const diffInMinutes = Math.floor((date.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes <= 0) {
      return 'Arriving now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isConnected ? 'Live updates' : 'Reconnecting...'}
          </span>
        </div>
        {!isConnected && (
          <LoadingSpinner size="sm" />
        )}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">{connectionError}</span>
          </div>
        </div>
      )}

      {/* Current Status */}
      <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 ${config.color}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className={`text-lg font-semibold ${config.color}`}>
                {config.label}
              </h3>
              <Badge variant="outline" size="sm">
                {currentStatus.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {config.description}
            </p>
            {currentStatus.message && (
              <p className="text-sm text-gray-700 mb-2 italic">
                "{currentStatus.message}"
              </p>
            )}
            <p className="text-xs text-gray-500">
              Updated: {formatTimestamp(currentStatus.timestamp)}
            </p>
          </div>
        </div>

        {/* Estimated Arrival */}
        {currentStatus.estimatedArrival && ['accepted', 'picked_up', 'in_transit'].includes(currentStatus.status) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                Estimated arrival: {formatEstimatedArrival(currentStatus.estimatedArrival)}
              </span>
            </div>
          </div>
        )}

        {/* Rider Information */}
        {showRiderInfo && currentStatus.riderInfo && currentStatus.status !== 'pending' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Rider Information</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">{currentStatus.riderInfo.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {currentStatus.riderInfo.vehicleType} • ⭐ {currentStatus.riderInfo.rating.toFixed(1)}
                </p>
              </div>
              <a
                href={`tel:${currentStatus.riderInfo.phone}`}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
              >
                <PhoneIcon className="h-4 w-4" />
                <span className="text-sm">Call</span>
              </a>
            </div>
          </div>
        )}

        {/* Location Information */}
        {showLocation && currentStatus.location && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-start space-x-2">
              <MapPinIcon className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-700">Current Location</p>
                {currentStatus.location.address ? (
                  <p className="text-xs text-gray-500">{currentStatus.location.address}</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    {currentStatus.location.lat.toFixed(4)}, {currentStatus.location.lng.toFixed(4)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Timeline</h4>
        <div className="space-y-3">
          {Object.entries(statusConfig).map(([status, config], index) => {
            const isCompleted = getStatusOrder(currentStatus.status) >= getStatusOrder(status as any);
            const isCurrent = currentStatus.status === status;
            
            return (
              <div key={status} className="flex items-center space-x-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isCompleted 
                    ? `${config.color} border-current bg-current` 
                    : 'border-gray-300'
                }`}>
                  {isCompleted && (
                    <CheckCircleIcon className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${
                    isCurrent ? 'font-semibold text-gray-900' : 
                    isCompleted ? 'text-gray-700' : 'text-gray-500'
                  }`}>
                    {config.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-gray-500">Current status</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getStatusOrder(status: string): number {
  const order = {
    pending: 0,
    accepted: 1,
    picked_up: 2,
    in_transit: 3,
    delivered: 4,
    completed: 5,
    cancelled: -1
  };
  return order[status as keyof typeof order] ?? 0;
}