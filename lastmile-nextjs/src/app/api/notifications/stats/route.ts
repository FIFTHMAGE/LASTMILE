/**
 * Notification statistics API route
 * GET /api/notifications/stats - Get notification statistics for the current user
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/utils/jwt';
import { getUserNotificationStats } from '@/lib/utils/notification';

/**
 * GET handler - Get notification statistics
 */
export async function GET(request: NextRequest) {
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

    // Get notification statistics
    const stats = await getUserNotificationStats(decoded.userId);

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification statistics' },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}