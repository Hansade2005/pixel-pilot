import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

// Configure web-push (set these in environment variables)
webpush.setVapidDetails(
  'mailto:support@pipilot.dev',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

/**
 * POST /api/notifications/subscribe
 * Subscribe user to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription, deviceType, browser } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Store subscription in database
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: request.headers.get('user-agent'),
        device_type: deviceType || 'desktop',
        browser: browser || 'unknown',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) {
      console.error('Error saving subscription:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    // Initialize user preferences if not exists
    const { error: prefsError } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: user.id,
        enabled: true
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: true
      });

    // Initialize engagement score if not exists
    const { error: engagementError } = await supabase
      .from('user_engagement_scores')
      .upsert({
        user_id: user.id,
        overall_score: 50,
        last_active_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: true
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Subscribed to push notifications' 
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    // Deactivate subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Unsubscribed from push notifications' 
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
