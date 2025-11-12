import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { DeleteTableRequest, DeleteTableResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/tables/delete
 * Deletes a table from the user's Supabase database
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
    const body: DeleteTableRequest = await request.json()
    const { tableName, cascade = false } = body

    if (!tableName || typeof tableName !== 'string') {
      throw new SupabaseToolsError('tableName is required and must be a string', 'VALIDATION_ERROR', 400)
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

    // Build DROP TABLE statement
    const dropStatement = `DROP TABLE ${cascade ? 'CASCADE' : 'RESTRICT'} "${tableName}"`

    // Execute the DROP TABLE statement
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropStatement
    })

    if (dropError) {
      throw new SupabaseToolsError(
        `Failed to delete table: ${handleDatabaseError(dropError).message}`,
        'TABLE_DELETE_FAILED',
        500
      )
    }

    // Verify table was deleted
    const { data: verifyTable, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .single()

    if (!verifyError && verifyTable) {
      throw new SupabaseToolsError(
        'Table deletion could not be verified - table still exists',
        'TABLE_VERIFY_FAILED',
        500
      )
    }

    const response: DeleteTableResponse = {
      success: true,
      tableName,
      message: `Table '${tableName}' deleted successfully${cascade ? ' (with CASCADE)' : ''}`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Table '${tableName}' deleted successfully`
    } as ApiResponse<DeleteTableResponse>)

  } catch (error: any) {
    console.error('Error in tables delete API:', error)

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