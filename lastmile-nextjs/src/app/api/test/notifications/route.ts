/**
 * Test notification system API route
 * POST /api/test/notifications - Test notification creation and sending
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/utils/jwt';
import { 
  notifyOfferStatusUpdate,
  notifyWelcomeUser,
  notifySystemMaintenance,
  getUserNotificationStats
} from '@/lib/utils/notification';

/**
 * POST handler - Test notification system
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { testType } = body;

    let result: any = {};

    switch (testType) {
      case 'welcome':
        await notifyWelcomeUser(
          decoded.userId,
          'Test User',
          decoded.role === 'rider' ? 'rider' : 'business'
        );
        result = { message: 'Welcome notification sent' };
        break;

      case 'offer_update':
        await notifyOfferStatusUpdate(
          decoded.userId,
          'test-offer-id',
          'accepted',
          'Test package delivery'
        );
        result = { message: 'Offer update notification sent' };
        break;

      case 'system_maintenance':
        if (decoded.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        await notifySystemMaintenance(
          'Scheduled Maintenance',
          'System will be down for maintenance.',
          new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          '2 hours'
        );
        result = { message: 'System maintenance notification sent to all admins' };
        break;

      case 'stats':
        const stats = await getUserNotificationStats(decoded.userId);
        result = { stats };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: welcome, offer_update, system_maintenance, stats' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      { error: 'Failed to test notifications' },
      { status: 500 }
    );
  }
}

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