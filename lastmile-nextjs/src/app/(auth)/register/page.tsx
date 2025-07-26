/**
 * Registration page with role selection
 */
'use client';

import React, { useState } from 'react';
import { PublicLayout } from '@/components/layout';
import { BusinessRegistrationForm, RiderRegistrationForm } from '@/components/forms';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui';
import { TruckIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

type UserRole = 'business' | 'rider';

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  if (!selectedRole) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Join LastMile Delivery
              </h1>
              <p className="text-lg text-gray-600">
                Choose your account type to get started
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Registration */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <BuildingStorefrontIcon className="h-16 w-16 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl mb-2">
                    I'm a Business
                  </CardTitle>
                  <CardDescription className="mb-6">
                    I need delivery services for my business. I want to send packages and manage deliveries.
                  </CardDescription>
                  <ul className="text-sm text-gray-600 mb-6 space-y-2">
                    <li>• Post delivery requests</li>
                    <li>• Track your packages</li>
                    <li>• Manage multiple deliveries</li>
                    <li>• Business dashboard</li>
                  </ul>
                  <Button
                    onClick={() => setSelectedRole('business')}
                    className="w-full"
                  >
                    Register as Business
                  </Button>
                </CardContent>
              </Card>

              {/* Rider Registration */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-4">
                    <TruckIcon className="h-16 w-16 text-green-600" />
                  </div>
                  <CardTitle className="text-xl mb-2">
                    I'm a Rider
                  </CardTitle>
                  <CardDescription className="mb-6">
                    I want to deliver packages and earn money. I have a vehicle and want to work flexibly.
                  </CardDescription>
                  <ul className="text-sm text-gray-600 mb-6 space-y-2">
                    <li>• Accept delivery offers</li>
                    <li>• Flexible working hours</li>
                    <li>• Track your earnings</li>
                    <li>• Rider dashboard</li>
                  </ul>
                  <Button
                    onClick={() => setSelectedRole('rider')}
                    variant="secondary"
                    className="w-full"
                  >
                    Register as Rider
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </a>
              </span>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => setSelectedRole(null)}
              className="mb-4"
            >
              ← Back to role selection
            </Button>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {selectedRole === 'business' ? 'Create Business Account' : 'Create Rider Account'}
                </CardTitle>
                <CardDescription>
                  {selectedRole === 'business' 
                    ? 'Set up your business profile to start sending packages'
                    : 'Set up your rider profile to start earning money'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedRole === 'business' ? (
                  <BusinessRegistrationForm />
                ) : (
                  <RiderRegistrationForm />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}