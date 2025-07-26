# Authentication System

A comprehensive TypeScript-based authentication system for the LastMile delivery platform with role-based access control, token management, and protected routes.

## Overview

The authentication system provides:
- JWT-based authentication with automatic token refresh
- Role-based access control (Admin, Business, Rider)
- Protected routes and components
- Session management with activity tracking
- Email verification workflow
- Client-side and server-side authentication utilities
- TypeScript interfaces for type safety

## Core Components

### AuthContext & AuthProvider

The main authentication context that manages user state and provides authentication methods.

```tsx
import { AuthProviderWrapper } from '@/components/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

// Wrap your app with AuthProvider (already done in layout.tsx)
<AuthProviderWrapper>
  <App />
</AuthProviderWrapper>

// Use in components
const { user, login, logout, loading } = useAuth();
```

### Authentication Hooks

#### useAuth
Main hook for accessing authentication state and methods.

```tsx
import { useAuth } from '@/hooks/useAuth';

const { 
  user,           // Current user data
  loading,        // Loading state
  login,          // Login function
  logout,         // Logout function
  registerBusiness, // Business registration
  registerRider,  // Rider registration
  refreshUser,    // Refresh user data
  updateProfile   // Update user profile
} = useAuth();
```

#### Role-based Hooks

```tsx
import { 
  useRole, 
  useHasAnyRole, 
  useIsAuthenticated, 
  useIsVerified 
} from '@/hooks/useAuth';

const isAdmin = useRole('admin');
const isBusiness = useRole('business');
const isRider = useRole('rider');
const hasBusinessOrRiderRole = useHasAnyRole(['business', 'rider']);
const isAuthenticated = useIsAuthenticated();
const isVerified = useIsVerified();
```

### Protected Routes

#### ProtectedRoute Component

```tsx
import { ProtectedRoute } from '@/components/auth';

<ProtectedRoute 
  requiredRoles={['admin', 'business']}
  requireVerification={true}
  fallbackPath="/login"
>
  <AdminPanel />
</ProtectedRoute>
```

#### HOC Version

```tsx
import { withProtectedRoute } from '@/components/auth';

const ProtectedComponent = withProtectedRoute(MyComponent, {
  requiredRoles: ['business'],
  requireVerification: true
});
```

#### Role Guards

```tsx
import { RoleGuard, VerificationGuard } from '@/components/auth';

<RoleGuard 
  requiredRoles={['admin']} 
  fallback={<div>Access Denied</div>}
>
  <AdminOnlyContent />
</RoleGuard>

<VerificationGuard fallback={<div>Please verify your email</div>}>
  <VerifiedUserContent />
</VerificationGuard>
```

#### Guest Only Routes

```tsx
import { GuestOnly } from '@/components/auth';

<GuestOnly redirectPath="/dashboard">
  <LoginForm />
</GuestOnly>
```

### Authentication Status Components

#### AuthStatus
Displays current user information with avatar, role, and logout button.

```tsx
import { AuthStatus } from '@/components/auth';

<AuthStatus 
  showAvatar={true}
  showRole={true}
  showLogout={true}
/>
```

#### UserGreeting
Simple greeting component that shows personalized message.

```tsx
import { UserGreeting } from '@/components/auth';

<UserGreeting className="mb-4" />
// Outputs: "Good morning, John!"
```

#### VerificationStatus
Shows verification status and resend verification option.

```tsx
import { VerificationStatus } from '@/components/auth';

<VerificationStatus showActions={true} />
```

## API Route Protection

### Middleware Functions

```tsx
import { 
  withAuth, 
  withRole, 
  withAdmin, 
  withBusiness, 
  withRider 
} from '@/lib/middleware/auth';

// Basic authentication
export const GET = withAuth(async (request) => {
  const user = request.user; // User data available
  // Handle request
});

// Role-based protection
export const POST = withRole(['admin', 'business'], async (request) => {
  // Only admin and business users can access
});

// Specific role shortcuts
export const PUT = withAdmin(async (request) => {
  // Admin only
});

export const DELETE = withBusiness(async (request) => {
  // Business only
});
```

