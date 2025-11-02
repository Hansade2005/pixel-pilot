import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure web-push
webpush.setVapidDetails(
  'mailto:support@pipilot.dev',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

/**
 * POST /api/notifications/send
 * Send push notification to user (Admin/System use)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify admin or system request
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.NOTIFICATION_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, title, body, icon, badge, image, url, data } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user's active subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: 'No active subscriptions found' }, { status: 404 });
    }

    const payload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      image,
      data: {
        url: url || '/',
        timestamp: Date.now(),
        ...data
      },
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Dismiss'
        }
      ]
    };

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };

          await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

          // Log analytics
          await supabase.from('notification_analytics').insert({
            user_id: userId,
            event_type: 'sent',
            device_type: sub.device_type,
            browser: sub.browser,
            metadata: { title, body }
          });

          // Update last used
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id);

          return { success: true, subscriptionId: sub.id };
        } catch (error: any) {
          console.error('Failed to send to subscription:', error);

          // If subscription is invalid, deactivate it
          if (error.statusCode === 404 || error.statusCode === 410) {
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }

          return { success: false, error: error.message, subscriptionId: sub.id };
        }
      })
    );

    const successful = results.filter((r: any) => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: results.length
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
