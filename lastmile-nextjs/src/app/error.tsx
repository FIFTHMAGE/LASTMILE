/**
 * Global error page
 */
'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui';
import { 
  ExclamationCircleIcon,
  ArrowPathIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const getErrorMessage = (error: Error) => {
    // Don't expose sensitive error details in production
    if (process.env.NODE_ENV === 'production') {
      return 'An unexpected error occurred. Please try again.';
    }
    return error.message || 'An unexpected error occurred.';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 mb-6">
            <ExclamationCircleIcon className="h-12 w-12 text-red-600" />
          </div>

          {/* Error Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Something went wrong!
          </h1>

          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-sm text-red-700">
              {getErrorMessage(error)}
            </p>
            {error.digest && process.env.NODE_ENV !== 'production' && (
              <p className="text-xs text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              onClick={reset}
              className="flex items-center justify-center"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={handleGoHome}
              variant="outline"
              className="flex items-center justify-center"
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Help Information */}
          <div className="bg-gray-100 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              What can you do?
            </h3>
            <div className="text-left space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="font-medium mr-2">1.</span>
                <span>Try refreshing the page or clicking "Try Again"</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium mr-2">2.</span>
                <span>Check your internet connection</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium mr-2">3.</span>
                <span>Clear your browser cache and cookies</span>
              </div>
              <div className="flex items-start">
                <span className="font-medium mr-2">4.</span>
                <span>If the problem persists, contact our support team</span>
              </div>
            </div>
          </div>

          {/* Support Links */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Need help? Our support team is here to assist you.
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
                Report Issue
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