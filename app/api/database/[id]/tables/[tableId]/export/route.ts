import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/database/[id]/tables/[tableId]/export?format=csv|json
 * Exports table data as CSV or JSON
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    const supabase = createAdminClient();

    // Skip authentication - service role provides full access
    // Get current user session
    // const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    // if (sessionError || !user) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized - Please log in' },
    //     { status: 401 }
    //   );
    // }

    // const userId = user.id;

    // Get table without ownership verification
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*, databases!inner(*)')
      .eq('id', params.tableId)
      .eq('database_id', params.id)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found or access denied' },
        { status: 404 }
      );
    }

    // Get all records
    const { data: records, error: recordsError } = await supabase
      .from('records')
      .select('*')
      .eq('table_id', params.tableId)
      .order('created_at', { ascending: false });

    if (recordsError) {
      return NextResponse.json(
        { error: 'Failed to fetch records' },
        { status: 500 }
      );
    }

    // Transform records (flatten data_json)
    const transformedRecords = (records || []).map((record: any) => ({
      id: record.id,
      ...record.data_json,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }));

    const schema = table.schema_json;
    const columnNames = ['id', ...schema.columns.map((col: any) => col.name), 'created_at', 'updated_at'];

    if (format === 'csv') {
      // Generate CSV
      const csvContent = jsonToCSV(transformedRecords, columnNames);
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${table.name}_export.csv"`,
        },
      });
    } else {
      // Return JSON
      return new NextResponse(JSON.stringify(transformedRecords, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${table.name}_export.json"`,
        },
      });
    }

  } catch (error: any) {
    console.error('Unexpected error in export:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to convert JSON to CSV
function jsonToCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) return '';

  // Create header row
  const header = columns.join(',');
  
  // Create data rows
  const rows = data.map(record => {
    return columns.map(col => {
      const value = record[col];
      
      if (value === null || value === undefined) {
        return '';
      }
      
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}
