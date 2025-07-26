/**
 * Reset password form with React Hook Form and Zod validation
 */
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button, Input, LoadingSpinner, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Form, FormField, FormLabel, FormMessage } from '@/components/ui/Form';
import { resetPasswordSchema, ResetPasswordFormData } from '@/lib/validation/schemas';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
  className?: string;
}

export function ResetPasswordForm({ token, onSuccess, className }: ResetPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string>('');

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: '',
      confirmPassword: '',
    },
  });

  const { handleSubmit, formState: { isSubmitting, errors } } = form;

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError('');
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/login?message=Password reset successful');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setServerError(error instanceof Error ? error.message : 'Failed to reset password. Please try again.');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <p className="text-sm text-gray-600">
          Enter your new password below.
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

            {/* Password Field */}
            <FormField name="password">
              <FormLabel required>New Password</FormLabel>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  error={errors.password?.message}
                  {...form.register('password')}
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && <FormMessage>{errors.password.message}</FormMessage>}
            </FormField>

            {/* Confirm Password Field */}
            <FormField name="confirmPassword">
              <FormLabel required>Confirm New Password</FormLabel>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  error={errors.confirmPassword?.message}
                  {...form.register('confirmPassword')}
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <FormMessage>{errors.confirmPassword.message}</FormMessage>}
            </FormField>

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Contains uppercase and lowercase letters</li>
                <li>• Contains at least one number</li>
                <li>• Contains at least one special character</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" color="white" />
                  <span className="ml-2">Resetting...</span>
                </div>
              ) : (
                'Reset password'
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