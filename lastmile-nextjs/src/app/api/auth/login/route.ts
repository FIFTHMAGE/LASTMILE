/**
 * Authentication login API route
 * POST /api/auth/login
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { comparePassword } from '@/lib/utils/bcrypt';
import { generateToken } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { validateLoginRequest, LoginRequest, LoginResponse } from '@/lib/types';

/**
 * Handle user login
 */
async function handleLogin(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateLoginRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const { email, password }: LoginRequest = body;

    // Connect to database
    await connectDB();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return ApiResponseHelpers.unauthorized('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return ApiResponseHelpers.unauthorized('Invalid email or password');
    }

    // Check if user account is active
    if (!user.isActive) {
      return ApiResponseHelpers.forbidden('Account has been deactivated. Please contact support.');
    }

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    });

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Prepare response data
    const responseData: LoginResponse = {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    };

    return ApiResponseHelpers.success(responseData, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return ApiResponseHelpers.internalError('Login failed');
  }
}

/**
 * POST handler for login
 */
export const POST = withErrorHandling(handleLogin);

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