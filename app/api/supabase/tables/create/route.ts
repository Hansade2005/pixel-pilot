import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { CreateTableRequest, CreateTableResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/tables/create
 * Creates a new table in the user's Supabase database
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
    const body: CreateTableRequest = await request.json()
    const { tableName, schema, ifNotExists = false } = body

    if (!tableName || typeof tableName !== 'string') {
      throw new SupabaseToolsError('tableName is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    if (!schema || typeof schema !== 'string') {
      throw new SupabaseToolsError('schema is required and must be a string (SQL DDL)', 'VALIDATION_ERROR', 400)
    }

    // Basic validation of table name (PostgreSQL rules)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new SupabaseToolsError(
        'Invalid table name. Must start with letter or underscore, contain only alphanumeric and underscores',
        'VALIDATION_ERROR',
        400
      )
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .single()

    if (!checkError && existingTable) {
      if (!ifNotExists) {
        throw new SupabaseToolsError(`Table '${tableName}' already exists`, 'TABLE_EXISTS', 409)
      }
      // If ifNotExists is true and table exists, return success
      return NextResponse.json({
        success: true,
        data: {
          tableName,
          message: `Table '${tableName}' already exists (ifNotExists=true)`
        }
      } as ApiResponse<CreateTableResponse>)
    }

    // Execute the CREATE TABLE statement
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: schema
    })

    if (createError) {
      throw new SupabaseToolsError(
        `Failed to create table: ${handleDatabaseError(createError).message}`,
        'TABLE_CREATE_FAILED',
        500
      )
    }

    // Verify table was created
    const { data: verifyTable, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .single()

    if (verifyError || !verifyTable) {
      throw new SupabaseToolsError(
        'Table creation could not be verified',
        'TABLE_VERIFY_FAILED',
        500
      )
    }

    const response: CreateTableResponse = {
      success: true,
      tableName,
      message: `Table '${tableName}' created successfully`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Table '${tableName}' created successfully`
    } as ApiResponse<CreateTableResponse>)

  } catch (error: any) {
    console.error('Error in tables create API:', error)

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