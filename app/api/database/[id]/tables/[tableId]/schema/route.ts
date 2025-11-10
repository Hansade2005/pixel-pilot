import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET table structure/schema
 * /api/database/[id]/tables/[tableId]/schema
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { id: databaseId, tableId } = params
    const supabase = createAdminClient()

    // Get table details
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single()

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Query table structure using raw SQL to get column information
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { 
        table_name_param: table.name,
        schema_name_param: table.schema || 'public'
      })

    if (columnsError) {
      console.error('[API] Error fetching columns:', columnsError)
      // Fallback: try to get columns from table_columns
      const { data: fallbackColumns } = await supabase
        .from('table_columns')
        .select('*')
        .eq('table_id', tableId)
        .order('position')

      if (fallbackColumns) {
        return NextResponse.json({
          table_name: table.name,
          columns: fallbackColumns.map((col: any) => ({
            name: col.name,
            type: col.type,
            nullable: col.is_nullable,
            default_value: col.default_value,
            is_primary_key: col.is_primary_key || false,
            is_foreign_key: col.is_foreign_key || false,
            foreign_key_ref: col.foreign_key_table ? {
              table: col.foreign_key_table,
              column: col.foreign_key_column
            } : undefined,
          })),
          total_columns: fallbackColumns.length,
        })
      }
    }

    // Format columns with enhanced metadata
    const formattedColumns = (columns || []).map((col: any) => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      default_value: col.column_default,
      is_primary_key: col.is_primary_key || false,
      is_foreign_key: col.is_foreign_key || false,
      max_length: col.character_maximum_length,
      numeric_precision: col.numeric_precision,
      numeric_scale: col.numeric_scale,
    }))

    return NextResponse.json({
      table_name: table.name,
      columns: formattedColumns,
      total_columns: formattedColumns.length,
    })
  } catch (error) {
    console.error('[API] Error in table schema endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
