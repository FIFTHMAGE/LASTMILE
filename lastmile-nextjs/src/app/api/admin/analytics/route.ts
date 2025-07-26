/**
 * Admin analytics API route
 * GET /api/admin/analytics - Get system analytics and statistics (admin only)
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { Offer } from '@/lib/models/Offer';
import { Payment } from '@/lib/models/Payment';
import { Notification } from '@/lib/models/Notification';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';

/**
 * GET handler - Get system analytics (admin only)
 */
async function handleGetAnalytics(request: NextRequest, user: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // Default 30 days
    const periodDays = parseInt(period);

    if (periodDays < 1 || periodDays > 365) {
      return ApiResponseHelpers.badRequest('Period must be between 1 and 365 days');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // User statistics
    const userStats = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'business', isActive: true }),
      User.countDocuments({ role: 'rider', isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ isVerified: true, isActive: true }),
      User.countDocuments({ createdAt: { $gte: startDate } })
    ]);

    // Offer statistics
    const offerStats = await Promise.all([
      Offer.countDocuments(),
      Offer.countDocuments({ status: 'pending' }),
      Offer.countDocuments({ status: 'accepted' }),
      Offer.countDocuments({ status: 'completed' }),
      Offer.countDocuments({ createdAt: { $gte: startDate } }),
      Offer.aggregate([
        { $group: { _id: null, totalValue: { $sum: '$pricing.total' } } }
      ])
    ]);

    // Payment statistics
    const paymentStats = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'completed' }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'failed' }),
      Payment.countDocuments({ createdAt: { $gte: startDate } }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ])
    ]);

    // Notification statistics
    const notificationStats = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ isRead: false }),
      Notification.countDocuments({ createdAt: { $gte: startDate } }),
      Notification.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    // Recent activity (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const recentActivity = await Promise.all([
      User.countDocuments({ createdAt: { $gte: last7Days } }),
      Offer.countDocuments({ createdAt: { $gte: last7Days } }),
      Payment.countDocuments({ createdAt: { $gte: last7Days } })
    ]);

    // Top performing riders (by completed deliveries)
    const topRiders = await Offer.aggregate([
      { $match: { status: 'completed', riderId: { $exists: true } } },
      { $group: { _id: '$riderId', completedDeliveries: { $sum: 1 } } },
      { $sort: { completedDeliveries: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'rider'
        }
      },
      { $unwind: '$rider' },
      {
        $project: {
          riderId: '$_id',
          riderName: {
            $concat: [
              { $ifNull: ['$rider.profile.firstName', ''] },
              ' ',
              { $ifNull: ['$rider.profile.lastName', ''] }
            ]
          },
          riderEmail: '$rider.email',
          completedDeliveries: 1,
          rating: '$rider.profile.rating.average'
        }
      }
    ]);

    // Top businesses (by offer count)
    const topBusinesses = await Offer.aggregate([
      { $group: { _id: '$businessId', offerCount: { $sum: 1 } } },
      { $sort: { offerCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'business'
        }
      },
      { $unwind: '$business' },
      {
        $project: {
          businessId: '$_id',
          businessName: '$business.profile.businessName',
          businessEmail: '$business.email',
          offerCount: 1
        }
      }
    ]);

    // Daily statistics for the period
    const dailyStats = await Offer.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          offers: { $sum: 1 },
          totalValue: { $sum: '$pricing.total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const analytics = {
      period: {
        days: periodDays,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      },
      users: {
        total: userStats[0],
        businesses: userStats[1],
        riders: userStats[2],
        admins: userStats[3],
        verified: userStats[4],
        newInPeriod: userStats[5]
      },
      offers: {
        total: offerStats[0],
        pending: offerStats[1],
        accepted: offerStats[2],
        completed: offerStats[3],
        newInPeriod: offerStats[4],
        totalValue: offerStats[5][0]?.totalValue || 0
      },
      payments: {
        total: paymentStats[0],
        completed: paymentStats[1],
        pending: paymentStats[2],
        failed: paymentStats[3],
        newInPeriod: paymentStats[4],
        totalAmount: paymentStats[5][0]?.totalAmount || 0
      },
      notifications: {
        total: notificationStats[0],
        unread: notificationStats[1],
        newInPeriod: notificationStats[2],
        byType: notificationStats[3]
      },
      recentActivity: {
        newUsers: recentActivity[0],
        newOffers: recentActivity[1],
        newPayments: recentActivity[2]
      },
      topPerformers: {
        riders: topRiders,
        businesses: topBusinesses
      },
      dailyStats: dailyStats.map(stat => ({
        date: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}-${String(stat._id.day).padStart(2, '0')}`,
        offers: stat.offers,
        totalValue: stat.totalValue
      }))
    };

    return ApiResponseHelpers.success(analytics, 'Analytics retrieved successfully');

  } catch (error) {
    console.error('Get analytics error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve analytics');
  }
}

/**
 * GET handler with admin role requirement
 */
export const GET = withRole('admin', handleGetAnalytics);

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}