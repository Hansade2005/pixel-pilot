import { NextRequest, NextResponse } from 'next/server'
import { getUserSupabaseConnection, getSupabaseServiceClient, handleDatabaseError } from '@/lib/supabase/tools-connection'
import { FunctionListResponse, ApiResponse, SupabaseToolsError, DatabaseFunction } from '@/lib/supabase/tools-types'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/supabase/functions/list
 * Lists all database functions
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

    // Query for all functions in the database
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select(`
        routine_name,
        routine_schema,
        routine_type,
        data_type,
        routine_definition,
        external_language
      `)
      .eq('routine_type', 'FUNCTION')
      .eq('routine_schema', 'public')

    if (functionsError) {
      throw new SupabaseToolsError(
        `Failed to list functions: ${handleDatabaseError(functionsError).message}`,
        'FUNCTION_LIST_FAILED',
        500
      )
    }

    // Get function arguments for each function
    const functionsWithArgs: DatabaseFunction[] = await Promise.all(
      (functions || []).map(async (func: any) => {
        try {
          // Get function arguments
          const { data: args, error: argsError } = await supabase
            .from('information_schema.parameters')
            .select('parameter_name, data_type, parameter_mode')
            .eq('specific_schema', func.routine_schema)
            .eq('specific_name', func.routine_name)
            .order('ordinal_position')

          const functionArgs = args ? args.map((arg: any) => ({
            name: arg.parameter_name || '',
            type: arg.data_type,
            default: undefined // Would need more complex query to get defaults
          })) : []

          return {
            name: func.routine_name,
            schema: func.routine_schema,
            language: func.external_language || 'sql',
            definition: func.routine_definition || '',
            arguments: functionArgs,
            returnType: func.data_type || 'void',
            volatility: 'VOLATILE', // Would need pg_proc query for this
            createdAt: new Date().toISOString() // Would need additional query
          }
        } catch (error) {
          // Return basic function info if args query fails
          return {
            name: func.routine_name,
            schema: func.routine_schema,
            language: func.external_language || 'sql',
            definition: func.routine_definition || '',
            arguments: [],
            returnType: func.data_type || 'void',
            volatility: 'VOLATILE',
            createdAt: new Date().toISOString()
          }
        }
      })
    )

    const response: FunctionListResponse = {
      functions: functionsWithArgs,
      totalCount: functionsWithArgs.length
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: `Found ${functionsWithArgs.length} functions`
    } as ApiResponse<FunctionListResponse>)

  } catch (error: any) {
    console.error('Error in functions list API:', error)

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