/**
 * Authentication helper utilities for client-side operations
 */

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