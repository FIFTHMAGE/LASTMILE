/**
 * User logout API route
 * POST /api/auth/logout
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { TokenBlacklist, extractTokenFromHeader } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { getUserFromRequest } from '@/lib/utils/auth-helpers';

/**
 * Handle user logout
 */
async function handleLogout(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();

    // Get user from request (set by middleware)
    const user = getUserFromRequest(request);
    if (!user) {
      return ApiResponseHelpers.unauthorized('Authentication required');
    }

    // Get the token from the request
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      // Add token to blacklist to invalidate it
      TokenBlacklist.addToBlacklist(token);
    }

    // Update user's last logout timestamp
    try {
      await User.findByIdAndUpdate(user.id, {
        lastLogout: new Date()
      });
    } catch (dbError) {
      // Don't fail logout if database update fails
      console.error('Failed to update last logout timestamp:', dbError);
    }

    // Clean up expired tokens from blacklist
    TokenBlacklist.cleanupExpiredTokens();

    // Log the logout
    console.log(`User logged out: ${user.email}`);

    return ApiResponseHelpers.success(
      { 
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
      },
      'Logout successful'
    );

  } catch (error) {
    console.error('Logout error:', error);
    return ApiResponseHelpers.internalError('Logout failed');
  }
}

/**
 * POST handler for logout
 */
export const POST = withErrorHandling(handleLogout);

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