import { NextRequest, NextResponse } from 'next/server'
import { executeManagementQuery } from '../../../../lib/supabase/management-api-utils'

/**
 * Server-side API route to drop tables in a Supabase project
 * Provides a safe interface for DROP TABLE operations
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, tableName, schema = 'public', options = {} } = body

    if (!token || !projectId || !tableName) {
      return NextResponse.json(
        { error: 'Token, projectId, and tableName are required' },
        { status: 400 }
      )
    }

    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return NextResponse.json(
        { error: 'Invalid table name format' },
        { status: 400 }
      )
    }

    // Validate schema name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      return NextResponse.json(
        { error: 'Invalid schema name format' },
        { status: 400 }
      )
    }

    // Import the Supabase Management API dynamically (server-only)
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      console.log('[SUPABASE API] Dropping table:', tableName, 'in project:', projectId)

      // Build the DROP TABLE SQL
      let dropTableSQL = `DROP TABLE IF EXISTS "${schema}"."${tableName}"`

      // Add CASCADE or RESTRICT based on options
      if (options.cascade === true) dropTableSQL += ' CASCADE'
      else if (options.restrict === true) dropTableSQL += ' RESTRICT'

      dropTableSQL += ';'

      console.log('[SUPABASE API] Executing DROP TABLE:', dropTableSQL)

      const result = await executeManagementQuery(client, projectId, dropTableSQL, 'DROP TABLE')

      console.log('[SUPABASE API] Table dropped successfully')

      return NextResponse.json({
        success: true,
        tableName,
        schema,
        message: `Table '${tableName}' dropped successfully`
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to drop table:', error)

      let errorMessage = 'Failed to drop table'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('does not exist')) {
        errorMessage = `Table '${tableName}' does not exist`
      } else if (error.message?.toLowerCase().includes('permission')) {
        errorMessage = `Permission denied to drop table`
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while dropping table'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage, tableName },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during table drop:', error)
    return NextResponse.json(
      { error: 'Internal server error during table drop' },
      { status: 500 }
    )
  }
}
