import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

/**
 * POST /api/database/[id]/query
 * Query records with JSONB filtering
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { tableName, filters, limit = 100, offset = 0, orderBy } = await request.json();

    if (!tableName) {
      return NextResponse.json(
        { error: 'Table name is required' },
        { status: 400 }
      );
    }

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

    // Get table and verify ownership
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('name', tableName)
      .eq('database_id', params.id)
      .eq('databases.user_id', userId)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('table_id', table.id);

    // Apply JSONB filters
    if (filters && typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        // Use JSONB contains operator for filtering
        query = query.contains('data_json', { [key]: value });
      });
    }

    // Apply ordering
    if (orderBy && orderBy.column) {
      const ascending = orderBy.direction === 'asc';
      // For JSONB fields, we order by the extracted value
      query = query.order(`data_json->${orderBy.column}`, { ascending });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const { data: records, error: recordsError, count } = await query
      .range(offset, offset + limit - 1);

    if (recordsError) {
      console.error('Error querying records:', recordsError);
      return NextResponse.json(
        { error: 'Failed to query records' },
        { status: 500 }
      );
    }

    // Format records to include id and flatten data_json
    const formattedRecords = (records || []).map(record => ({
      id: record.id,
      ...record.data_json,
      _created_at: record.created_at,
      _updated_at: record.updated_at
    }));

    return NextResponse.json({
      success: true,
      records: formattedRecords,
      total: count || 0,
      limit,
      offset,
      table: {
        id: table.id,
        name: table.name,
        schema: table.schema_json
      }
    });

  } catch (error: any) {
    console.error('Unexpected error in query:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
