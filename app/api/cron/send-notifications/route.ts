import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createNotificationScheduler } from '@/lib/notification-scheduler';

/**
 * Cron Job: Send Scheduled Notifications
 * 
 * This endpoint should be called periodically (every 15-30 minutes) by:
 * - Vercel Cron Jobs (vercel.json)
 * - GitHub Actions
 * - External cron service (cron-job.org, EasyCron)
 * 
 * Security: Requires CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.NOTIFICATION_API_KEY;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const scheduler = await createNotificationScheduler();

    console.log('[Cron] Starting notification scheduling job...');

    // Get all active users with notification preferences enabled
    const { data: users, error: usersError } = await supabase
      .from('user_notification_preferences')
      .select('user_id, enabled, frequency, preferred_categories')
      .eq('enabled', true);

    if (usersError || !users || users.length === 0) {
      console.log('[Cron] No active users found for notifications');
      return NextResponse.json({
        success: true,
        message: 'No active users to process',
        processed: 0
      });
    }

    console.log(`[Cron] Processing ${users.length} users...`);

    let scheduledCount = 0;
    let errorCount = 0;
    const results = [];

    // Process users in batches to avoid overwhelming the system
    const BATCH_SIZE = 10;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            // Generate notification schedule for the next 24 hours
            // The scheduler will analyze user behavior internally
            const schedules = await scheduler.generateSchedule(user.user_id, 1); // 1 day schedule

            // Insert into notification queue
            if (schedules.length > 0) {
              const { error: insertError } = await supabase
                .from('notification_queue')
                .insert(
                  schedules.map(schedule => ({
                    user_id: schedule.userId,
                    template_id: schedule.templateId,
                    scheduled_for: schedule.scheduledFor.toISOString(),
                    title: 'Notification', // Will be populated from template
                    body: 'Pending', // Will be populated from template
                    data: schedule.personalizedData,
                    status: 'pending'
                  }))
                );

              if (insertError) {
                console.error(`[Cron] Error inserting schedules for user ${user.user_id}:`, insertError);
                throw insertError;
              }

              scheduledCount += schedules.length;
              return {
                userId: user.user_id,
                scheduled: schedules.length,
                success: true
              };
            }

            return {
              userId: user.user_id,
              scheduled: 0,
              success: true,
              message: 'No schedules generated'
            };
          } catch (error) {
            console.error(`[Cron] Error processing user ${user.user_id}:`, error);
            errorCount++;
            return {
              userId: user.user_id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        })
      );

      results.push(...batchResults);
    }

    // Now send any pending notifications that are due
    const now = new Date();
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select(`
        id,
        user_id,
        title,
        body,
        icon,
        badge,
        image,
        url,
        data
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(100); // Process max 100 notifications per run

    let sentCount = 0;
    if (!fetchError && pendingNotifications && pendingNotifications.length > 0) {
      console.log(`[Cron] Sending ${pendingNotifications.length} pending notifications...`);

      for (const notification of pendingNotifications) {
        try {
          // Send notification via API
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.NOTIFICATION_API_KEY!
            },
            body: JSON.stringify({
              userId: notification.user_id,
              title: notification.title,
              body: notification.body,
              icon: notification.icon,
              badge: notification.badge,
              image: notification.image,
              url: notification.url,
              data: notification.data
            })
          });

          if (response.ok) {
            // Mark as sent
            await supabase
              .from('notification_queue')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString()
              })
              .eq('id', notification.id);

            sentCount++;
          } else {
            // Mark as failed
            await supabase
              .from('notification_queue')
              .update({
                status: 'failed',
                failed_at: new Date().toISOString(),
                error_message: `HTTP ${response.status}`,
                retry_count: 1
              })
              .eq('id', notification.id);
          }
        } catch (error) {
          console.error(`[Cron] Error sending notification ${notification.id}:`, error);
          
          // Mark as failed
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : 'Unknown error',
              retry_count: 1
            })
            .eq('id', notification.id);
        }
      }
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        usersProcessed: users.length,
        notificationsScheduled: scheduledCount,
        notificationsSent: sentCount,
        errors: errorCount
      }
    };

    console.log('[Cron] Job completed:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('[Cron] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST method for manual triggering (admin only)
export async function POST(request: NextRequest) {
  return GET(request);
}
