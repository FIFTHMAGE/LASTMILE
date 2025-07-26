/**
 * Global loading page
 */
'use client';

import React from 'react';
import { LoadingSpinner } from '@/components/ui';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
      <div className="text-center">
        {/* Logo or Brand */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LastMile Delivery
          </h1>
          <p className="text-gray-600">
            Loading your experience...
          </p>
        </div>

        {/* Loading Spinner */}
        <LoadingSpinner size="lg" />

        {/* Loading Text */}
        <div className="mt-6">
          <p className="text-sm text-gray-500">
            Please wait while we prepare everything for you
          </p>
        </div>

        {/* Progress Dots Animation */}
        <div className="flex justify-center mt-4 space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
}