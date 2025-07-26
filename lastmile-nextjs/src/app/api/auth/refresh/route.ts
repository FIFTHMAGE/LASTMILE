/**
 * Token refresh API route
 * POST /api/auth/refresh
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { 
  TokenUtils, 
  generateToken, 
  extractTokenFromHeader,
  TokenBlacklist,
  isTokenExpired 
} from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { validateRefreshTokenRequest, RefreshTokenRequest } from '@/lib/types';

/**
 * Handle token refresh
 */
async function handleTokenRefresh(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateRefreshTokenRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const { refreshToken }: RefreshTokenRequest = body;

    // Connect to database
    await connectDB();

    // Check if refresh token is blacklisted
    if (TokenBlacklist.isBlacklisted(refreshToken)) {
      return ApiResponseHelpers.unauthorized('Refresh token has been revoked');
    }

    // Verify refresh token
    let payload;
    try {
      payload = TokenUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      return ApiResponseHelpers.unauthorized('Invalid or expired refresh token');
    }

    // Find user to ensure they still exist and are active
    const user = await User.findById(payload.id);
    if (!user) {
      return ApiResponseHelpers.unauthorized('User not found');
    }

    if (!user.isActive) {
      return ApiResponseHelpers.forbidden('Account has been deactivated');
    }

    // Generate new access token
    const newAccessToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    // Generate new refresh token
    const newRefreshToken = TokenUtils.generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    // Add old refresh token to blacklist
    TokenBlacklist.addToBlacklist(refreshToken);

    // Update user's last activity
    user.lastActivity = new Date();
    await user.save();

    // Prepare response data
    const responseData = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive
      },
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    };

    return ApiResponseHelpers.success(responseData, 'Token refreshed successfully');

  } catch (error) {
    console.error('Token refresh error:', error);
    return ApiResponseHelpers.internalError('Token refresh failed');
  }
}

/**
 * POST handler for token refresh
 */
export const POST = withErrorHandling(handleTokenRefresh);

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}