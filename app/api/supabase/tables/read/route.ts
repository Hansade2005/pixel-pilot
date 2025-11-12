import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { TableReadResponse, ApiResponse, SupabaseToolsError, ColumnInfo } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/tables/read
 * Reads table schema and first row of data
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { tableName } = body

    if (!tableName || typeof tableName !== 'string') {
      throw new SupabaseToolsError('tableName is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Get table schema information
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select(`
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      `)
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position')

    if (schemaError) {
      throw new SupabaseToolsError(
        `Failed to read table schema: ${handleDatabaseError(schemaError).message}`,
        'SCHEMA_READ_FAILED',
        500
      )
    }

    if (!columns || columns.length === 0) {
      throw new SupabaseToolsError(`Table '${tableName}' not found`, 'TABLE_NOT_FOUND', 404)
    }

    // Get primary key information
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        constraint_name,
        constraint_type,
        table_name
      `)
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .eq('constraint_type', 'PRIMARY KEY')

    let primaryKeyColumns: string[] = []
    if (!constraintError && constraints && constraints.length > 0) {
      const constraintName = constraints[0].constraint_name
      const { data: keyColumns } = await supabase
        .from('information_schema.key_column_usage')
        .select('column_name')
        .eq('constraint_name', constraintName)
        .eq('table_schema', 'public')

      if (keyColumns) {
        primaryKeyColumns = keyColumns.map(k => k.column_name)
      }
    }

    // Transform schema data
    const schema: ColumnInfo[] = columns.map((col: any) => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      default: col.column_default,
      primary_key: primaryKeyColumns.includes(col.column_name)
    }))

    // Get first row of data (limit 1)
    let sampleRow: Record<string, any> = {}
    try {
      const { data: firstRow, error: rowError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        .single()

      if (!rowError && firstRow) {
        sampleRow = firstRow
      }
    } catch (error) {
      // Table might be empty or have permission issues, that's okay
      console.log(`Could not fetch sample row for table ${tableName}:`, error)
    }

    // Get table metadata
    const { count: totalRows, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    const response: TableReadResponse = {
      schema,
      sampleRow,
      metadata: {
        totalRows: totalRows || 0,
        tableSize: 'Unknown', // Would need pg_table_size function
        lastModified: new Date().toISOString() // Would need additional query
      }
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Successfully read schema for table '${tableName}'`
    } as ApiResponse<TableReadResponse>)

  } catch (error: any) {
    console.error('Error in tables read API:', error)

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