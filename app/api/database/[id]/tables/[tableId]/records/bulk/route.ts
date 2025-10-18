import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/database/[id]/tables/[tableId]/records/bulk
 * Deletes multiple records at once
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { recordIds } = await request.json();

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: 'Record IDs array is required' },
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
    console.log(`BULK DELETE: userId=${userId}, databaseId=${params.id}, tableId=${params.tableId}, recordCount=${recordIds.length}`);

    // Verify database ownership
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (dbError || !database) {
      console.error('BULK DELETE failed: Database not found or access denied', dbError);
      return NextResponse.json(
        { error: 'Database not found or access denied' },
        { status: 404 }
      );
    }

    // Verify table ownership
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', params.tableId)
      .eq('database_id', params.id)
      .single();

    if (tableError || !table) {
      console.error('BULK DELETE failed: Table not found or access denied', tableError);
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    const tableIdInt = parseInt(params.tableId, 10);

    // Verify all records exist and belong to this table
    const { data: existingRecords, error: recordCheckError } = await supabase
      .from('records')
      .select('id')
      .in('id', recordIds.map(id => id.toString()))
      .eq('table_id', tableIdInt);

    if (recordCheckError) {
      console.error('BULK DELETE failed: Error checking records', recordCheckError);
      return NextResponse.json(
        { error: 'Error verifying records' },
        { status: 500 }
      );
    }

    if (!existingRecords || existingRecords.length !== recordIds.length) {
      return NextResponse.json(
        { error: `Only ${existingRecords?.length || 0} of ${recordIds.length} records found` },
        { status: 404 }
      );
    }

    // Delete all records in a single operation
    const { error: deleteError, count } = await supabase
      .from('records')
      .delete()
      .in('id', recordIds.map(id => id.toString()))
      .eq('table_id', tableIdInt);

    if (deleteError) {
      console.error('BULK DELETE failed: Error deleting records', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete records', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`BULK DELETE: Successfully deleted ${count || recordIds.length} records`);

    return NextResponse.json({
      success: true,
      deletedCount: count || recordIds.length,
      message: `Successfully deleted ${count || recordIds.length} record(s)`,
    });
  } catch (error: any) {
    console.error('BULK DELETE failed: Unexpected error', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete records' },
      { status: 500 }
    );
  }
}
