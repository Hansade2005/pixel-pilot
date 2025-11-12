import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to list tables in a Supabase project
 * This provides a safe way to explore the database schema
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, schema = 'public' } = body

    if (!token || !projectId) {
      return NextResponse.json(
        { error: 'Token and projectId are required' },
        { status: 400 }
      )
    }

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      // Get table information using a safe query
      console.log('[SUPABASE API] Listing tables for project:', projectId, 'schema:', schema)

      // Use a safe query to list tables from information_schema
      const listTablesSQL = `
        SELECT
          t.table_name,
          t.table_type,
          obj_description(c.oid, 'pg_class') as table_comment,
          pg_size_pretty(pg_total_relation_size(c.oid)) as size
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
        WHERE t.table_schema = '${schema.replace(/'/g, "''")}'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT LIKE 'pg_%'
          AND t.table_name NOT LIKE '_prisma_%'
        ORDER BY t.table_name;
      `

      const result = await client.runQuery(projectId, listTablesSQL)

      // Also get view information
      const listViewsSQL = `
        SELECT
          t.table_name as view_name,
          'VIEW' as table_type,
          obj_description(c.oid, 'pg_class') as table_comment,
          pg_size_pretty(pg_total_relation_size(c.oid)) as size
        FROM information_schema.views t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
        WHERE t.table_schema = '${schema.replace(/'/g, "''")}'
          AND t.table_name NOT LIKE 'pg_%'
        ORDER BY t.table_name;
      `

      const viewsResult = await client.runQuery(projectId, listViewsSQL)

      console.log('[SUPABASE API] Successfully listed tables and views')

      return NextResponse.json({
        success: true,
        schema: schema,
        tables: result || [],
        views: viewsResult || [],
        totalTables: (result || []).length,
        totalViews: (viewsResult || []).length
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to list tables:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to list tables'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while listing tables'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during table listing:', error)
    return NextResponse.json(
      { error: 'Internal server error during table listing' },
      { status: 500 }
    )
  }
}