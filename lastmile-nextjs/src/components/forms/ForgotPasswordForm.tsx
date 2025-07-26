/**
 * Forgot password form with React Hook Form and Zod validation
 */
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, LoadingSpinner, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Form, FormField, FormLabel, FormMessage } from '@/components/ui/Form';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validation/schemas';

export interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function ForgotPasswordForm({ onSuccess, className }: ForgotPasswordFormProps) {
  const [serverError, setServerError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const { handleSubmit, formState: { isSubmitting, errors } } = form;

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerError('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      setIsSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setServerError(error instanceof Error ? error.message : 'Failed to send reset email. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
          <p className="text-sm text-gray-600 mb-4">
            We've sent a password reset link to your email address.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => setIsSuccess(false)}
              variant="outline"
              className="w-full"
            >
              Send another email
            </Button>
            <div className="text-center">
              <a
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Back to sign in
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <p className="text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </CardHeader>
      
      <CardContent>
        <Form>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Server Error */}
            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{serverError}</div>
              </div>
            )}

            {/* Email Field */}
            <FormField name="email">
              <FormLabel required>Email address</FormLabel>
              <Input
                type="email"
                placeholder="Enter your email"
                error={errors.email?.message}
                {...form.register('email')}
                disabled={isSubmitting}
              />
              {errors.email && <FormMessage>{errors.email.message}</FormMessage>}
            </FormField>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Sending...</span>
                </div>
              ) : (
                'Send reset link'
              )}
            </Button>

            {/* Back to login */}
            <div className="text-center">
              <a
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Back to sign in
              </a>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}