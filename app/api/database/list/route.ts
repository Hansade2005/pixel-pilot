import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/database/list
 * Fetch all databases for the authenticated user
 */
export async function GET() {
    try {
        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();

        if (sessionError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch all databases for this user
        const { data: databases, error } = await supabase
            .from('databases')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching databases:', error);
            return NextResponse.json(
                { error: 'Failed to fetch databases' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            databases: databases || [],
            count: databases?.length || 0,
        });
    } catch (error: any) {
        console.error('Database list error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
