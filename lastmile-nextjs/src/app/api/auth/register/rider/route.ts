/**
 * Rider registration API route
 * POST /api/auth/register/rider
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { VerificationToken } from '@/lib/models/VerificationToken';
import { hashPassword } from '@/lib/utils/bcrypt';
import { generateToken, generateSecureToken, hashToken } from '@/lib/utils/jwt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { 
  validateRiderRegistrationRequest, 
  RiderRegistrationRequest, 
  RegistrationResponse 
} from '@/lib/types';

/**
 * Handle rider user registration
 */
async function handleRiderRegistration(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateRiderRegistrationRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const registrationData: RiderRegistrationRequest = body;

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

    // Create rider profile
    const riderProfile = {
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      phone: registrationData.phone,
      dateOfBirth: registrationData.dateOfBirth ? new Date(registrationData.dateOfBirth) : undefined,
      address: registrationData.address,
      vehicleInfo: {
        type: registrationData.vehicleType,
        make: registrationData.vehicleMake,
        model: registrationData.vehicleModel,
        year: registrationData.vehicleYear,
        licensePlate: registrationData.licensePlate,
        color: registrationData.vehicleColor
      },
      documents: {
        driverLicense: {
          number: registrationData.driverLicenseNumber,
          expiryDate: registrationData.driverLicenseExpiry ? new Date(registrationData.driverLicenseExpiry) : undefined,
          isVerified: false
        },
        insurance: {
          provider: registrationData.insuranceProvider,
          policyNumber: registrationData.insurancePolicyNumber,
          expiryDate: registrationData.insuranceExpiry ? new Date(registrationData.insuranceExpiry) : undefined,
          isVerified: false
        }
      },
      availability: {
        isAvailable: false,
        workingHours: registrationData.workingHours || {
          monday: { start: '09:00', end: '17:00', isWorking: true },
          tuesday: { start: '09:00', end: '17:00', isWorking: true },
          wednesday: { start: '09:00', end: '17:00', isWorking: true },
          thursday: { start: '09:00', end: '17:00', isWorking: true },
          friday: { start: '09:00', end: '17:00', isWorking: true },
          saturday: { start: '09:00', end: '17:00', isWorking: false },
          sunday: { start: '09:00', end: '17:00', isWorking: false }
        }
      },
      rating: {
        average: 0,
        count: 0
      },
      earnings: {
        total: 0,
        thisMonth: 0,
        lastPayout: null
      },
      bankAccount: registrationData.bankAccount ? {
        accountNumber: registrationData.bankAccount.accountNumber,
        routingNumber: registrationData.bankAccount.routingNumber,
        accountHolderName: registrationData.bankAccount.accountHolderName,
        bankName: registrationData.bankAccount.bankName,
        isVerified: false
      } : undefined
    };

    // Create new rider user
    const newUser = new User({
      email: registrationData.email.toLowerCase(),
      password: hashedPassword,
      role: 'rider',
      profile: riderProfile,
      isVerified: false,
      isActive: true,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: registrationData.phone ? true : false
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
      message: 'Rider account created successfully. Please check your email to verify your account.'
    };

    return ApiResponseHelpers.created(responseData, 'Rider registration successful');

  } catch (error) {
    console.error('Rider registration error:', error);
    
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
 * POST handler for rider registration
 */
export const POST = withErrorHandling(handleRiderRegistration);

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