/**
 * Forgot password API route
 * POST /api/auth/forgot-password
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { VerificationToken } from '@/lib/models/VerificationToken';
import { generateSecureToken, hashToken } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { validateForgotPasswordRequest, ForgotPasswordRequest } from '@/lib/types';

/**
 * Handle forgot password request
 */
async function handleForgotPassword(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateForgotPasswordRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const { email }: ForgotPasswordRequest = body;

    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration attacks
    const successResponse = {
      message: 'If the email exists in our system, a password reset link has been sent.',
      email: email.toLowerCase()
    };

    if (!user) {
      return ApiResponseHelpers.success(successResponse, 'Password reset email sent');
    }

    // Check if user account is active
    if (!user.isActive) {
      return ApiResponseHelpers.success(successResponse, 'Password reset email sent');
    }

    // Check for existing password reset tokens and rate limiting
    const existingTokens = await VerificationToken.find({
      userId: user._id,
      type: 'password_reset',
      createdAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 minutes
    });

    if (existingTokens.length >= 3) {
      return ApiResponseHelpers.tooManyRequests(
        'Too many password reset requests. Please wait 15 minutes before requesting another.'
      );
    }

    // Delete any existing password reset tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'password_reset'
    });

    // Generate password reset token
    const resetToken = generateSecureToken(32);
    const hashedResetToken = hashToken(resetToken);

    // Create password reset token record
    const tokenRecord = new VerificationToken({
      userId: user._id,
      token: hashedResetToken,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });

    await tokenRecord.save();

    // TODO: Send password reset email
    // await sendPasswordResetEmail(user.email, resetToken);

    // Log the password reset request
    console.log(`Password reset requested for user: ${user.email}`);

    return ApiResponseHelpers.success(successResponse, 'Password reset email sent');

  } catch (error) {
    console.error('Forgot password error:', error);
    return ApiResponseHelpers.internalError('Failed to process password reset request');
  }
}

/**
 * POST handler for forgot password
 */
export const POST = withErrorHandling(handleForgotPassword);

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