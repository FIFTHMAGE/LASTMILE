import React, { useState, useEffect } from 'react';
import { commonAPI } from '../../services/api';
import { Button, Card, Badge, LoadingSpinner, Select } from '../../components/UI';
import { Bell, Check, CheckCheck, Trash2, Filter, Package, DollarSign, AlertCircle, Info } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [markingRead, setMarkingRead] = useState(new Set());
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalNotifications: 0,
    hasNext: false,
    hasPrev: false
  });

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        limit: 20
      };

      if (filter !== 'all') {
        params.isRead = filter === 'read';
      }

      const response = await commonAPI.getNotifications(params);
      setNotifications(response.data.notifications);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch notifications');
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    if (markingRead.has(notificationId)) return;

    setMarkingRead(prev => new Set([...prev, notificationId]));
    try {
      await commonAPI.markNotificationRead(notificationId);
      
      // Update the notification in the list
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification
        )
      );
    } catch (error) {
      toast.error('Failed to mark notification as read');
      console.error('Error marking notification as read:', error);
    } finally {
      setMarkingRead(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await commonAPI.markAllNotificationsRead();
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          read: true, 
          readAt: new Date().toISOString() 
        }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      // Business notifications
      offer_accepted: <Package className="h-5 w-5 text-blue-600" />,
      offer_completed: <CheckCheck className="h-5 w-5 text-green-600" />,
      payment_processed: <DollarSign className="h-5 w-5 text-green-600" />,
      pickup_ready: <Bell className="h-5 w-5 text-yellow-600" />,
      in_transit: <Package className="h-5 w-5 text-purple-600" />,
      delivered: <CheckCheck className="h-5 w-5 text-green-600" />,
      delivery_completed: <CheckCheck className="h-5 w-5 text-green-600" />,
      
      // Rider notifications
      new_offer: <Package className="h-5 w-5 text-blue-600" />,
      earnings_update: <DollarSign className="h-5 w-5 text-green-600" />,
      
      // Admin notifications
      system_announcement: <Info className="h-5 w-5 text-blue-600" />,
      user_registration: <Users className="h-5 w-5 text-purple-600" />,
      payment_issue: <AlertCircle className="h-5 w-5 text-red-600" />,
      platform_metrics: <TrendingUp className="h-5 w-5 text-green-600" />,
      support_ticket: <AlertCircle className="h-5 w-5 text-yellow-600" />,
      security_alert: <AlertCircle className="h-5 w-5 text-red-600" />,
      
      // Default
      default: <Bell className="h-5 w-5 text-gray-600" />
    };
    return icons[type] || icons.default;
  };

  const getNotificationColor = (type) => {
    const colors = {
      // Business notifications
      offer_accepted: 'border-l-blue-500',
      offer_completed: 'border-l-green-500',
      payment_processed: 'border-l-green-500',
      pickup_ready: 'border-l-yellow-500',
      in_transit: 'border-l-purple-500',
      delivered: 'border-l-green-500',
      delivery_completed: 'border-l-green-500',
      
      // Rider notifications
      new_offer: 'border-l-blue-500',
      earnings_update: 'border-l-green-500',
      
      // Admin notifications
      system_announcement: 'border-l-blue-500',
      user_registration: 'border-l-purple-500',
      payment_issue: 'border-l-red-500',
      platform_metrics: 'border-l-green-500',
      support_ticket: 'border-l-yellow-500',
      security_alert: 'border-l-red-500',
      
      // Default
      default: 'border-l-gray-500'
    };
    return colors[type] || colors.default;
  };

  const formatNotificationDate = (date) => {
    const notificationDate = new Date(date);
    
    if (isToday(notificationDate)) {
      return `Today at ${format(notificationDate, 'HH:mm')}`;
    } else if (isYesterday(notificationDate)) {
      return `Yesterday at ${format(notificationDate, 'HH:mm')}`;
    } else {
      return format(notificationDate, 'MMM dd, yyyy HH:mm');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading && notifications.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your delivery activities
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Notifications' },
              { value: 'unread', label: 'Unread Only' },
              { value: 'read', label: 'Read Only' }
            ]}
          />
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : filter === 'read'
                ? "No read notifications found."
                : "You don't have any notifications yet."
              }
            </p>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all duration-200 hover:shadow-md border-l-4 ${
                getNotificationColor(notification.type)
              } ${
                !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                      
                      {notification.offer && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Package className="h-3 w-3 mr-1" />
                          <span>
                            {notification.offer.pickup} → {notification.offer.delivery}
                          </span>
                          <span className="ml-2 font-medium">
                            ${notification.offer.amount}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {notification.read && notification.readAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.read && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      loading={markingRead.has(notification.id)}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark Read
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
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
            onClick={() => {
              setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }));
              fetchNotifications();
            }}
          >
            Previous
          </Button>
          
          <span className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          
          <Button
            variant="outline"
            disabled={!pagination.hasNext}
            onClick={() => {
              setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
              fetchNotifications();
            }}
          >
            Next
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      {notifications.length > 0 && (
        <Card className="bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Notification Settings</h3>
              <p className="text-sm text-gray-600">
                Manage how you receive notifications
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/profile'}>
              Manage Settings
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default NotificationsPage;