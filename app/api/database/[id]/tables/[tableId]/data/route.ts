import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET paginated table data
 * /api/database/[id]/tables/[tableId]/data?page=1&pageSize=50
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; tableId: string } }
) {
  try {
    const { id: databaseId, tableId } = params
    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const offset = (page - 1) * pageSize

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

    // Count total records from table_records (our metadata table)
    const { count, error: countError } = await supabase
      .from('table_records')
      .select('*', { count: 'exact', head: true })
      .eq('table_id', tableId)

    if (countError) {
      console.error('[API] Error counting records:', countError)
    }

    // Fetch paginated data from table_records
    const { data: rows, error: dataError } = await supabase
      .from('table_records')
      .select('data')
      .eq('table_id', tableId)
      .range(offset, offset + pageSize - 1)

    if (dataError) {
      console.error('[API] Error fetching table data:', dataError)
      return NextResponse.json(
        { error: 'Failed to fetch table data', details: dataError.message },
        { status: 500 }
      )
    }

    // Extract data from JSONB column
    const records = (rows || []).map((row: any) => row.data)

    return NextResponse.json({
      table_name: table.name,
      rows: records,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error('[API] Error in table data endpoint:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