### Full Authentication Check

```tsx
import { withFullAuth } from '@/lib/middleware/auth';

export const POST = withFullAuth(
  ['business'], // Required roles
  true,         // Require verification
  true          // Require active account
)(async (request) => {
  // Fully authenticated business user
});
```

## Session Management

### SessionManager Utility

```tsx
import { SessionManager } from '@/lib/utils/session';

// Check authentication
const isAuth = SessionManager.isAuthenticated();

// Get user role
const role = SessionManager.getUserRole();

// Check specific role
const isAdmin = SessionManager.hasRole('admin');

// Get session time remaining
const timeLeft = SessionManager.getTimeRemainingFormatted();

// Set up automatic cleanup
SessionManager.setupSessionCleanup();
```

## Authentication Utilities

### Client-side Utilities

```tsx
import { ClientAuthUtils } from '@/lib/utils/auth-helpers';

// Token management
ClientAuthUtils.setAuthToken(token);
const token = ClientAuthUtils.getAuthToken();
ClientAuthUtils.removeAuthToken();

// Cookie management
ClientAuthUtils.setAuthCookie(token);
const cookieToken = ClientAuthUtils.getAuthCookie();

// Token validation
const isExpired = ClientAuthUtils.isTokenExpired(token);
const userData = ClientAuthUtils.getUserFromToken();

// Clear all auth data
ClientAuthUtils.clearAuth();
```

### General Auth Utilities

```tsx
import { 
  hasPermission, 
  isAdmin, 
  getDashboardPath, 
  validatePassword,
  formatUserDisplayName 
} from '@/lib/utils/auth';

// Permission checking
const canAccess = hasPermission(userRole, ['admin', 'business']);

// Role checking
const adminCheck = isAdmin(userRole);

// Get appropriate dashboard
const dashboardUrl = getDashboardPath(userRole);

// Password validation
const { isValid, errors } = validatePassword(password);

// User display name
const displayName = formatUserDisplayName(user);
```

## Usage Examples

### Login Flow

```tsx
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/forms';

const LoginPage = () => {
  const { login, loading } = useAuth();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials);
      // User will be redirected automatically
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return <LoginForm onSubmit={handleLogin} loading={loading} />;
};
```

### Protected Dashboard

```tsx
import { ProtectedRoute, UserGreeting } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <ProtectedRoute requireVerification>
      <div>
        <UserGreeting />
        <h2>Welcome to your {user?.role} dashboard!</h2>
      </div>
    </ProtectedRoute>
  );
};
```

### Role-based Navigation

```tsx
import { RoleGuard } from '@/components/auth';

const Navigation = () => (
  <nav>
    <Link href="/dashboard">Dashboard</Link>
    
    <RoleGuard requiredRoles={['business']}>
      <Link href="/create-offer">Create Offer</Link>
    </RoleGuard>
    
    <RoleGuard requiredRoles={['rider']}>
      <Link href="/available-offers">Available Offers</Link>
    </RoleGuard>
    
    <RoleGuard requiredRoles={['admin']}>
      <Link href="/admin">Admin Panel</Link>
    </RoleGuard>
  </nav>
);
```

## User Roles

### Admin
- Full system access
- User management
- System configuration
- Analytics and reporting

### Business
- Create and manage delivery offers
- View delivery history
- Manage business profile
- Payment management

### Rider
- View and accept delivery offers
- Track deliveries
- Manage rider profile
- Earnings tracking

## Security Features

- JWT tokens with expiration
- Automatic token refresh
- Session timeout with activity tracking
- Role-based access control
- Email verification requirement
- Account activation/deactivation
- Secure password requirements
- CSRF protection
- XSS protection

## Testing

Visit `/auth-test` to test all authentication components and hooks in a comprehensive interface.

## Environment Variables

```env
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Error Handling

The system includes comprehensive error handling:
- Invalid token errors
- Expired session handling
- Network error recovery
- Automatic logout on auth failures
- Toast notifications for user feedback

## TypeScript Support

All components and utilities are fully typed with TypeScript interfaces for:
- User data structures
- Authentication state
- API responses
- Component props
- Hook return types