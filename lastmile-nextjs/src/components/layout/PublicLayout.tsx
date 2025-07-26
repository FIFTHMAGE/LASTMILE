/**
 * Public layout component for non-authenticated pages
 */
'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface PublicLayoutProps {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
}

export function PublicLayout({ 
  children, 
  className,
  showHeader = true 
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {showHeader && (
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  LastMile Delivery
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Sign in
                </a>
                <a
                  href="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Get started
                </a>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={cn('flex-1', className)}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center mb-4 md:mb-0">
                <h2 className="text-lg font-semibold text-gray-900">
                  LastMile Delivery
                </h2>
              </div>
              <div className="flex space-x-6 text-sm text-gray-600">
                <a href="#" className="hover:text-gray-900">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-gray-900">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-gray-900">
                  Support
                </a>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-center text-sm text-gray-500">
                © 2024 LastMile Delivery. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}