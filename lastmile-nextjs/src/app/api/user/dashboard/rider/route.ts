/**
 * Rider dashboard data API route
 * GET /api/user/dashboard/rider - Get rider dashboard data
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { Offer } from '@/lib/models/Offer';
import { Payment } from '@/lib/models/Payment';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';
import { RiderDashboardResponse } from '@/lib/types';

/**
 * GET handler - Get rider dashboard data
 */
async function handleGetRiderDashboard(request: NextRequest, user: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30'; // Default 30 days
    const days = parseInt(timeRange);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get rider user data
    const rider = await User.findById(user.id).select('profile email createdAt');
    if (!rider) {
      return ApiResponseHelpers.notFound('Rider');
    }

    // Get current active delivery
    const activeDelivery = await Offer.findOne({
      riderId: user.id,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    })
    .populate('businessId', 'profile.businessName email')
    .lean();

    // Aggregate delivery statistics
    const deliveryStats = await Offer.aggregate([
      {
        $match: {
          riderId: rider._id,
      recentDeliveries,
      deliveriesByStatus,
      monthlyDeliveries,
      totalEarnings,
      thisMonthEarnings,
      recentPayments
    ] = await Promise.all([
      // Total deliveries count
      Offer.countDocuments({ riderId: user.id }),
      
      // Completed deliverie