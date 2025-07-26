/**
 * Authentication components exports
 */
export { AuthStatus, UserGreeting, VerificationStatus } from './AuthStatus';
export { 
  ProtectedRoute, 
  withProtectedRoute, 
  RoleGuard, 
  VerificationGuard, 
  GuestOnly 
} from './ProtectedRoute';

export type { 
  AuthStatusProps, 
  UserGreetingProps, 
  VerificationStatusProps 
} from './AuthStatus';

export type { 
  ProtectedRouteProps, 
  RoleGuardProps, 
  VerificationGuardProps, 
  GuestOnlyProps 
} from './ProtectedRoute';