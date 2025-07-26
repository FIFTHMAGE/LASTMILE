/**
 * Sidebar navigation component
 */
'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import {
  HomeIcon,
  DocumentTextIcon,
  TruckIcon,
  CreditCardIcon,
  BellIcon,
  UserGroupIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    roles: ['business', 'rider', 'admin']
  },
  {
    name: 'Offers',
    href: '/dashboard/offers',
    icon: DocumentTextIcon,
    roles: ['business', 'rider', 'admin']
  },
  {
    name: 'Deliveries',
    href: '/dashboard/deliveries',
    icon: TruckIcon,
    roles: ['rider', 'admin']
  },
  {
    name: 'Payments',
    href: '/dashboard/payments',
    icon: CreditCardIcon,
    roles: ['business', 'rider', 'admin']
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: BellIcon,
    roles: ['business', 'rider', 'admin'],
    badge: '3'
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: UserGroupIcon,
    roles: ['admin']
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: ChartBarIcon,
    roles: ['admin']
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Cog6ToothIcon,
    roles: ['business', 'rider', 'admin']
  }
];

export function Sidebar({ isOpen, onClose, userRole }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  );

  const handleNavigation = (href: string) => {
    router.push(href);
    onClose(); // Close mobile sidebar after navigation
  };

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-bold text-gray-900">
              LastMile
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href || 
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    
                    return (
                      <li key={item.name}>
                        <button
                          onClick={() => handleNavigation(item.href)}
                          className={cn(
                            'group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                            isActive
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-6 w-6 shrink-0',
                              isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                            )}
                          />
                          <span className="flex-1 text-left">{item.name}</span>
                          {item.badge && (
                            <span className="ml-auto inline-block py-0.5 px-2 text-xs bg-red-100 text-red-600 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={cn(
        'relative z-50 lg:hidden',
        isOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={onClose}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
              {/* Logo */}
              <div className="flex h-16 shrink-0 items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  LastMile
                </h1>
              </div>

              {/* Navigation */}
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {filteredNavigation.map((item) => {
                        const isActive = pathname === item.href || 
                          (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        
                        return (
                          <li key={item.name}>
                            <button
                              onClick={() => handleNavigation(item.href)}
                              className={cn(
                                'group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                                isActive
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                              )}
                            >
                              <item.icon
                                className={cn(
                                  'h-6 w-6 shrink-0',
                                  isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                                )}
                              />
                              <span className="flex-1 text-left">{item.name}</span>
                              {item.badge && (
                                <span className="ml-auto inline-block py-0.5 px-2 text-xs bg-red-100 text-red-600 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}