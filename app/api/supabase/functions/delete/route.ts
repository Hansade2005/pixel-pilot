import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { DeleteFunctionRequest, DeleteFunctionResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/functions/delete
 * Deletes a database function
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
    const body: DeleteFunctionRequest = await request.json()
    const { functionName, schema = 'public' } = body

    if (!functionName || typeof functionName !== 'string') {
      throw new SupabaseToolsError('functionName is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if function exists
    const { data: existingFunction, error: checkError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', functionName)
      .eq('routine_schema', schema)
      .eq('routine_type', 'FUNCTION')
      .single()

    if (checkError || !existingFunction) {
      throw new SupabaseToolsError(`Function '${functionName}' does not exist in schema '${schema}'`, 'FUNCTION_NOT_FOUND', 404)
    }

    // Build DROP FUNCTION statement
    const dropStatement = `DROP FUNCTION ${schema}.${functionName}();`

    // Execute the DROP FUNCTION statement
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: dropStatement
    })

    if (dropError) {
      throw new SupabaseToolsError(
        `Failed to delete function: ${handleDatabaseError(dropError).message}`,
        'FUNCTION_DELETE_FAILED',
        500
      )
    }

    // Verify function was deleted
    const { data: verifyFunction, error: verifyError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', functionName)
      .eq('routine_schema', schema)
      .eq('routine_type', 'FUNCTION')
      .single()

    if (!verifyError && verifyFunction) {
      throw new SupabaseToolsError(
        'Function deletion could not be verified - function still exists',
        'FUNCTION_VERIFY_FAILED',
        500
      )
    }

    const response: DeleteFunctionResponse = {
      success: true,
      functionName,
      message: `Function '${functionName}' deleted successfully`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Function '${functionName}' deleted successfully`
    } as ApiResponse<DeleteFunctionResponse>)

  } catch (error: any) {
    console.error('Error in functions delete API:', error)

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