import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminAccess } from '@/lib/admin-utils';
import { triggerUserNotification } from '@/lib/pusher';
import { sendOneSignalNotification } from '@/lib/onesignal';
import { createNotificationImage } from '@/lib/notification-images';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get admin notifications with pagination
    const { data: notifications, error: notificationsError, count } = await supabase
      .from('admin_notifications')
      .select(`
        *,
        profiles!admin_notifications_sent_by_fkey(email, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (notificationsError) {
      console.error('Error fetching admin notifications:', notificationsError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get user notifications stats
    const stats = await supabase
      .from('user_notifications')
      .select('is_read')
      .then(({ data }) => {
        const total = data?.length || 0;
        const read = data?.filter((n: any) => n.is_read).length || 0;
        const unread = total - read;
        return { total, read, unread };
      });

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      stats: stats || { total: 0, read: 0, unread: 0 }
    });

  } catch (error) {
    console.error('Error in admin notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      message,
      type,
      targetAudience,
      specificUserIds,
      url,
      imageUrl,
      priority,
      expiresAt
    } = body;

    // Validate required fields
    if (!title || !message || !type || !targetAudience) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get target users based on audience
    let targetUsers: any[] = [];

    if (targetAudience === 'all_users') {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      targetUsers = users || [];
    } else if (targetAudience === 'specific_users' && specificUserIds?.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', specificUserIds);

      if (usersError) {
        console.error('Error fetching specific users:', usersError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      targetUsers = users || [];
    } else if (targetAudience.startsWith('plan_')) {
      const plan = targetAudience.replace('plan_', '');
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          user_settings!inner(subscription_plan)
        `)
        .eq('user_settings.subscription_plan', plan);

      if (usersError) {
        console.error('Error fetching plan users:', usersError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      targetUsers = users || [];
    } else if (targetAudience === 'active_users') {
      // Users active in last 30 days (based on usage records)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUserIds, error: activeError } = await supabase
        .from('usage_records')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (activeError) {
        console.error('Error fetching active user IDs:', activeError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(activeUserIds?.map(record => record.user_id) || [])];

      if (uniqueUserIds.length === 0) {
        targetUsers = [];
      } else {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', uniqueUserIds);

        if (usersError) {
          console.error('Error fetching active users:', usersError);
          return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        targetUsers = users || [];
      }
    } else if (targetAudience === 'inactive_users') {
      // Users inactive for more than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get all users
      const { data: allUsers, error: allUsersError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      // Get active user IDs
      const { data: activeUserIds, error: activeError } = await supabase
        .from('usage_records')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (activeError) {
        console.error('Error fetching active user IDs:', activeError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      const activeUserIdSet = new Set(activeUserIds?.map(record => record.user_id) || []);

      // Filter out active users
      targetUsers = allUsers?.filter(user => !activeUserIdSet.has(user.id)) || [];
    }

    // Generate image URL if not provided
    let finalImageUrl = imageUrl;
    if (!finalImageUrl) {
      try {
        finalImageUrl = createNotificationImage(title, message, type);
        console.log('Generated notification image:', finalImageUrl);
      } catch (error) {
        console.error('Error generating notification image:', error);
        // Continue without image if generation fails
      }
    }

    // Create admin notification
    const notificationData: any = {
      title,
      message,
      type,
      target_audience: targetAudience,
      specific_user_ids: specificUserIds || [],
      url,
      image_url: finalImageUrl,
      priority: priority || 1,
      sent_by: user.id
    };

    // Only add expires_at if it's provided and not empty
    if (expiresAt && expiresAt.trim() !== '') {
      notificationData.expires_at = expiresAt;
    }

    const { data: adminNotification, error: adminError } = await supabase
      .from('admin_notifications')
      .insert(notificationData)
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin notification:', adminError);
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
    }

    // Create user notifications for each target user
    const userNotifications = targetUsers.map(user => {
      const notification: any = {
        user_id: user.id,
        admin_notification_id: adminNotification.id,
        title,
        message,
        type,
        url,
        image_url: finalImageUrl,
        priority: priority || 1
      };

      // Only add expires_at if it's provided and not empty
      if (expiresAt && expiresAt.trim() !== '') {
        notification.expires_at = expiresAt;
      }

      return notification;
    });

    const { error: userNotificationsError } = await createAdminClient()
      .from('user_notifications')
      .insert(userNotifications);

    if (userNotificationsError) {
      console.error('Error creating user notifications:', userNotificationsError);
      // Don't fail the whole request, but log the error
    } else {
      // Trigger real-time notifications via Pusher
      const notificationPromises = targetUsers.map(async (targetUser) => {
        const notificationData = {
          id: `admin-${adminNotification.id}-${targetUser.id}`,
          title,
          message,
          type,
          url,
          image_url: finalImageUrl,
          priority: priority || 1,
          created_at: new Date().toISOString()
        };

        await triggerUserNotification(targetUser.id, notificationData);
      });

      // Trigger notifications asynchronously (don't wait for completion)
      Promise.all(notificationPromises).catch(error => {
        console.error('Error triggering Pusher notifications:', error);
      });
      // Send push notifications via OneSignal (asynchronously)
      sendOneSignalNotification({
        title,
        message,
        url,
        imageUrl: finalImageUrl,
        segments: ['Subscribed Users'] // Send to all subscribed users
      }).catch(error => {
        console.error('Error sending OneSignal notifications:', error);
      });
    }

    return NextResponse.json({
      success: true,
      notification: adminNotification,
      recipientsCount: targetUsers.length
    });

  } catch (error) {
    console.error('Error in admin notifications POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}