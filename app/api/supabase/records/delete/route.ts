import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { DeleteRecordRequest, DeleteRecordResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/records/delete
 * Delete records from a table
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
    const body: DeleteRecordRequest = await request.json()
    const { tableName, where, returning = [] } = body

    if (!tableName || typeof tableName !== 'string') {
      throw new SupabaseToolsError('tableName is required and must be a string', 'VALIDATION_ERROR', 400)
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

    // Build the delete query
    let query = supabase.from(tableName).delete()

    // Apply where conditions
    Object.entries(where).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    // Execute the delete with appropriate select
    let deleteResult: any
    if (returning && returning.length > 0) {
      deleteResult = await query.select(returning.join(','))
    } else {
      deleteResult = await query.select()
    }

    const { data: deletedData, error: deleteError } = deleteResult

    if (deleteError) {
      throw new SupabaseToolsError(
        `Failed to delete records: ${handleDatabaseError(deleteError).message}`,
        'DELETE_FAILED',
        500
      )
    }

    const response: DeleteRecordResponse = {
      success: true,
      records: deletedData || [],
      affectedRows: deletedData?.length || 0,
      message: `Deleted ${deletedData?.length || 0} record(s) from table '${tableName}'`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Deleted ${deletedData?.length || 0} record(s) from '${tableName}'`
    } as ApiResponse<DeleteRecordResponse>)

  } catch (error: any) {
    console.error('Error in records delete API:', error)

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