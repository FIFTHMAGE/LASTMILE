/**
 * Mobile app download section for marketing pages
 */
'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { 
  DevicePhoneMobileIcon,
  StarIcon,
  ArrowDownTrayIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';

export interface MobileAppSectionProps {
  className?: string;
  showQRCode?: boolean;
  variant?: 'landing' | 'footer' | 'sidebar';
}

const appFeatures = [
  'Real-time order tracking',
  'Push notifications',
  'Offline mode support',
  'GPS navigation',
  'In-app messaging',
  'Quick payment processing'
];

const appStats = {
  downloads: '50K+',
  rating: 4.8,
  reviews: 2340
};

export function MobileAppSection({ 
  className = '',
  showQRCode = false,
  variant = 'landing'
}: MobileAppSectionProps) {
  const handleAppStoreClick = () => {
    // In a real app, this would link to the actual App Store
    window.open('https://apps.apple.com/app/lastmile-delivery', '_blank');
  };

  const handlePlayStoreClick = () => {
    // In a real app, this would link to the actual Play Store
    window.open('https://play.google.com/store/apps/details?id=com.lastmile.delivery', '_blank');
  };

  if (variant === 'footer') {
    return (
      <div className={`${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Download Our Mobile App
        </h3>
        <p className="text-gray-600 mb-4">
          Get the full LastMile experience on your mobile device
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleAppStoreClick}
            className="flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs">Download on the</div>
              <div className="text-sm font-semibold">App Store</div>
            </div>
          </button>
          
          <button
            onClick={handlePlayStoreClick}
            className="flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            <div className="text-left">
              <div className="text-xs">Get it on</div>
              <div className="text-sm font-semibold">Google Play</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 ${className}`}>
        <div className="flex items-center mb-3">
          <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h3 className="font-semibold text-gray-900">Mobile App</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Download our app for the best experience
        </p>
        <div className="flex items-center mb-3">
          <div className="flex items-center mr-3">
            {[...Array(5)].map((_, i) => (
              <StarIcon 
                key={i} 
                className={`h-4 w-4 ${i < Math.floor(appStats.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">{appStats.rating} ({appStats.reviews})</span>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleAppStoreClick}
            className="w-full flex items-center justify-center px-3 py-2 bg-black text-white rounded text-xs hover:bg-gray-800 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            App Store
          </button>
          <button
            onClick={handlePlayStoreClick}
            className="w-full flex items-center justify-center px-3 py-2 bg-black text-white rounded text-xs hover:bg-gray-800 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            Google Play
          </button>
        </div>
      </div>
    );
  }

  // Default landing page variant
  return (
    <section className={`py-20 bg-gradient-to-br from-gray-50 to-blue-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <div className="flex items-center mb-6">
              <DevicePhoneMobileIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Get Our Mobile App
              </h2>
            </div>
            
            <p className="text-xl text-gray-600 mb-8">
              Take LastMile with you wherever you go. Our mobile app provides the full platform experience optimized for your smartphone.
            </p>

            {/* App Stats */}
            <div className="flex items-center space-x-6 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{appStats.downloads}</div>
                <div className="text-sm text-gray-600">Downloads</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600 mr-1">{appStats.rating}</span>
                  <StarIcon className="h-5 w-5 text-yellow-400 fill-current" />
                </div>
                <div className="text-sm text-gray-600">Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{appStats.reviews.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Reviews</div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">App Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {appFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleAppStoreClick}
                className="flex items-center justify-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Download on the</div>
                  <div className="text-lg font-semibold">App Store</div>
                </div>
              </button>
              
              <button
                onClick={handlePlayStoreClick}
                className="flex items-center justify-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                </svg>
                <div className="text-left">
                  <div className="text-xs">Get it on</div>
                  <div className="text-lg font-semibold">Google Play</div>
                </div>
              </button>
            </div>

            {/* QR Code Option */}
            {showQRCode && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center">
                  <div className="bg-white p-4 rounded-lg border mr-4">
                    <QrCodeIcon className="h-16 w-16 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Scan to Download</h4>
                    <p className="text-sm text-gray-600">
                      Scan this QR code with your phone camera to download the app
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Phone Mockup */}
          <div className="relative">
            <div className="mx-auto w-64 h-128 bg-gray-900 rounded-3xl p-2 shadow-2xl">
              <div className="w-full h-full bg-white rounded-2xl overflow-hidden">
                {/* Status Bar */}
                <div className="bg-blue-600 h-12 flex items-center justify-between px-4">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-white rounded-full mr-2"></div>
                    <span className="text-white text-sm font-semibold">LastMile</span>
                  </div>
                  <div className="text-white text-xs">9:41 AM</div>
                </div>
                
                {/* App Content */}
                <div className="p-4 space-y-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Active Delivery</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">In Transit</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Package #12345 • Est. 15 min
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium mb-1">New Offer Available</div>
                      <div className="text-xs text-gray-600">$25.00 • 2.3 miles</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium mb-1">New Offer Available</div>
                      <div className="text-xs text-gray-600">$18.50 • 1.8 miles</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-4">
                    <div className="w-32 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Accept Offer</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-green-500 text-white rounded-full p-2">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white rounded-full p-3">
              <TruckIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}