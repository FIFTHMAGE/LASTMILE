/**
 * Email verification API route
 * POST /api/auth/verify-email
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { VerificationToken } from '@/lib/models/VerificationToken';
import { hashToken, generateToken } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { validateEmailVerificationRequest, EmailVerificationRequest } from '@/lib/types';

/**
 * Handle email verification
 */
async function handleEmailVerification(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateEmailVerificationRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const { token, email }: EmailVerificationRequest = body;

    // Connect to database
    await connectDB();

    // Hash the provided token to match stored hash
    const hashedToken = hashToken(token);

    // Find the verification token
    const verificationRecord = await VerificationToken.findOne({
      token: hashedToken,
      type: 'email_verification',
      expiresAt: { $gt: new Date() }
    }).populate('userId');

    if (!verificationRecord) {
      return ApiResponseHelpers.badRequest('Invalid or expired verification token');
    }

    // Find the user
    const user = await User.findById(verificationRecord.userId);
    if (!user) {
      return ApiResponseHelpers.notFound('User');
    }

    // Verify email matches (optional additional security check)
    if (email && user.email !== email.toLowerCase()) {
      return ApiResponseHelpers.badRequest('Email does not match verification token');
    }

    // Check if user is already verified
    if (user.isVerified) {
      return ApiResponseHelpers.success(
        { 
          message: 'Email is already verified',
          user: {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            isActive: user.isActive
          }
        },
        'Email already verified'
      );
    }

    // Mark user as verified
    user.isVerified = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    // Delete the verification token (it's been used)
    await VerificationToken.findByIdAndDelete(verificationRecord._id);

    // Generate new JWT token with updated verification status
    const jwtToken = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    // Prepare response data
    const responseData = {
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        profile: user.profile,
        createdAt: user.createdAt,
        emailVerifiedAt: user.emailVerifiedAt
      },
      message: 'Email verified successfully'
    };

    return ApiResponseHelpers.success(responseData, 'Email verification successful');

  } catch (error) {
    console.error('Email verification error:', error);
    return ApiResponseHelpers.internalError('Email verification failed');
  }
}

/**
 * POST handler for email verification
 */
export const POST = withErrorHandling(handleEmailVerification);

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