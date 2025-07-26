/**
 * Enhanced login form with React Hook Form and Zod validation
 */
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, LoadingSpinner, Card, CardContent } from '@/components/ui';
import { Form, FormField, FormLabel, FormMessage } from '@/components/ui/Form';
import { loginSchema, LoginFormData } from '@/lib/validation/schemas';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface EnhancedLoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
  className?: string;
}

export function EnhancedLoginForm({ onSuccess, redirectTo, className }: EnhancedLoginFormProps) {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string>('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const { handleSubmit, formState: { isSubmitting, errors }, watch, setValue } = form;

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    
    try {
      await login({
        email: data.email,
        password: data.password,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      setServerError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back! Please enter your details.
          </p>
        </div>

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

            {/* Password Field */}
            <FormField name="password">
              <FormLabel required>Password</FormLabel>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
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

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  {...form.register('rememberMe')}
                  disabled={isSubmitting}
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </a>
              </div>
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
                  <span className="ml-2">Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </Button>

            {/* Sign up link */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a
                  href="/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </a>
              </span>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}