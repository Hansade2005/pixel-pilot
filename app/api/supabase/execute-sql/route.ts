import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to execute SQL queries via Supabase Management API
 * This avoids CORS issues that occur when calling the Management API directly from the browser
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, sql } = body

    if (!token || !projectId || !sql) {
      return NextResponse.json(
        { error: 'Token, projectId, and sql are required' },
        { status: 400 }
      )
    }

    // Validate that this is not a SELECT operation (security measure)
    const trimmedSql = sql.trim()
    if (trimmedSql.toUpperCase().startsWith('SELECT')) {
      return NextResponse.json(
        { error: 'SELECT operations are not allowed. Only CREATE, INSERT, UPDATE, DELETE operations are permitted.' },
        { status: 403 }
      )
    }

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      // Execute the SQL using the Management API's runQuery method
      console.log('[SUPABASE API] Executing SQL query for project:', projectId)
      const result = await client.runQuery(projectId, sql)
      console.log('[SUPABASE API] SQL execution successful')

      return NextResponse.json({
        success: true,
        action: 'executed',
        sql: sql,
        message: '✅ SQL executed successfully using service role permissions.',
        result: {
          operation: sql.split(' ')[0].toUpperCase(),
          status: 'completed',
          note: 'Database operation completed via Supabase Management API',
          executionResult: result
        }
      })
    } catch (error: any) {
      console.error('[SUPABASE API] SQL execution failed:', error)
      
      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to execute SQL query'
      
      if (error.message?.toLowerCase().includes('unauthorized') || 
          error.message?.toLowerCase().includes('invalid') || 
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') || 
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('syntax')) {
        errorMessage = `SQL syntax error: ${error.message}`
      } else if (error.message?.toLowerCase().includes('permission')) {
        errorMessage = `Permission denied: ${error.message}`
      } else if (error.message?.toLowerCase().includes('network') || 
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while executing SQL'
      } else if (error.message) {
        errorMessage = `SQL execution failed: ${error.message}`
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          sql: sql
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during SQL execution:', error)
    return NextResponse.json(
      { error: 'Internal server error during SQL execution' },
      { status: 500 }
    )
  }
}