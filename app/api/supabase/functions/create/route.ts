import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { CreateFunctionRequest, CreateFunctionResponse, ApiResponse, SupabaseToolsError } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/supabase/functions/create
 * Creates a new database function
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
    const body: CreateFunctionRequest = await request.json()
    const {
      functionName,
      schema = 'public',
      definition,
      arguments: funcArgs = [],
      returnType,
      language = 'plpgsql',
      volatility = 'VOLATILE'
    } = body

    if (!functionName || typeof functionName !== 'string') {
      throw new SupabaseToolsError('functionName is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    if (!definition || typeof definition !== 'string') {
      throw new SupabaseToolsError('definition is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    if (!returnType || typeof returnType !== 'string') {
      throw new SupabaseToolsError('returnType is required and must be a string', 'VALIDATION_ERROR', 400)
    }

    // Validate function name (PostgreSQL rules)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
      throw new SupabaseToolsError(
        'Invalid function name. Must start with letter or underscore, contain only alphanumeric and underscores',
        'VALIDATION_ERROR',
        400
      )
    }

    // Get user's Supabase connection
    const connection = await getUserSupabaseConnection(user.id)
    const supabase = getSupabaseServiceClient(connection)

    // Check if function already exists
    const { data: existingFunction, error: checkError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', functionName)
      .eq('routine_schema', schema)
      .eq('routine_type', 'FUNCTION')
      .single()

    if (!checkError && existingFunction) {
      throw new SupabaseToolsError(`Function '${functionName}' already exists in schema '${schema}'`, 'FUNCTION_EXISTS', 409)
    }

    // Build function arguments string
    const argsString = funcArgs.length > 0
      ? funcArgs.map(arg => `${arg.name} ${arg.type}${arg.default ? ` DEFAULT ${arg.default}` : ''}`).join(', ')
      : ''

    // Build CREATE FUNCTION statement
    const createStatement = `
      CREATE OR REPLACE FUNCTION ${schema}.${functionName}(${argsString})
      RETURNS ${returnType}
      LANGUAGE ${language}
      ${volatility !== 'VOLATILE' ? volatility : ''}
      AS $$
      ${definition}
      $$;
    `.trim()

    // Execute the CREATE FUNCTION statement
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createStatement
    })

    if (createError) {
      throw new SupabaseToolsError(
        `Failed to create function: ${handleDatabaseError(createError).message}`,
        'FUNCTION_CREATE_FAILED',
        500
      )
    }

    // Verify function was created
    const { data: verifyFunction, error: verifyError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', functionName)
      .eq('routine_schema', schema)
      .eq('routine_type', 'FUNCTION')
      .single()

    if (verifyError || !verifyFunction) {
      throw new SupabaseToolsError(
        'Function creation could not be verified',
        'FUNCTION_VERIFY_FAILED',
        500
      )
    }

    const response: CreateFunctionResponse = {
      success: true,
      functionName,
      message: `Function '${functionName}' created successfully`
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Function '${functionName}' created successfully`
    } as ApiResponse<CreateFunctionResponse>)

  } catch (error: any) {
    console.error('Error in functions create API:', error)

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