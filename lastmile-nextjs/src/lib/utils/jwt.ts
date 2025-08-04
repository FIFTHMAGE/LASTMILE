/**
 * JWT utility functions
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

// Token blacklist for logout functionality
class TokenBlacklistService {
  private blacklistedTokens = new Set<string>();

  addToken(token: string): void {
    this.blacklistedTokens.add(token);
  }

  isBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  removeToken(token: string): void {
    this.blacklistedTokens.delete(token);
  }

  clear(): void {
    this.blacklistedTokens.clear();
  }
}

export const TokenBlacklist = new TokenBlacklistService();

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload {
  try {
    if (TokenBlacklist.isBlacklisted(token)) {
      throw new Error('Token has been revoked');
    }
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Legacy aliases for backward compatibility
export const generateToken = signToken;
export const verifyJWT = verifyToken;

// Generate secure token for password reset, email verification, etc.
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash token for secure storage
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate refresh token
export function generateRefreshToken(userId: string): string {
  const tokenId = crypto.randomUUID();
  const payload: RefreshTokenPayload = {
    userId,
    tokenId
  };
  
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

// Verify refresh token
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

// Token utilities collection
export const TokenUtils = {
  sign: signToken,
  verify: verifyToken,
  decode: decodeToken,
  generate: generateToken,
  verifyJWT,
  generateSecure: generateSecureToken,
  hash: hashToken,
  generateRefresh: generateRefreshToken,
  verifyRefresh: verifyRefreshToken,
  extractFromHeader: extractTokenFromHeader,
  blacklist: TokenBlacklist
};