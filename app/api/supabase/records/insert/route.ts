import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { InsertRecordRequest, InsertRecordResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/records/insert
 * Insert a new record into a table
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
    const body: InsertRecordRequest = await request.json()
    const { tableName, data, onConflict, returning = [] } = body

    if (!tableName || typeof tableName !== 'string') {
      throw new SupabaseToolsError('tableName is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new SupabaseToolsError('data is required and must be an object', 'VALIDATION_ERROR', 400)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if table exists
    const { data: existingTable, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .single()

    if (checkError || !existingTable) {
      throw new SupabaseToolsError(`Table '${tableName}' does not exist`, 'TABLE_NOT_FOUND', 404)
    }

    // Build the insert query
    let query
    if (onConflict) {
      query = supabase.from(tableName).upsert(data, { onConflict })
    } else {
      query = supabase.from(tableName).insert(data)
    }

    // Handle returning clause
    if (returning && returning.length > 0) {
      query = query.select(returning.join(','))
    } else {
      query = query.select()
    }

    // Execute the insert
    const { data: insertedData, error: insertError } = await query.single()

    if (insertError) {
      throw new SupabaseToolsError(
        `Failed to insert record: ${handleDatabaseError(insertError).message}`,
        'INSERT_FAILED',
        500
      )
    }

    const response: InsertRecordResponse = {
      success: true,
      record: insertedData,
      message: `Record inserted successfully into table '${tableName}'`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Record inserted into '${tableName}'`
    } as ApiResponse<InsertRecordResponse>)

  } catch (error: any) {
    console.error('Error in records insert API:', error)

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