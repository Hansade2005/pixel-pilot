import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminAccess } from '@/lib/admin-utils';
import { triggerUserNotification } from '@/lib/pusher';
import { sendOneSignalNotification } from '@/lib/onesignal';
import { createNotificationImage } from '@/lib/notification-images';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const notificationId = params.id;

    // Delete the admin notification (this will cascade to user_notifications)
    const { error: deleteError } = await createAdminClient()
      .from('admin_notifications')
      .delete()
      .eq('id', notificationId);

    if (deleteError) {
      console.error('Error deleting notification:', deleteError);
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in delete notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const notificationId = params.id;

    // Get the original notification
    const { data: originalNotification, error: fetchError } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (fetchError || !originalNotification) {
      console.error('Error fetching original notification:', fetchError);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Get target users based on audience (reuse the same logic)
    let targetUsers: any[] = [];

    if (originalNotification.target_audience === 'all_users') {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      targetUsers = users || [];
    } else if (originalNotification.target_audience === 'specific_users' && originalNotification.specific_user_ids?.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', originalNotification.specific_user_ids);

      if (usersError) {
        console.error('Error fetching specific users:', usersError);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }

      targetUsers = users || [];
    } else if (originalNotification.target_audience.startsWith('plan_')) {
      const plan = originalNotification.target_audience.replace('plan_', '');
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
    } else if (originalNotification.target_audience === 'active_users') {
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
    } else if (originalNotification.target_audience === 'inactive_users') {
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

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'No users found for the selected audience' }, { status: 400 });
    }

    // Create user notifications for each target user
    const userNotifications = targetUsers.map(user => ({
      user_id: user.id,
      admin_notification_id: notificationId,
      title: originalNotification.title,
      message: originalNotification.message,
      type: originalNotification.type,
      url: originalNotification.url,
      image_url: originalNotification.image_url,
      priority: originalNotification.priority || 1
    }));

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
          id: `admin-${notificationId}-${targetUser.id}`,
          title: originalNotification.title,
          message: originalNotification.message,
          type: originalNotification.type,
          url: originalNotification.url,
          image_url: originalNotification.image_url,
          priority: originalNotification.priority || 1,
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
        title: originalNotification.title,
        message: originalNotification.message,
        url: originalNotification.url,
        imageUrl: originalNotification.image_url,
        segments: ['Subscribed Users'] // Send to all subscribed users
      }).catch(error => {
        console.error('Error sending OneSignal notifications:', error);
      });
    }

    return NextResponse.json({
      success: true,
      recipientsCount: targetUsers.length
    });

  } catch (error) {
    console.error('Error in resend notification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}