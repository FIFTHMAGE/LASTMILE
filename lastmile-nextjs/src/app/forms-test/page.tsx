/**
 * Form components test page
 */
'use client';

import React, { useState } from 'react';
import { 
  EnhancedLoginForm,
  EnhancedBusinessRegistrationForm,
  OfferCreationForm,
  ForgotPasswordForm,
  ResetPasswordForm
} from '@/components/forms';
import { Card, CardHeader, CardTitle, CardContent, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';

export default function FormsTestPage() {
  const [activeForm, setActiveForm] = useState('login');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Form Components Test</h1>
        <p className="text-gray-600">
          Test all form components with React Hook Form and Zod validation
        </p>
      </div>

      <Tabs value={activeForm} onValueChange={setActiveForm}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="offer">Create Offer</TabsTrigger>
          <TabsTrigger value="forgot">Forgot Password</TabsTrigger>
          <TabsTrigger value="reset">Reset Password</TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Login Form</CardTitle>
                <p className="text-sm text-gray-600">
                  Login form with React Hook Form, Zod validation, and enhanced UX
                </p>
              </CardHeader>
              <CardContent>
                <EnhancedLoginForm
                  onSuccess={() => alert('Login successful!')}
                  className="max-w-md mx-auto"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Business Registration Form</CardTitle>
                <p className="text-sm text-gray-600">
                  Comprehensive business registration with multi-step validation
                </p>
              </CardHeader>
              <CardContent>
                <EnhancedBusinessRegistrationForm
                  onSuccess={() => alert('Registration successful!')}
                  className="max-w-2xl mx-auto"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offer">
            <Card>
              <CardHeader>
                <CardTitle>Offer Creation Form</CardTitle>
                <p className="text-sm text-gray-600">
                  Create delivery requests with detailed package and location information
                </p>
              </CardHeader>
              <CardContent>
                <OfferCreationForm
                  onSuccess={(offerId) => alert(`Offer created with ID: ${offerId}`)}
                  className="max-w-3xl mx-auto"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forgot">
            <Card>
              <CardHeader>
                <CardTitle>Forgot Password Form</CardTitle>
                <p className="text-sm text-gray-600">
                  Request password reset with email validation
                </p>
              </CardHeader>
              <CardContent>
                <ForgotPasswordForm
                  onSuccess={() => alert('Reset email sent!')}
                  className="max-w-md mx-auto"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reset">
            <Card>
              <CardHeader>
                <CardTitle>Reset Password Form</CardTitle>
                <p className="text-sm text-gray-600">
                  Set new password with strength validation
                </p>
              </CardHeader>
              <CardContent>
                <ResetPasswordForm
                  token="sample-reset-token"
                  onSuccess={() => alert('Password reset successful!')}
                  className="max-w-md mx-auto"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Form Features Overview */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">React Hook Form</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Performant form handling</li>
              <li>• Minimal re-renders</li>
              <li>• Built-in validation</li>
              <li>• TypeScript support</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Zod Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Schema-based validation</li>
              <li>• Type-safe forms</li>
              <li>• Custom error messages</li>
              <li>• Complex validation rules</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enhanced UX</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Real-time validation</li>
              <li>• Loading states</li>
              <li>• Error handling</li>
              <li>• Accessibility support</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Validation Examples */}
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Validation Examples</CardTitle>
            <p className="text-sm text-gray-600">
              Try these inputs to see validation in action
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Email Validation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Valid: user@example.com</li>
                  <li>• Invalid: invalid-email</li>
                  <li>• Invalid: @example.com</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Password Validation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Valid: MyPassword123!</li>
                  <li>• Invalid: password (too simple)</li>
                  <li>• Invalid: 12345678 (no letters)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Phone Validation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Valid: +1 (555) 123-4567</li>
                  <li>• Valid: 555-123-4567</li>
                  <li>• Invalid: 123 (too short)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">ZIP Code Validation</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Valid: 12345</li>
                  <li>• Valid: 12345-6789</li>
                  <li>• Invalid: 1234 (too short)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}