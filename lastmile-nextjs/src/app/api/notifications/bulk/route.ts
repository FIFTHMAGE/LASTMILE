/**
 * Bulk notification operations API route
 * PUT /api/notifications/bulk - Bulk update notifications (mark all as read, delete multiple, etc.)
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/utils/jwt';
import { 
  markAllNotificationsAsRead, 
  deleteNotification,
  getUserNotificationStats 
} from '@/lib/utils/notification';
import { notificationService } from '@/lib/services/notification';

/**
 * PUT handler - Bulk update notifications
 */
export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    
    if (!body.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    let result: any = {};

    switch (body.action) {
      case 'mark_all_read':
        // Mark all unread notifications as read for the user
        const modifiedCount = await markAllNotificationsAsRead(decoded.userId);
        result = {
          action: 'mark_all_read',
          modifiedCount,
          message: `${modifiedCount} notifications marked as read`
        };
        break;

      case 'delete_multiple':
        // Delete specific notifications by IDs
        if (!body.notificationIds || !Array.isArray(body.notificationIds)) {
          return NextResponse.json(
            { error: 'notificationIds array is required for delete_multiple action' },
            { status: 400 }
          );
        }
        
        const deletedCount = await notificationService.deleteNotifications(
          body.notificationIds,
          decoded.userId
        );
        
        result = {
          action: 'delete_multiple',
          requestedCount: body.notificationIds.length,
          deletedCount,
          message: `${deletedCount} notifications deleted`
        };
        break;

      case 'cleanup_expired':
        // Clean up expired notifications (system-wide, admin only)
        if (decoded.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        
        const expiredCount = await notificationService.cleanupExpiredNotifications();
        result = {
          action: 'cleanup_expired',
          deletedCount: expiredCount,
          message: `${expiredCount} expired notifications cleaned up`
        };
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${body.action}` },
          { status: 400 }
        );
    }

    // Get updated notification stats
    const stats = await getUserNotificationStats(decoded.userId);

    const responseData = {
      ...result,
      currentStats: stats
    };

    return NextResponse.json({
      success: true,
      data: responseData,
      message: result.message,
    });

  } catch (error) {
    console.error('Bulk update notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation on notifications' },
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
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}