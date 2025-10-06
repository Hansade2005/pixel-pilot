import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/database/[id]/tables/[tableId]/records
 * Creates a new record in the table
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { data_json } = await request.json();

    if (!data_json || typeof data_json !== 'object') {
      return NextResponse.json(
        { error: 'Record data is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Verify table ownership
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('database_id', params.id)
      .eq('databases.user_id', userId)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Validate data against schema (basic validation)
    const schema = table.schema_json;
    if (schema && schema.columns) {
      for (const column of schema.columns) {
        if (column.required && !data_json[column.name]) {
          return NextResponse.json(
            { error: `Required field '${column.name}' is missing` },
            { status: 400 }
          );
        }
      }
    }

    // Insert record
    const { data: record, error: recordError } = await supabase
      .from('records')
      .insert({
        table_id: params.tableId,
        data_json
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error creating record:', recordError);
      return NextResponse.json(
        { error: `Failed to create record: ${recordError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      record,
      message: 'Record created successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in create record:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/database/[id]/tables/[tableId]/records
 * Gets all records from the table with pagination
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    // Get current user session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Verify table ownership
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('databases.user_id', userId)
      .single();

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Get records with pagination
    const { data: records, error: recordsError, count } = await supabase
      .from('records')
      .select('*', { count: 'exact' })
      .eq('table_id', params.tableId)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (recordsError) {
      return NextResponse.json(
        { error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      records: records || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Unexpected error in get records:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/database/[id]/tables/[tableId]/records?recordId=123
 * Updates a specific record
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const { data_json } = await request.json();

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    if (!data_json || typeof data_json !== 'object') {
      return NextResponse.json(
        { error: 'Record data is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Verify ownership
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('databases.user_id', userId)
      .single();

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Update record
    const { data: record, error: updateError } = await supabase
      .from('records')
      .update({ data_json })
      .eq('id', recordId)
      .eq('table_id', params.tableId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      record,
      message: 'Record updated successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in update record:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/database/[id]/tables/[tableId]/records?recordId=123
 * Deletes a specific record
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

   const supabase = await createClient();
    // Get current user session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

     const userId = user.id;
    // Verify ownership
    const { data: table } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('databases.user_id', userId)
      .single();

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId)
      .eq('table_id', params.tableId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error: any) {
    console.error('Unexpected error in delete record:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
