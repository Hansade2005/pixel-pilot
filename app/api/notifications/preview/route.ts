import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerUserNotification } from '@/lib/pusher';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, type } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // Create a preview notification in the database
    const { data: notification, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: user.id,
        admin_notification_id: null, // This is a preview, not from admin
        title,
        message,
        type: type || 'info',
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating preview notification:', error);
      return NextResponse.json({ error: 'Failed to create preview notification' }, { status: 500 });
    }

    // Trigger real-time notification
    const notificationData = {
      id: `preview-${notification.id}`,
      title,
      message,
      type: type || 'info',
      created_at: new Date().toISOString()
    };

    await triggerUserNotification(user.id, notificationData);

    return NextResponse.json({
      success: true,
      notification: notificationData
    });

  } catch (error) {
    console.error('Error sending preview notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}