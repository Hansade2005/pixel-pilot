import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/database/[id]/activity
 * Fetch recent activities for a database
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();

        if (sessionError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const activityType = searchParams.get('type');

        // Build query
        let query = supabase
            .from('database_activity')
            .select('*', { count: 'exact' })
            .eq('database_id', id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by activity type if provided
        if (activityType) {
            query = query.eq('activity_type', activityType);
        }

        const { data: activities, error, count } = await query;

        if (error) {
            console.error('Error fetching activities:', error);
            return NextResponse.json(
                { error: 'Failed to fetch activities' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            activities: activities || [],
            total: count || 0,
            limit,
            offset,
            has_more: (count || 0) > offset + limit,
        });
    } catch (error: any) {
        console.error('Activity fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
