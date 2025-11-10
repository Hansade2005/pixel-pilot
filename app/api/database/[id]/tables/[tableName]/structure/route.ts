import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    const { id: databaseId, tableName } = params

    // Get admin client for service role access
    const supabase = createAdminClient()

    // Query table structure from information_schema
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', tableName)
      .order('ordinal_position')

    if (columnsError) {
      console.error('[API] Error fetching table structure:', columnsError)
      return NextResponse.json(
        { error: 'Failed to fetch table structure', details: columnsError.message },
        { status: 500 }
      )
    }

    // Get primary key information
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_table_constraints', { table_name_param: tableName })

    // Format columns with enhanced metadata
    const formattedColumns = columns.map((col: any) => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      default_value: col.column_default,
      is_primary_key: constraints?.some(
        (c: any) => c.constraint_type === 'PRIMARY KEY' && c.column_name === col.column_name
      ) || false,
      is_foreign_key: constraints?.some(
        (c: any) => c.constraint_type === 'FOREIGN KEY' && c.column_name === col.column_name
      ) || false,
      max_length: col.character_maximum_length,
      numeric_precision: col.numeric_precision,
      numeric_scale: col.numeric_scale,
    }))

    return NextResponse.json({
      table_name: tableName,
      columns: formattedColumns,
      total_columns: formattedColumns.length,
    })
  } catch (error) {
    console.error('[API] Error in table structure endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
