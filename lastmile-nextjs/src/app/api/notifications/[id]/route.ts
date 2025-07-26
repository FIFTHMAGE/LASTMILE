/**
 * Individual notification API routes
 * GET /api/notifications/[id] - Get specific notification
 * PATCH /api/notifications/[id] - Update notification (mark as read/unread)
 * DELETE /api/notifications/[id] - Delete notification
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/utils/jwt';
import { markNotificationAsRead, deleteNotification } from '@/lib/utils/notification';
import { connectDB } from '@/lib/services/database';
import { Notification } from '@/lib/models/Notification';

/**
 * GET handler - Get specific notification
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    await connectDB();

    // Find notification
    const notification = await Notification.findById(id);

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check ownership - users can only access their own notifications
    if (notification.user.toString() !== decoded.userId && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });

  } catch (error) {
    console.error('Get notification error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve notification' },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - Update notification (mark as read/unread)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const body = await request.json();

    // For marking as read, use the utility function
    if (body.read === true) {
      const success = await markNotificationAsRead(id, decoded.userId);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
      });
    }

    // For other updates, handle manually
    await connectDB();

    const notification = await Notification.findById(id);
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Check ownership
    if (notification.user.toString() !== decoded.userId && decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update fields
    const updateFields: any = {};
    if (body.read !== undefined) {
      updateFields.read = body.read;
      updateFields.readAt = body.read ? new Date() : null;
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: updatedNotification,
      message: 'Notification updated successfully',
    });

  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Use the utility function to delete notification
    const success = await deleteNotification(id, decoded.userId);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete notification or notification not found' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}