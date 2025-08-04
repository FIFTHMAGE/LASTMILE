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

    // Get basic statistics
    const [
      totalDeliveries,
      completedDeliveries,
      recentDeliveries,
      totalEarnings,
      thisMonthEarnings,
      recentPayments
    ] = await Promise.all([
      // Total deliveries count
      Offer.countDocuments({ riderId: user.id }),
      
      // Completed deliveries
      Offer.countDocuments({ 
        riderId: user.id, 
        status: 'delivered',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      
      // Recent deliveries
      Offer.find({ 
        riderId: user.id,
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .populate('businessId', 'profile.businessName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
      
      // Total earnings
      Payment.aggregate([
        {
          $match: {
            riderId: user.id,
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // This month earnings
      Payment.aggregate([
        {
          $match: {
            riderId: user.id,
            status: 'completed',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      
      // Recent payments
      Payment.find({ 
        riderId: user.id,
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
    ]);

    // Format response data
    const dashboardData = {
      rider: {
        id: rider._id,
        email: rider.email,
        profile: rider.profile,
        joinedAt: rider.createdAt
      },
      activeDelivery,
      stats: {
        totalDeliveries,
        completedDeliveries,
        totalEarnings: totalEarnings[0]?.total || 0,
        thisMonthEarnings: thisMonthEarnings[0]?.total || 0,
        completionRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0
      },
      recentDeliveries: recentDeliveries.map(delivery => ({
        id: delivery._id,
        businessName: delivery.businessId?.profile?.businessName || 'Unknown Business',
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        status: delivery.status,
        amount: delivery.amount,
        createdAt: delivery.createdAt
      })),
      recentPayments: recentPayments.map(payment => ({
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt
      }))
    };

    return ApiResponseHelpers.success(dashboardData);

  } catch (error) {
    console.error('Error fetching rider dashboard data:', error);
    return ApiResponseHelpers.error('Failed to fetch dashboard data');
  }
}

// Export the GET handler with role protection
export const GET = withErrorHandling(
  withRole(handleGetRiderDashboard, ['rider'])
);