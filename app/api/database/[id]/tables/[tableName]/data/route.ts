import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; tableName: string } }
) {
  try {
    const { id: databaseId, tableName } = params
    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const offset = (page - 1) * pageSize

    // Get admin client for service role access
    const supabase = createAdminClient()

    // Count total records
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('[API] Error counting records:', countError)
      return NextResponse.json(
        { error: 'Failed to count records', details: countError.message },
        { status: 500 }
      )
    }

    // Fetch paginated data
    const { data: rows, error: dataError } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + pageSize - 1)

    if (dataError) {
      console.error('[API] Error fetching table data:', dataError)
      return NextResponse.json(
        { error: 'Failed to fetch table data', details: dataError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      table_name: tableName,
      rows: rows || [],
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
