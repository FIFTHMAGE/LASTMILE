/**
 * Notifications API routes
 * GET /api/notifications - List user notifications with filtering and pagination
 * POST /api/notifications - Create new notification (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/utils/jwt';
import { getUserNotifications, getUserNotificationStats } from '@/lib/utils/notification';
import { notificationService } from '@/lib/services/notification';
import { NotificationFilters } from '@/lib/types/notification';

/**
 * GET handler - List user notifications with filtering and pagination
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

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 items per page
    const filter = searchParams.get('filter') || 'all'; // all, unread, read
    const type = searchParams.get('type'); // Optional type filter
    const priority = searchParams.get('priority'); // Optional priority filter
    const startDate = searchParams.get('startDate'); // Optional start date
    const endDate = searchParams.get('endDate'); // Optional end date
    
    // Build filters
    const filters: any = {};
    if (filter === 'unread') {
      filters.read = false;
    } else if (filter === 'read') {
      filters.read = true;
    }
    if (type) {
      filters.type = type;
    }
    if (priority) {
      filters.priority = priority;
    }
    if (startDate) {
      filters.startDate = new Date(startDate);
    }
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    // Get notifications using the service
    const result = await getUserNotifications(decoded.userId, filters, page, limit);
    
    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Create new notification (admin only)
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

    // Check if user is admin
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.message || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message, type' },
        { status: 400 }
      );
    }

    let notification;

    if (body.userId) {
      // Single user notification
      notification = await notificationService.createNotification({
        userId: body.userId,
        type: body.type,
        title: body.title,
        message: body.message,
        priority: body.priority || 'medium',
        channels: body.channels || ['in_app'],
        metadata: body.metadata || {},
        relatedEntity: body.relatedEntity,
        actionUrl: body.actionUrl,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      });
    } else if (body.userIds && Array.isArray(body.userIds)) {
      // Bulk notifications
      const notifications = await notificationService.createBulkNotifications(
        body.userIds,
        {
          type: body.type,
          title: body.title,
          message: body.message,
          priority: body.priority || 'medium',
          channels: body.channels || ['in_app'],
          metadata: body.metadata || {},
          relatedEntity: body.relatedEntity,
          actionUrl: body.actionUrl,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        }
      );
      
      return NextResponse.json({
        success: true,
        data: {
          created: notifications.length,
          notifications: notifications.slice(0, 5), // Return first 5 as sample
        },
        message: `${notifications.length} notification(s) created successfully`,
      }, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Either userId or userIds array is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}