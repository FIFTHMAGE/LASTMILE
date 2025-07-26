/**
 * Resend email verification API route
 * POST /api/auth/resend-verification
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { VerificationToken } from '@/lib/models/VerificationToken';
import { generateSecureToken, hashToken } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { validateResendVerificationRequest, ResendVerificationRequest } from '@/lib/types';
import { sendVerificationEmail } from '@/lib/utils/email';

/**
 * Handle resend email verification
 */
async function handleResendVerification(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateResendVerificationRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const { email }: ResendVerificationRequest = body;

    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return ApiResponseHelpers.success(
        { message: 'If the email exists in our system, a verification email has been sent.' },
        'Verification email sent'
      );
    }

    // Check if user is already verified
    if (user.isVerified) {
      return ApiResponseHelpers.success(
        { message: 'Email is already verified' },
        'Email already verified'
      );
    }

    // Check if user account is active
    if (!user.isActive) {
      return ApiResponseHelpers.forbidden('Account has been deactivated. Please contact support.');
    }

    // Check for existing verification tokens and rate limiting
    const existingTokens = await VerificationToken.find({
      userId: user._id,
      type: 'email_verification',
      createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });

    if (existingTokens.length >= 3) {
      return ApiResponseHelpers.tooManyRequests(
        'Too many verification emails sent. Please wait 5 minutes before requesting another.'
      );
    }

    // Delete any existing verification tokens for this user
    await VerificationToken.deleteMany({
      userId: user._id,
      type: 'email_verification'
    });

    // Generate new verification token
    const verificationToken = generateSecureToken(32);
    const hashedVerificationToken = hashToken(verificationToken);

    // Create new verification token record
    const tokenRecord = new VerificationToken({
      userId: user._id,
      token: hashedVerificationToken,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await tokenRecord.save();

    // Send verification email
    try {
      const emailSent = await sendVerificationEmail(user.email, user.name, verificationToken);
      if (!emailSent) {
        console.warn('Failed to send verification email, but continuing with success response');
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue with success response even if email fails
    }

    // Log the resend attempt
    console.log(`Verification email resent for user: ${user.email}`);

    // Prepare response data
    const responseData = {
      message: 'Verification email has been sent to your email address.',
      email: user.email,
      expiresIn: '24 hours'
    };

    return ApiResponseHelpers.success(responseData, 'Verification email sent successfully');

  } catch (error) {
    console.error('Resend verification error:', error);
    return ApiResponseHelpers.internalError('Failed to send verification email');
  }
}

/**
 * POST handler for resend verification
 */
export const POST = withErrorHandling(handleResendVerification);

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