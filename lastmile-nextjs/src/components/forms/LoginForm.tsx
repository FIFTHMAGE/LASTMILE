/**
 * Login form component
 */
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { validateLoginRequest, LoginRequest } from '@/lib/types';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo }: LoginFormProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      // Validate form data
      const validation = validateLoginRequest(formData);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Attempt login
      await login(formData);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors([error instanceof Error ? error.message : 'Login failed']);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const fillDemoCredentials = (email: string, password: string) => {
    setFormData({ email, password });
    setErrors([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error display */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-sm text-red-600">
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Email field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange('email')}
          placeholder="Enter your email"
          required
          disabled={loading}
          className="w-full"
        />
      </div>

      {/* Password field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange('password')}
            placeholder="Enter your password"
            required
            disabled={loading}
            className="w-full pr-10"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Remember me and forgot password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
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

      {/* Submit button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" color="white" />
            <span className="ml-2">Signing in...</span>
          </div>
        ) : (
          'Sign in'
        )}
      </Button>

      {/* Demo credentials */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="text-center">
          <h3 className="text-sm font-medium text-blue-900 mb-2">🧪 Demo Credentials</h3>
          <div className="text-xs text-blue-700 space-y-2">
            <button
              type="button"
              onClick={() => fillDemoCredentials('business@demo.com', 'demo123')}
              className="block w-full text-left p-2 rounded hover:bg-blue-100 transition-colors"
              disabled={loading}
            >
              <strong>Business:</strong> business@demo.com / demo123
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('rider@demo.com', 'demo123')}
              className="block w-full text-left p-2 rounded hover:bg-blue-100 transition-colors"
              disabled={loading}
            >
              <strong>Rider:</strong> rider@demo.com / demo123
            </button>
            <button
              type="button"
              onClick={() => fillDemoCredentials('admin@demo.com', 'demo123')}
              className="block w-full text-left p-2 rounded hover:bg-blue-100 transition-colors"
              disabled={loading}
            >
              <strong>Admin:</strong> admin@demo.com / demo123
            </button>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            <p>👆 Click on any credential to auto-fill the form</p>
          </div>
        </div>
      </div>

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
  );
}