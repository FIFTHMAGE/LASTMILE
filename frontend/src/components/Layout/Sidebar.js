import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Package,
  Plus,
  Truck,
  MapPin,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  Bell,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const getNavigationItems = () => {
    const commonItems = [
      {
        name: 'Notifications',
        href: '/notifications',
        icon: Bell,
      },
    ];

    if (user?.role === 'business') {
      return [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: 'My Offers',
          href: '/offers',
          icon: Package,
        },
        {
          name: 'Create Offer',
          href: '/offers/create',
          icon: Plus,
        },
        {
          name: 'Earnings',
          href: '/earnings',
          icon: DollarSign,
        },
        ...commonItems,
      ];
    }

    if (user?.role === 'rider') {
      return [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: 'Available Offers',
          href: '/offers',
          icon: Package,
        },
        {
          name: 'My Deliveries',
          href: '/deliveries',
          icon: Truck,
        },
        {
          name: 'Earnings',
          href: '/earnings',
          icon: DollarSign,
        },
        {
          name: 'Statistics',
          href: '/stats',
          icon: BarChart3,
        },
        ...commonItems,
      ];
    }

    if (user?.role === 'admin') {
      return [
        {
          name: 'Admin Dashboard',
          href: '/admin',
          icon: LayoutDashboard,
        },
        {
          name: 'Users',
          href: '/admin/users',
          icon: Users,
        },
        {
          name: 'Offers',
          href: '/admin/offers',
          icon: Package,
        },
        {
          name: 'Analytics',
          href: '/admin/analytics',
          icon: BarChart3,
        },
        ...commonItems,
      ];
    }

    return commonItems;
  };

  const navigationItems = getNavigationItems();

  const isActiveLink = (href) => {
    return location.pathname === href;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header - only visible on mobile */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LM</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                Last Mile
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveLink(item.href);

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon
                    className={clsx(
                      'mr-3 h-5 w-5',
                      isActive ? 'text-blue-700' : 'text-gray-400'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-gray-200">
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center p-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;