import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const databaseId = params.id
    const { query } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify database ownership via workspace
    const { data: database, error: dbError } = await supabase
      .from('databases')
      .select('id, name, workspace_id, workspaces!inner(user_id)')
      .eq('id', databaseId)
      .single()

    if (dbError || !database) {
      return NextResponse.json(
        { error: 'Database not found' },
        { status: 404 }
      )
    }

    // @ts-ignore - Supabase join typing
    if (database.workspaces.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Basic query validation and safety checks
    const trimmedQuery = query.trim()

    // Prevent dangerous operations without explicit confirmation
    const dangerousPatterns = [
      /DROP\s+(?:DATABASE|SCHEMA|TABLE|VIEW|INDEX)/i,
      /TRUNCATE\s+TABLE/i,
      /DELETE\s+FROM\s+\w+\s*(?!WHERE\s+\w+)/i, // DELETE without WHERE
      /UPDATE\s+\w+\s+SET\s+.*?(?!WHERE\s+\w+)/i, // UPDATE without WHERE
      /ALTER\s+TABLE/i,
      /CREATE\s+(?:DATABASE|SCHEMA)/i,
      /GRANT|REVOKE/i,
      /EXECUTE/i
    ]

    const isDangerous = dangerousPatterns.some(pattern => pattern.test(trimmedQuery))

    if (isDangerous) {
      return NextResponse.json(
        {
          error: 'Potentially dangerous query detected',
          message: 'This query may modify or delete data. Please review and confirm the operation.',
          requiresConfirmation: true,
          query: trimmedQuery
        },
        { status: 400 }
      )
    }

    // Execute the query
    const startTime = Date.now()

    try {
      // Use service role client for SQL execution (admin privileges)
      const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Use Supabase's rpc function for safe SQL execution
      const { data, error } = await serviceSupabase.rpc('execute_sql_admin', {
        sql_query: trimmedQuery
      })

      const executionTime = Date.now() - startTime

      if (error) {
        return NextResponse.json(
          {
            error: 'Query execution failed',
            message: error.message,
            details: error.details,
            hint: error.hint,
            executionTime
          },
          { status: 400 }
        )
      }

      // The RPC function returns a JSON object with success/error info
      if (!data || typeof data !== 'object') {
        return NextResponse.json(
          {
            error: 'Invalid response from database',
            executionTime
          },
          { status: 500 }
        )
      }

      // Check if the RPC function returned an error
      if (data.success === false) {
        return NextResponse.json(
          {
            error: 'Query execution failed',
            message: data.error || 'Unknown database error',
            details: data.detail,
            executionTime
          },
          { status: 400 }
        )
      }

      // Format the successful response
      const queryType = trimmedQuery.toUpperCase().split(' ')[0]

      let result = {
        success: true,
        query: trimmedQuery,
        queryType,
        executionTime,
        rowCount: data.rowCount || 0,
        columns: [] as string[],
        rows: [] as any[],
        message: data.message || ''
      }

      if (queryType === 'SELECT' && data.data) {
        // For SELECT queries, data.data contains the result rows
        if (Array.isArray(data.data)) {
          result.rowCount = data.data.length
          result.rows = data.data

          // Extract column names from first row if available
          if (data.data.length > 0 && typeof data.data[0] === 'object') {
            result.columns = Object.keys(data.data[0])
          }
        }
      }

      return NextResponse.json(result)

    } catch (executionError) {
      const executionTime = Date.now() - startTime

      return NextResponse.json(
        {
          error: 'Query execution failed',
          message: executionError instanceof Error ? executionError.message : 'Unknown execution error',
          executionTime
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('[SQL Execute] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to execute query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Note: This endpoint uses the Supabase RPC function 'execute_sql_admin' that needs to be created in the database.
// Run the SQL in supabase-sql-functions.sql to create the required function.
//
// The execute_sql_admin function:
// - Accepts a sql_query parameter (string)
// - Executes queries with fewer restrictions (admin operations)
// - Returns structured JSON responses
// - Has appropriate security policies for service role access
//
// This implementation uses the service role key for execution, which provides
// full database access while the function itself includes safety checks.

