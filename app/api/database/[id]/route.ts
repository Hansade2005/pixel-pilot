import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

/**
 * GET /api/database/[id]
 * Returns database details and list of tables
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const databaseId = params.id;
    const supabase = getServerSupabase();

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get database and verify ownership
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('*')
      .eq('id', databaseId)
      .eq('user_id', userId)
      .single();

    if (dbError || !database) {
      return NextResponse.json(
        { error: 'Database not found or access denied' },
        { status: 404 }
      );
    }

    // Get all tables in this database
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .eq('database_id', databaseId)
      .order('created_at', { ascending: true });

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return NextResponse.json(
        { error: 'Failed to fetch tables' },
        { status: 500 }
      );
    }

    // Get record counts for each table
    const tablesWithCounts = await Promise.all(
      (tables || []).map(async (table) => {
        const { count } = await supabase
          .from('records')
          .select('*', { count: 'exact', head: true })
          .eq('table_id', table.id);

        return {
          ...table,
          record_count: count || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      database,
      tables: tablesWithCounts
    });

  } catch (error: any) {
    console.error('Unexpected error in get database:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/database/[id]
 * Deletes a database and all its tables and records (CASCADE)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const databaseId = params.id;
    const supabase = getServerSupabase();

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verify ownership before deleting
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('*')
      .eq('id', databaseId)
      .eq('user_id', userId)
      .single();

    if (dbError || !database) {
      return NextResponse.json(
        { error: 'Database not found or access denied' },
        { status: 404 }
      );
    }

    // Delete database (CASCADE will delete tables and records)
    const { error: deleteError } = await supabase
      .from('databases')
      .delete()
      .eq('id', databaseId);

    if (deleteError) {
      console.error('Error deleting database:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database deleted successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in delete database:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
