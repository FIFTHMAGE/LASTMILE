/**
 * User profile API routes
 * GET /api/user/profile - Get user profile
 * PUT /api/user/profile - Update user profile
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { hashPassword, comparePassword } from '@/lib/utils/bcrypt';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withAuth, requireVerification } from '@/lib/utils/auth-helpers';
import { 
  validateUpdateProfileRequest,
  UpdateProfileRequest,
  UserProfileResponse
} from '@/lib/types';

/**
 * GET handler - Get user profile
 */
async function handleGetProfile(request: NextRequest, user: any) {
  try {
    await connectDB();

    // Find user with full profile data
    const userData = await User.findById(user.id).select('-password');
    
    if (!userData) {
      return ApiResponseHelpers.notFound('User');
    }

    // Transform user data for response
    const profileResponse: UserProfileResponse = {
      id: userData._id.toString(),
      email: userData.email,
      role: userData.role,
      isVerified: userData.isVerified,
      isActive: userData.isActive,
      profile: userData.profile,
      preferences: userData.preferences,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLogin: userData.lastLogin,
      emailVerifiedAt: userData.emailVerifiedAt
    };

    return ApiResponseHelpers.success(profileResponse, 'Profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve profile');
  }
}

/**
 * PUT handler - Update user profile
 */
async function handleUpdateProfile(request: NextRequest, user: any) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request data
    const validation = validateUpdateProfileRequest(body);
    if (!validation.isValid) {
      return ApiResponseHelpers.validationError(validation.errors);
    }

    const updateData: UpdateProfileRequest = body;

    await connectDB();

    // Find user
    const userData = await User.findById(user.id);
    if (!userData) {
      return ApiResponseHelpers.notFound('User');
    }

    // Prepare update fields
    const updateFields: any = {};

    // Handle email update
    if (updateData.email && updateData.email !== userData.email) {
      // Check if new email is already taken
      const existingUser = await User.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: user.id }
      });
      
      if (existingUser) {
        return ApiResponseHelpers.conflict('Email is already in use');
      }

      updateFields.email = updateData.email.toLowerCase();
      updateFields.isVerified = false; // Require re-verification for new email
      updateFields.emailVerifiedAt = null;
    }

    // Handle password update
    if (updateData.currentPassword && updateData.newPassword) {
      // Verify current password
      const isCurrentPasswordValid = await comparePassword(
        updateData.currentPassword, 
        userData.password
      );
      
      if (!isCurrentPasswordValid) {
        return ApiResponseHelpers.badRequest('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(updateData.newPassword);
      updateFields.password = hashedNewPassword;
      updateFields.passwordChangedAt = new Date();
    }

    // Handle profile updates based on user role
    if (updateData.profile) {
      const currentProfile = userData.profile || {};
      
      if (userData.role === 'business') {
        // Business profile updates
        const businessProfile = {
          ...currentProfile,
          ...updateData.profile,
          businessHours: updateData.profile.businessHours || currentProfile.businessHours,
          socialMedia: updateData.profile.socialMedia || currentProfile.socialMedia
        };
        updateFields.profile = businessProfile;
      } else if (userData.role === 'rider') {
        // Rider profile updates
        const riderProfile = {
          ...currentProfile,
          ...updateData.profile,
          vehicleInfo: updateData.profile.vehicleInfo || currentProfile.vehicleInfo,
          documents: updateData.profile.documents || currentProfile.documents,
          availability: updateData.profile.availability || currentProfile.availability,
          bankAccount: updateData.profile.bankAccount || currentProfile.bankAccount
        };
        updateFields.profile = riderProfile;
      }
    }

    // Handle preferences update
    if (updateData.preferences) {
      const currentPreferences = userData.preferences || {};
      updateFields.preferences = {
        ...currentPreferences,
        ...updateData.preferences,
        notifications: {
          ...currentPreferences.notifications,
          ...updateData.preferences.notifications
        },
        privacy: {
          ...currentPreferences.privacy,
          ...updateData.preferences.privacy
        }
      };
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return ApiResponseHelpers.internalError('Failed to update profile');
    }

    // Transform updated user data for response
    const profileResponse: UserProfileResponse = {
      id: updatedUser._id.toString(),
      email: updatedUser.email,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      isActive: updatedUser.isActive,
      profile: updatedUser.profile,
      preferences: updatedUser.preferences,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLogin: updatedUser.lastLogin,
      emailVerifiedAt: updatedUser.emailVerifiedAt,
      passwordChangedAt: updatedUser.passwordChangedAt
    };

    // TODO: Send email verification if email was changed
    // if (updateData.email && updateData.email !== userData.email) {
    //   await sendEmailVerification(updatedUser.email);
    // }

    return ApiResponseHelpers.success(profileResponse, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle validation errors
    if (error instanceof Error && error.name === 'ValidationError') {
      return ApiResponseHelpers.validationError([error.message]);
    }

    return ApiResponseHelpers.internalError('Failed to update profile');
  }
}

/**
 * Route handlers with authentication
 */
export const GET = withAuth(handleGetProfile);
export const PUT = withAuth(handleUpdateProfile);

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}