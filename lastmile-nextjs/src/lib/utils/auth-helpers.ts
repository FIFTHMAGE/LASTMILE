/**
 * Authentication helper utilities for client-side and server-side operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractTokenFromHeader } from './jwt';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';

const TOKEN_KEY = 'lastmile_auth_token';
const COOKIE_NAME = 'lastmile_auth';

export class ClientAuthUtils {
  /**
   * Store authentication token in localStorage
   */
  static setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  /**
   * Get authentication token from localStorage
   */
  static getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }

  /**
   * Remove authentication token from localStorage
   */
  static removeAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  /**
   * Store authentication token in cookie
   */
  static setAuthCookie(token: string, days: number = 7): void {
    if (typeof window !== 'undefined') {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${COOKIE_NAME}=${token};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
    }
  }

  /**
   * Get authentication token from cookie
   */
  static getAuthCookie(): string | null {
    if (typeof window !== 'undefined') {
      const name = COOKIE_NAME + '=';
      const decodedCookie = decodeURIComponent(document.cookie);
      const ca = decodedCookie.split(';');
      
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
          c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
          return c.substring(name.length, c.length);
        }
      }
    }
    return null;
  }

  /**
   * Remove authentication cookie
   */
  static removeAuthCookie(): void {
    if (typeof window !== 'undefined') {
      document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!(this.getAuthToken() || this.getAuthCookie());
  }

  /**
   * Decode JWT token (client-side only, for non-sensitive data)
   */
  static decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  }

  /**
   * Get user info from token (client-side only)
   */
  static getUserFromToken(): any {
    const token = this.getAuthToken() || this.getAuthCookie();
    if (!token || this.isTokenExpired(token)) {
      return null;
    }
    
    return this.decodeToken(token);
  }

  /**
   * Clear all authentication data
   */
  static clearAuth(): void {
    this.removeAuthToken();
    this.removeAuthCookie();
  }
}

// Server-side authentication utilities

/**
 * Get user from request token
 */
export async function getUserFromRequest(request: NextRequest): Promise<any> {
  try {
    const token = extractTokenFromHeader(request);
    if (!token) {
      return null;
    }

    const payload = verifyJWT(token);
    await connectDB();
    
    const user = await User.findById(payload.userId).select('-password');
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Higher-order function to protect API routes with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const user = await getUserFromRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Add user to request context (if needed)
      (request as any).user = user;
      
      return await handler(request, ...args);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Higher-order function to protect API routes with role-based access
 */
export function withRole(
  roles: string | string[],
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return withAuth(async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const user = (request as any).user;
    
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return await handler(request, ...args);
  });
}

/**
 * Higher-order function to require email verification
 */
export function requireVerification(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const user = (request as any).user;
    
    if (!user.isEmailVerified) {
      return NextResponse.json(
        { success: false, error: 'Email verification required' },
        { status: 403 }
      );
    }

    return await handler(request, ...args);
  });
}

/**
 * Higher-order function to require resource ownership
 */
export function requireOwnership(
  getResourceUserId: (request: NextRequest, ...args: any[]) => Promise<string>,
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const user = (request as any).user;
    
    try {
      const resourceUserId = await getResourceUserId(request, ...args);
      
      if (user._id.toString() !== resourceUserId && user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      return await handler(request, ...args);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Resource access validation failed' },
        { status: 500 }
      );
    }
  });
}