import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { UpdateRecordRequest, UpdateRecordResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/records/update
 * Update existing records in a table
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
    const body: UpdateRecordRequest = await request.json()
    const { tableName, data, where, returning = [] } = body

    if (!tableName || typeof tableName !== 'string') {
      throw new SupabaseToolsError('tableName is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new SupabaseToolsError('data is required and must be an object', 'VALIDATION_ERROR', 400)
    }

    if (!where || typeof where !== 'object' || Array.isArray(where)) {
      throw new SupabaseToolsError('where is required and must be an object with conditions', 'VALIDATION_ERROR', 400)
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

    // Build the update query
    let query = supabase.from(tableName).update(data)

    // Apply where conditions
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    // Execute the update with appropriate select
    let updateResult: any
    if (returning && returning.length > 0) {
      updateResult = await query.select(returning.join(','))
    } else {
      updateResult = await query.select()
    }

    const { data: updatedData, error: updateError } = updateResult

    if (updateError) {
      throw new SupabaseToolsError(
        `Failed to update records: ${handleDatabaseError(updateError).message}`,
        'UPDATE_FAILED',
        500
      )
    }

    const response: UpdateRecordResponse = {
      success: true,
      records: updatedData || [],
      affectedRows: updatedData?.length || 0,
      message: `Updated ${updatedData?.length || 0} record(s) in table '${tableName}'`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Updated ${updatedData?.length || 0} record(s) in '${tableName}'`
    } as ApiResponse<UpdateRecordResponse>)

  } catch (error: any) {
    console.error('Error in records update API:', error)

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