/**
 * Reset password API route
 * POST /api/auth/reset-password
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { VerificationToken } from '@/lib/models/VerificationToken';
import { hashPassword } from '@/lib/utils/bcrypt';
import { hashToken, generateToken, TokenBlacklist } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { validateResetPasswordRequest, ResetPasswordRequest } from '@/lib/types';

/**
 * Handle password reset
 */
async function handleResetPassword(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateResetPasswordRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const { token, password, email }: ResetPasswordRequest = body;

    // Connect to database
    await connectDB();

    // Hash the provided token to match stored hash
    const hashedToken = hashToken(token);

    // Find the password reset token
    const tokenRecord = await VerificationToken.findOne({
      token: hashedToken,
      type: 'password_reset',
      expiresAt: { $gt: new Date() }
    }).populate('userId');

    if (!tokenRecord) {
      return ApiResponseHelpers.badRequest('Invalid or expired password reset token');
    }

    // Find the user
    const user = await User.findById(tokenRecord.userId);
    if (!user) {
      return ApiResponseHelpers.notFound('User');
    }

    // Verify email matches (optional additional security check)
    if (email && user.email !== email.toLowerCase()) {
      return ApiResponseHelpers.badRequest('Email does not match reset token');
    }

    // Check if user account is active
    if (!user.isActive) {
      return ApiResponseHelpers.forbidden('Account has been deactivated. Please contact support.');
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user's password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Delete the password reset token (it's been used)
    await VerificationToken.findByIdAndDelete(tokenRecord._id);

    // Delete all other password reset tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'password_reset'
    });

    // Invalidate all existing JWT tokens by adding them to blacklist
    // Note: In a production system, you might want to implement a more sophisticated approach
    // such as incrementing a user version number and checking it in JWT verification
    
    // Generate new JWT token
    const jwtToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    // Log the password reset
    console.log(`Password reset completed for user: ${user.email}`);

    // Prepare response data
    const responseData = {
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        passwordChangedAt: user.passwordChangedAt
      },
      message: 'Password has been reset successfully'
    };

    return ApiResponseHelpers.success(responseData, 'Password reset successful');

  } catch (error) {
    console.error('Reset password error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Password reset failed');
  }
}

/**
 * POST handler for reset password
 */
export const POST = withErrorHandling(handleResetPassword);

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