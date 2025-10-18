import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/database/[id]/tables/[tableId]/indexes
 * Create indexes for table columns
 * 
 * Body: { action: 'create' | 'rebuild' | 'analyze' }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const body = await request.json();
    const { action = 'create' } = body;

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
    const tableIdInt = parseInt(params.tableId, 10);

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

    const schema = table.schema_json;

    if (action === 'create' || action === 'rebuild') {
      // Find columns that need indexing
      const indexableColumns = schema.columns.filter(
        (col: any) => col.indexed || col.unique || col.primary_key
      );

      if (indexableColumns.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No columns require indexing',
          indexesCreated: 0,
        });
      }

      const results = [];
      const errors = [];

      for (const column of indexableColumns) {
        try {
          // Determine index type
          let indexType = 'btree';
          if (column.type === 'text') {
            indexType = 'gin'; // Better for text search
          }

          // Call Supabase function to create index
          const { data, error } = await supabase.rpc('create_jsonb_index', {
            table_id_param: tableIdInt,
            column_name_param: column.name,
            index_type_param: indexType,
          });

          if (error) {
            console.error(`Failed to create index for ${column.name}:`, error);
            errors.push({
              column: column.name,
              error: error.message,
            });
          } else {
            console.log(`✓ Created index for ${column.name}:`, data);
            results.push({
              column: column.name,
              indexName: data.index_name,
              indexType,
            });
          }
        } catch (error: any) {
          console.error(`Error creating index for ${column.name}:`, error);
          errors.push({
            column: column.name,
            error: error.message,
          });
        }
      }

      // Analyze table to update statistics
      try {
        await supabase.rpc('exec_sql', { 
          sql_query: 'ANALYZE records;' 
        });
        console.log('✓ Analyzed table records');
      } catch (error) {
        console.warn('Failed to analyze table:', error);
      }

      return NextResponse.json({
        success: errors.length === 0,
        message: `Created ${results.length} indexes`,
        indexesCreated: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });

    } else if (action === 'analyze') {
      // Just analyze the table
      const { error: analyzeError } = await supabase.rpc('exec_sql', { 
        sql_query: 'ANALYZE records;' 
      });

      if (analyzeError) {
        return NextResponse.json(
          { error: 'Failed to analyze table' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Table analyzed successfully',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "create", "rebuild", or "analyze"' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Unexpected error in index management:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/database/[id]/tables/[tableId]/indexes
 * Drop all indexes for a table
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
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
    const tableIdInt = parseInt(params.tableId, 10);

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

    // Drop all indexes for this table
    const { data, error } = await supabase.rpc('drop_table_indexes', {
      table_id_param: tableIdInt,
    });

    if (error) {
      console.error('Failed to drop indexes:', error);
      return NextResponse.json(
        { error: 'Failed to drop indexes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Dropped ${data.dropped_count} indexes`,
      droppedCount: data.dropped_count,
    });

  } catch (error: any) {
    console.error('Unexpected error in drop indexes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/database/[id]/tables/[tableId]/indexes
 * Get index information for a table
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
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
    const tableIdInt = parseInt(params.tableId, 10);

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

    // Query index information
    const sql = `
      SELECT 
        i.indexname,
        i.indexdef,
        s.idx_scan as scans,
        s.idx_tup_read as tuples_read,
        s.idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(i.indexname::regclass)) as size
      FROM pg_indexes i
      LEFT JOIN pg_stat_user_indexes s ON i.indexname = s.indexname
      WHERE i.tablename = 'records'
      AND i.indexname LIKE 'idx%_t${tableIdInt}_%'
      ORDER BY s.idx_scan DESC NULLS LAST;
    `;

    const { data: indexes, error: queryError } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    });

    if (queryError) {
      console.error('Failed to query indexes:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch index information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      indexes: indexes || [],
      total: indexes?.length || 0,
    });

  } catch (error: any) {
    console.error('Unexpected error in get indexes:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
