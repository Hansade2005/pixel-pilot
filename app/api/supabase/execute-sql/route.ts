import { NextRequest, NextResponse } from 'next/server'
import { executeManagementQuery } from '@/lib/supabase/management-api-utils'

/**
 * Server-side API route to execute SQL queries on Supabase database
 * Supports DDL operations like creating RLS policies, enabling RLS, and other database schema changes
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, sql, confirmDangerous = false } = body

    if (!token || !projectId || !sql) {
      return NextResponse.json(
        { error: 'Token, projectId, and sql are required' },
        { status: 400 }
      )
    }

    // Basic validation - prevent extremely dangerous operations unless explicitly confirmed
    const dangerousPatterns = [
      /\bDROP\s+DATABASE\b/i,
      /\bDROP\s+SCHEMA\b/i,
      /\bDROP\s+TABLE\b/i,
      /\bTRUNCATE\b.*WHERE\s*1\s*=\s*1/i, // TRUNCATE without WHERE
      /\bDELETE\s+FROM\b.*WHERE\s*1\s*=\s*1/i, // DELETE without WHERE
      /\bUPDATE\b.*SET.*WHERE\s*1\s*=\s*1/i // UPDATE without WHERE
    ]

    const isDangerous = dangerousPatterns.some(pattern => pattern.test(sql))
    if (isDangerous && !confirmDangerous) {
      return NextResponse.json(
        {
          error: 'This SQL operation is potentially dangerous. Please confirm by setting confirmDangerous: true',
          operation: 'dangerous_sql_detected'
        },
        { status: 400 }
      )
    }

    console.log('[SUPABASE API] Executing SQL query:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''))

    // Import the Supabase Management API
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      // Execute the SQL query using the management API utility
      const result = await executeManagementQuery(client, projectId, sql, 'SQL EXECUTION')

      console.log('[SUPABASE API] SQL execution completed successfully')

      // Return the result
      return NextResponse.json({
        success: true,
        operation: 'execute_sql',
        sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        result: result
      })

    } catch (error: any) {
      console.error('[SUPABASE API] SQL execution failed:', error)

      let errorMessage = 'SQL execution failed'
      if (error.message?.toLowerCase().includes('permission denied')) {
        errorMessage = 'Permission denied: Insufficient privileges to execute this SQL'
      } else if (error.message?.toLowerCase().includes('syntax error')) {
        errorMessage = 'SQL syntax error'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
          details: error.message
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