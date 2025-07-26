/**
 * Business dashboard data API route
 * GET /api/user/dashboard/business - Get business dashboard data
 */
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/services/database';
import { User } from '@/lib/models/User';
import { Offer } from '@/lib/models/Offer';
import { Payment } from '@/lib/models/Payment';
import { ApiResponseHelpers, withErrorHandling } from '@/lib/utils/api-response';
import { withRole } from '@/lib/utils/auth-helpers';
import { BusinessDashboardResponse } from '@/lib/types';

/**
 * GET handler - Get business dashboard data
 */
async function handleGetBusinessDashboard(request: NextRequest, user: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30'; // Default 30 days
    const days = parseInt(timeRange);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get business user data
    const business = await User.findById(user.id).select('profile email createdAt');
    if (!business) {
      return ApiResponseHelpers.notFound('Business');
    }

    // Aggregate offer statistics
    const offerStats = await Offer.aggregate([
      {
        $match: {
          businessId: business._id,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          pendingOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          acceptedOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          inProgressOffers: {
            $sum: { 
              $cond: [
                { $in: ['$status', ['picked_up', 'in_transit']] }, 
                1, 
                0
              ] 
            }
          },
          deliveredOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          completedOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledOffers: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalRevenue: { $sum: '$pricing.total' },
          averageOfferValue: { $avg: '$pricing.total' }
        }
      }
    ]);

    const stats = offerStats[0] || {
      totalOffers: 0,
      pendingOffers: 0,
      acceptedOffers: 0,
      inProgressOffers: 0,
      deliveredOffers: 0,
      completedOffers: 0,
      cancelledOffers: 0,
      totalRevenue: 0,
      averageOfferValue: 0
    };

    // Get recent offers
    const recentOffers = await Offer.find({
      businessId: user.id
    })
    .populate('riderId', 'profile.firstName profile.lastName profile.rating')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    // Get offer trends (daily data for the time range)
    const offerTrends = await Offer.aggregate([
      {
        $match: {
          businessId: business._id,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.total' },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Get top performing riders
    const topRiders = await Offer.aggregate([
      {
        $match: {
          businessId: business._id,
          riderId: { $exists: true },
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$riderId',
          deliveryCount: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          averageRating: { $avg: '$businessRating.rating' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'rider'
        }
      },
      {
        $unwind: '$rider'
      },
      {
        $project: {
          riderId: '$_id',
          name: {
            $concat: [
              '$rider.profile.firstName',
              ' ',
              '$rider.profile.lastName'
            ]
          },
          email: '$rider.email',
          deliveryCount: 1,
          totalRevenue: 1,
          averageRating: 1,
          riderRating: '$rider.profile.rating.average'
        }
      },
      {
        $sort: { deliveryCount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get payment summary
    const paymentSummary = await Payment.aggregate([
      {
        $match: {
          businessId: business._id,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amount' },
          pendingPayments: {
            $sum: { 
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] 
            }
          },
          completedPayments: {
            $sum: { 
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] 
            }
          },
          failedPayments: {
            $sum: { 
              $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0] 
            }
          }
        }
      }
    ]);

    const payments = paymentSummary[0] || {
      totalPaid: 0,
      pendingPayments: 0,
      completedPayments: 0,
      failedPayments: 0
    };

    // Transform recent offers for response
    const transformedRecentOffers = recentOffers.map(offer => ({
      id: offer._id.toString(),
      status: offer.status,
      pickup: {
        address: offer.pickup.address,
        scheduledTime: offer.pickup.scheduledTime
      },
      delivery: {
        address: offer.delivery.address,
        scheduledTime: offer.delivery.scheduledTime
      },
      pricing: offer.pricing,
      rider: offer.riderId ? {
        name: `${offer.riderId.profile?.firstName || ''} ${offer.riderId.profile?.lastName || ''}`.trim(),
        rating: offer.riderId.profile?.rating?.average || 0
      } : null,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt
    }));

    // Prepare dashboard response
    const dashboardData: BusinessDashboardResponse = {
      business: {
        id: business._id.toString(),
        name: business.profile?.businessName || 'Unknown Business',
        email: business.email,
        memberSince: business.createdAt
      },
      statistics: {
        totalOffers: stats.totalOffers,
        pendingOffers: stats.pendingOffers,
        acceptedOffers: stats.acceptedOffers,
        inProgressOffers: stats.inProgressOffers,
        deliveredOffers: stats.deliveredOffers,
        completedOffers: stats.completedOffers,
        cancelledOffers: stats.cancelledOffers,
        completionRate: stats.totalOffers > 0 ? 
          Math.round((stats.completedOffers / stats.totalOffers) * 100) : 0,
        totalRevenue: Math.round(stats.totalRevenue * 100) / 100,
        averageOfferValue: Math.round(stats.averageOfferValue * 100) / 100
      },
      recentOffers: transformedRecentOffers,
      trends: offerTrends.map(trend => ({
        date: new Date(trend._id.year, trend._id.month - 1, trend._id.day),
        offerCount: trend.count,
        revenue: Math.round(trend.revenue * 100) / 100,
        completedCount: trend.completed
      })),
      topRiders: topRiders.map(rider => ({
        riderId: rider.riderId.toString(),
        name: rider.name,
        email: rider.email,
        deliveryCount: rider.deliveryCount,
        totalRevenue: Math.round(rider.totalRevenue * 100) / 100,
        averageRating: Math.round(rider.averageRating * 10) / 10,
        riderRating: Math.round(rider.riderRating * 10) / 10
      })),
      payments: {
        totalPaid: Math.round(payments.totalPaid * 100) / 100,
        pendingPayments: Math.round(payments.pendingPayments * 100) / 100,
        completedPayments: Math.round(payments.completedPayments * 100) / 100,
        failedPayments: Math.round(payments.failedPayments * 100) / 100
      },
      timeRange: {
        days: days,
        startDate,
        endDate
      }
    };

    return ApiResponseHelpers.success(dashboardData, 'Business dashboard data retrieved successfully');

  } catch (error) {
    console.error('Get business dashboard error:', error);
    return ApiResponseHelpers.internalError('Failed to retrieve dashboard data');
  }
}

/**
 * GET handler with business role requirement
 */
export const GET = withRole('business', handleGetBusinessDashboard);

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