/**
 * Business registration API route
 * POST /api/auth/register/business
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { VerificationToken } from '@/lib/models/VerificationToken';
import { hashPassword } from '@/lib/utils/bcrypt';
import { generateToken, generateSecureToken, hashToken } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { 
  validateBusinessRegistrationRequest, 
  BusinessRegistrationRequest, 
  RegistrationResponse 
} from '@/lib/types';

/**
 * Handle business user registration
 */
async function handleBusinessRegistration(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateBusinessRegistrationRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const registrationData: BusinessRegistrationRequest = body;

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ 
      email: registrationData.email.toLowerCase() 
    });
    
    if (existingUser) {
      return ApiResponseHelpers.conflict('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(registrationData.password);

    // Create business profile
    const businessProfile = {
      businessName: registrationData.businessName,
      businessType: registrationData.businessType,
      businessAddress: registrationData.businessAddress,
      contactPhone: registrationData.contactPhone,
      businessHours: registrationData.businessHours || {
        monday: { open: '09:00', close: '17:00', isOpen: true },
        tuesday: { open: '09:00', close: '17:00', isOpen: true },
        wednesday: { open: '09:00', close: '17:00', isOpen: true },
        thursday: { open: '09:00', close: '17:00', isOpen: true },
        friday: { open: '09:00', close: '17:00', isOpen: true },
        saturday: { open: '09:00', close: '17:00', isOpen: false },
        sunday: { open: '09:00', close: '17:00', isOpen: false }
      },
      description: registrationData.description,
      website: registrationData.website,
      socialMedia: registrationData.socialMedia || {}
    };

    // Create new business user
    const newUser = new User({
      email: registrationData.email.toLowerCase(),
      password: hashedPassword,
      role: 'business',
      profile: businessProfile,
      isVerified: false,
      isActive: true,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        privacy: {
          showProfile: true,
          showLocation: true,
          allowContact: true
        }
      }
    });

    // Save user to database
    await newUser.save();

    // Generate email verification token
    const verificationToken = generateSecureToken(32);
    const hashedVerificationToken = hashToken(verificationToken);

    // Create verification token record
    const tokenRecord = new VerificationToken({
      userId: newUser._id,
      token: hashedVerificationToken,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await tokenRecord.save();

    // Generate JWT token for immediate login (optional - some apps require email verification first)
    const jwtToken = generateToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
      isVerified: newUser.isVerified
    });

    // TODO: Send verification email
    // await sendVerificationEmail(newUser.email, verificationToken);

    // Prepare response data
    const responseData: RegistrationResponse = {
      token: jwtToken,
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        isActive: newUser.isActive,
        profile: newUser.profile,
        createdAt: newUser.createdAt
      },
      verificationRequired: true,
      message: 'Business account created successfully. Please check your email to verify your account.'
    };

    return ApiResponseHelpers.created(responseData, 'Business registration successful');

  } catch (error) {
    console.error('Business registration error:', error);
    
    // Handle duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return ApiResponseHelpers.conflict('User with this email already exists');
    }
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Registration failed');
  }
}

/**
 * POST handler for business registration
 */
export const POST = withErrorHandling(handleBusinessRegistration);

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