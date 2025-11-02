import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Return default preferences if not found
    if (!data) {
      const defaultPrefs = {
        user_id: user.id,
        enabled: true,
        morning_reminders: true,
        morning_time: '09:00:00',
        evening_reminders: false,
        evening_time: '18:00:00',
        project_reminders: true,
        achievement_notifications: true,
        tips_and_features: true,
        community_updates: true,
        marketing: false,
        frequency: 'optimal',
        timezone: 'America/Toronto',
        preferred_categories: ['morning_motivation', 'project_continuation', 'tip_of_day']
      };

      return NextResponse.json(defaultPrefs);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await request.json();

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
