/**
 * Authentication test page for testing auth components and hooks
 */
'use client';

import React from 'react';
import { useAuth, useRole, useIsAuthenticated, useIsVerified } from '@/hooks/useAuth';
import { 
  AuthStatus, 
  UserGreeting, 
  VerificationStatus,
  ProtectedRoute,
  RoleGuard,
  VerificationGuard 
} from '@/components/auth';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';

export default function AuthTestPage() {
  const { user, loading, logout } = useAuth();
  const isAdmin = useRole('admin');
  const isBusiness = useRole('business');
  const isRider = useRole('rider');
  const isAuthenticated = useIsAuthenticated();
  const isVerified = useIsVerified();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Authentication Test Page</h1>
        <p className="text-gray-600">Test authentication components and hooks</p>
      </div>

      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Loading:</strong> <Badge variant={loading ? 'warning' : 'success'}>{loading ? 'Yes' : 'No'}</Badge>
            </div>
            <div>
              <strong>Authenticated:</strong> <Badge variant={isAuthenticated ? 'success' : 'error'}>{isAuthenticated ? 'Yes' : 'No'}</Badge>
            </div>
            <div>
              <strong>Verified:</strong> <Badge variant={isVerified ? 'success' : 'warning'}>{isVerified ? 'Yes' : 'No'}</Badge>
            </div>
            <div>
              <strong>Role:</strong> <Badge variant="info">{user?.role || 'None'}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div><strong>Is Admin:</strong> <Badge variant={isAdmin ? 'success' : 'secondary'}>{isAdmin ? 'Yes' : 'No'}</Badge></div>
            <div><strong>Is Business:</strong> <Badge variant={isBusiness ? 'success' : 'secondary'}>{isBusiness ? 'Yes' : 'No'}</Badge></div>
            <div><strong>Is Rider:</strong> <Badge variant={isRider ? 'success' : 'secondary'}>{isRider ? 'Yes' : 'No'}</Badge></div>
          </div>

          {user && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium mb-2">User Data:</h4>
              <pre className="text-sm text-gray-600 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth Components */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Auth Status Component:</h4>
            <AuthStatus />
          </div>

          <div>
            <h4 className="font-medium mb-2">User Greeting Component:</h4>
            <UserGreeting />
          </div>

          <div>
            <h4 className="font-medium mb-2">Verification Status Component:</h4>
            <VerificationStatus />
          </div>
        </CardContent>
      </Card>

      {/* Role Guards */}
      <Card>
        <CardHeader>
          <CardTitle>Role Guards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Admin Only Content:</h4>
            <RoleGuard 
              requiredRoles={['admin']} 
              fallback={<Badge variant="error">Access Denied - Admin Only</Badge>}
            >
              <Badge variant="success">✓ You have admin access!</Badge>
            </RoleGuard>
          </div>

          <div>
            <h4 className="font-medium mb-2">Business Only Content:</h4>
            <RoleGuard 
              requiredRoles={['business']} 
              fallback={<Badge variant="error">Access Denied - Business Only</Badge>}
            >
              <Badge variant="success">✓ You have business access!</Badge>
            </RoleGuard>
          </div>

          <div>
            <h4 className="font-medium mb-2">Rider Only Content:</h4>
            <RoleGuard 
              requiredRoles={['rider']} 
              fallback={<Badge variant="error">Access Denied - Rider Only</Badge>}
            >
              <Badge variant="success">✓ You have rider access!</Badge>
            </RoleGuard>
          </div>

          <div>
            <h4 className="font-medium mb-2">Business or Rider Content:</h4>
            <RoleGuard 
              requiredRoles={['business', 'rider']} 
              fallback={<Badge variant="error">Access Denied - Business or Rider Only</Badge>}
            >
              <Badge variant="success">✓ You have business or rider access!</Badge>
            </RoleGuard>
          </div>
        </CardContent>
      </Card>

      {/* Verification Guard */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Guard</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <h4 className="font-medium mb-2">Verified Users Only:</h4>
            <VerificationGuard fallback={<Badge variant="warning">Please verify your email to see this content</Badge>}>
              <Badge variant="success">✓ Your email is verified!</Badge>
            </VerificationGuard>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button variant="destructive" onClick={logout}>
                Logout
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button onClick={() => window.location.href = '/login'}>
                Login
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/register'}>
                Register
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}