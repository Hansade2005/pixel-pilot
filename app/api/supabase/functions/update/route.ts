import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { UpdateFunctionRequest, UpdateFunctionResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/functions/update
 * Updates an existing database function
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
    const body: UpdateFunctionRequest = await request.json()
    const {
      functionName,
      schema = 'public',
      newDefinition,
      newArguments,
      newReturnType,
      newVolatility
    } = body

    if (!functionName || typeof functionName !== 'string') {
      throw new SupabaseToolsError('functionName is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    if (!newDefinition || typeof newDefinition !== 'string') {
      throw new SupabaseToolsError('newDefinition is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if function exists
    const { data: existingFunction, error: checkError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, data_type')
      .eq('routine_name', functionName)
      .eq('routine_schema', schema)
      .eq('routine_type', 'FUNCTION')
      .single()

    if (checkError || !existingFunction) {
      throw new SupabaseToolsError(`Function '${functionName}' does not exist in schema '${schema}'`, 'FUNCTION_NOT_FOUND', 404)
    }

    // Get current function arguments if not provided
    let currentArgs: Array<{ name: string; type: string; default: any }> = []
    if (!newArguments) {
      const { data: args, error: argsError } = await supabase
        .from('information_schema.parameters')
        .select('parameter_name, data_type, parameter_mode')
        .eq('specific_schema', schema)
        .eq('specific_name', functionName)
        .order('ordinal_position')

      if (!argsError && args) {
        currentArgs = args.map((arg: any) => ({
          name: arg.parameter_name || '',
          type: arg.data_type,
          default: undefined
        }))
      }
    }

    const argsToUse = newArguments || currentArgs
    const returnTypeToUse = newReturnType || existingFunction.data_type || 'void'
    const volatilityToUse = newVolatility || 'VOLATILE'

    // Build function arguments string
    const argsString = argsToUse.length > 0
      ? argsToUse.map((arg: any) => `${arg.name} ${arg.type}${arg.default ? ` DEFAULT ${arg.default}` : ''}`).join(', ')
      : ''

    // Build CREATE OR REPLACE FUNCTION statement (this will update the existing function)
    const updateStatement = `
      CREATE OR REPLACE FUNCTION ${schema}.${functionName}(${argsString})
      RETURNS ${returnTypeToUse}
      LANGUAGE plpgsql
      ${volatilityToUse !== 'VOLATILE' ? volatilityToUse : ''}
      AS $$
      ${newDefinition}
      $$;
    `.trim()

    // Execute the CREATE OR REPLACE FUNCTION statement
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: updateStatement
    })

    if (updateError) {
      throw new SupabaseToolsError(
        `Failed to update function: ${handleDatabaseError(updateError).message}`,
        'FUNCTION_UPDATE_FAILED',
        500
      )
    }

    // Verify function was updated
    const { data: verifyFunction, error: verifyError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', functionName)
      .eq('routine_schema', schema)
      .eq('routine_type', 'FUNCTION')
      .single()

    if (verifyError || !verifyFunction) {
      throw new SupabaseToolsError(
        'Function update could not be verified',
        'FUNCTION_VERIFY_FAILED',
        500
      )
    }

    const response: UpdateFunctionResponse = {
      success: true,
      functionName,
      message: `Function '${functionName}' updated successfully`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Function '${functionName}' updated successfully`
    } as ApiResponse<UpdateFunctionResponse>)

  } catch (error: any) {
    console.error('Error in functions update API:', error)

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