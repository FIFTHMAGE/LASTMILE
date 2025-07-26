/**
 * Session management utilities
 */
import { ClientAuthUtils } from './auth-helpers';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  lastActivity: number;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'lastmile_session';
  private static readonly ACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  /**
   * Create a new session
   */
  static createSession(userData: Omit<SessionData, 'lastActivity'>): void {
    const sessionData: SessionData = {
      ...userData,
      lastActivity: Date.now(),
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    }
  }

  /**
   * Get current session data
   */
  static getSession(): SessionData | null {
    if (typeof window === 'undefined') return null;

    try {
      const sessionStr = localStorage.getItem(this.SESSION_KEY);
      if (!sessionStr) return null;

      const session: SessionData = JSON.parse(sessionStr);
      
      // Check if session is still valid
      if (this.isSessionExpired(session)) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      this.clearSession();
      return null;
    }
  }

  /**
   * Update session activity
   */
  static updateActivity(): void {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      }
    }
  }

  /**
   * Check if session is expired
   */
  static isSessionExpired(session: SessionData): boolean {
    const now = Date.now();
    return (now - session.lastActivity) > this.ACTIVITY_THRESHOLD;
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY);
    }
    ClientAuthUtils.clearAuth();
  }

  /**
   * Refresh session with new data
   */
  static refreshSession(userData: Partial<Omit<SessionData, 'lastActivity'>>): void {
    const currentSession = this.getSession();
    if (currentSession) {
      const updatedSession: SessionData = {
        ...currentSession,
        ...userData,
        lastActivity: Date.now(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedSession));
      }
    }
  }

  /**
   * Check if user is authenticated based on session
   */
  static isAuthenticated(): boolean {
    const session = this.getSession();
    return !!session && ClientAuthUtils.isAuthenticated();
  }

  /**
   * Get user role from session
   */
  static getUserRole(): string | null {
    const session = this.getSession();
    return session?.role || null;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Get user ID from session
   */
  static getUserId(): string | null {
    const session = this.getSession();
    return session?.userId || null;
  }

  /**
   * Check if user is verified
   */
  static isVerified(): boolean {
    const session = this.getSession();
    return !!session?.isVerified;
  }

  /**
   * Check if user is active
   */
  static isActive(): boolean {
    const session = this.getSession();
    return !!session?.isActive;
  }

  /**
   * Set up automatic session cleanup
   */
  static setupSessionCleanup(): void {
    if (typeof window === 'undefined') return;

    // Clean up expired sessions on page load
    const session = this.getSession();
    if (session && this.isSessionExpired(session)) {
      this.clearSession();
    }

    // Set up periodic cleanup
    setInterval(() => {
      const currentSession = this.getSession();
      if (currentSession && this.isSessionExpired(currentSession)) {
        this.clearSession();
        // Optionally redirect to login
        window.location.href = '/login';
      }
    }, 60000); // Check every minute

    // Update activity on user interactions
    const updateActivity = () => this.updateActivity();
    
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  /**
   * Get session time remaining in milliseconds
   */
  static getTimeRemaining(): number {
    const session = this.getSession();
    if (!session) return 0;

    const elapsed = Date.now() - session.lastActivity;
    const remaining = this.ACTIVITY_THRESHOLD - elapsed;
    
    return Math.max(0, remaining);
  }

  /**
   * Get session time remaining in human readable format
   */
  static getTimeRemainingFormatted(): string {
    const remaining = this.getTimeRemaining();
    if (remaining === 0) return 'Expired';

    const minutes = Math.floor(remaining / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}