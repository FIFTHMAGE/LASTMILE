/**
 * 404 Not Found page
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { 
  ExclamationTriangleIcon,
  HomeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function NotFound() {
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 mb-6">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
          </div>

          {/* Error Code */}
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>

          {/* Error Message */}
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you entered the wrong URL.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex items-center justify-center"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={handleGoHome}
              className="flex items-center justify-center"
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Help Text */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 mb-4">
              If you believe this is an error, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
              <a
                href="mailto:support@lastmiledelivery.com"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Email Support
              </a>
              <span className="hidden sm:inline text-gray-300">|</span>
              <a
                href="/help"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Help Center
              </a>
              <span className="hidden sm:inline text-gray-300">|</span>
              <a
                href="/contact"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center">
        <p className="text-xs text-gray-400">
          © 2024 LastMile Delivery. All rights reserved.
        </p>
      </div>
    </div>
  );
}