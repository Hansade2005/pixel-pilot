import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/database/by-project/[projectId]
 * Returns database for a given project ID
 */
export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get database by project_id
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (dbError) {
      // Check if it's a "not found" error (no rows returned)
      if (dbError.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: 'No database found for this project',
          database: null
        });
      }

      console.error('Error fetching database by project_id:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch database' },
        { status: 500 }
      );
    }

    if (!database) {
      return NextResponse.json({
        success: false,
        error: 'No database found for this project',
        database: null
      });
    }

    return NextResponse.json({
      success: true,
      database,
      message: `Database found for project ${projectId}`
    });

  } catch (error: any) {
    console.error('Unexpected error in get database by project:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
