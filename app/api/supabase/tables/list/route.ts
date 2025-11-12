import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { TableListResponse, ApiResponse, SupabaseToolsError, ColumnInfo } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/supabase/tables/list
 * Lists all tables in the user's Supabase database
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const adminClient = createAdminClient()
    const authHeader = request.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new SupabaseToolsError('Missing or invalid authorization header', 'AUTH_MISSING', 401)
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token)

    if (authError || !user) {
      throw new SupabaseToolsError('Invalid authentication token', 'AUTH_INVALID', 401)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Query for all tables in the database
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info') // We'll create this RPC function
      .select('*')

    if (tablesError) {
      // Fallback to direct query if RPC doesn't exist
      const { data: fallbackTables, error: fallbackError } = await supabase
        .from('information_schema.tables')
        .select(`
          table_schema,
          table_name,
          table_type
        `)
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')

      if (fallbackError) {
        throw new SupabaseToolsError(
          `Failed to list tables: ${handleDatabaseError(fallbackError).message}`,
          'TABLE_LIST_FAILED',
          500
        )
      }

      // Get row counts for each table
      const tablesWithCounts = await Promise.all(
        (fallbackTables || []).map(async (table) => {
          try {
            const { count, error: countError } = await supabase
              .from(table.table_name)
              .select('*', { count: 'exact', head: true })

            // Get column information
            const { data: columnsData, error: columnsError } = await supabase
              .from('information_schema.columns')
              .select('column_name, data_type, is_nullable, column_default')
              .eq('table_schema', table.table_schema)
              .eq('table_name', table.table_name)
              .order('ordinal_position')

            const columns: ColumnInfo[] = columnsData ? columnsData.map(col => ({
              name: col.column_name,
              type: col.data_type,
              nullable: col.is_nullable === 'YES',
              defaultValue: col.column_default
            })) : []

            return {
              name: table.table_name,
              schema: table.table_schema,
              rowCount: count || 0,
              size: 'Unknown', // Would need additional query for size
              createdAt: new Date().toISOString(), // Would need additional query
              columns
            }
          } catch (error) {
            return {
              name: table.table_name,
              schema: table.table_schema,
              rowCount: 0,
              size: 'Unknown',
              createdAt: new Date().toISOString(),
              columns: []
            }
          }
        })
      )

      const response: TableListResponse = {
        tables: tablesWithCounts,
        totalCount: tablesWithCounts.length
      }

      return NextResponse.json({
        success: true,
        data: response,
        message: `Found ${tablesWithCounts.length} tables`
      } as ApiResponse<TableListResponse>)
    }

    // If RPC function exists, use its results
    const response: TableListResponse = {
      tables: tables || [],
      totalCount: tables?.length || 0
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Found ${response.totalCount} tables`
    } as ApiResponse<TableListResponse>)

  } catch (error: any) {
    console.error('Error in tables list API:', error)

    if (error instanceof SupabaseToolsError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code
        } as ApiResponse,
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      } as ApiResponse,
      { status: 500 }
    )
  }
}