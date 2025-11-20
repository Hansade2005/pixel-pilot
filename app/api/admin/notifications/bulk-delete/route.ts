import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkAdminAccess } from '@/lib/admin-utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { notificationIds } = await request.json();

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 });
    }

    // Delete the admin notifications (this will cascade to user_notifications)
    const { error: deleteError } = await createAdminClient()
      .from('admin_notifications')
      .delete()
      .in('id', notificationIds);

    if (deleteError) {
      console.error('Error bulk deleting notifications:', deleteError);
      return NextResponse.json({ error: 'Failed to delete notifications' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: notificationIds.length
    });

  } catch (error) {
    console.error('Error in bulk delete notifications API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}