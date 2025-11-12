import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to drop tables from Supabase projects
 * Provides a safe interface for DROP TABLE operations with confirmation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, tableName, schema = 'public', cascade = false, confirmDrop = false } = body

    if (!token || !projectId || !tableName) {
      return NextResponse.json(
        { error: 'Token, projectId, and tableName are required' },
        { status: 400 }
      )
    }

    // Validate table name (basic SQL injection prevention)
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

    // Require explicit confirmation for DROP TABLE operations
    if (!confirmDrop) {
      return NextResponse.json(
        { error: 'DROP TABLE operations require explicit confirmation. Set confirmDrop: true to proceed.' },
        { status: 400 }
      )
    }

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      console.log('[SUPABASE API] Dropping table:', tableName, 'from project:', projectId)

      // Verify table exists before dropping
      const tableCheckSQL = `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = '${schema.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}'
        ) as table_exists;
      `

      const tableCheck = await client.runQuery(projectId, tableCheckSQL)

      const tableCheckResult: any[] = Array.isArray(tableCheck) ? tableCheck : []
      if (!tableCheckResult || !tableCheckResult[0]?.table_exists) {
        return NextResponse.json(
          { error: `Table '${tableName}' does not exist in schema '${schema}'` },
          { status: 404 }
        )
      }

      // Get table information before dropping (for reporting)
      const tableInfoSQL = `
        SELECT
          pg_size_pretty(pg_total_relation_size(c.oid)) as size,
          obj_description(c.oid, 'pg_class') as description
        FROM pg_class c
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = '${schema.replace(/'/g, "''")}' AND c.relname = '${tableName.replace(/'/g, "''")}' AND c.relkind = 'r';
      `

      const tableInfo = await client.runQuery(projectId, tableInfoSQL)
      const tableInfoResult: any[] = Array.isArray(tableInfo) ? tableInfo : []
      const tableSize = tableInfoResult && tableInfoResult[0] ? tableInfoResult[0].size : 'unknown'
      const tableDescription = tableInfoResult && tableInfoResult[0] ? tableInfoResult[0].description : null

      // Get row count before dropping
      const countSQL = `SELECT COUNT(*) as row_count FROM "${schema}"."${tableName}"`
      const countResult = await client.runQuery(projectId, countSQL)
      const countResultArray: any[] = Array.isArray(countResult) ? countResult : []
      const rowCount = countResultArray && countResultArray[0] ? parseInt(countResultArray[0].row_count) : 0

      // Build the DROP TABLE statement
      let dropTableSQL = `DROP TABLE`

      if (!cascade) {
        dropTableSQL += ` IF EXISTS`
      }

      dropTableSQL += ` "${schema}"."${tableName}"`

      if (cascade) {
        dropTableSQL += ` CASCADE`
      } else {
        dropTableSQL += ` RESTRICT`
      }

      console.log('[SUPABASE API] Executing DROP TABLE:', dropTableSQL)

      const result = await client.runQuery(projectId, dropTableSQL)

      console.log('[SUPABASE API] Table dropped successfully')

      return NextResponse.json({
        success: true,
        operation: 'drop_table',
        tableName: tableName,
        schema: schema,
        cascade: cascade,
        tableInfo: {
          size: tableSize,
          rowCount: rowCount,
          description: tableDescription
        },
        sql: dropTableSQL,
        result: result
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to drop table:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to drop table'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('does not exist')) {
        errorMessage = `Table '${tableName}' does not exist in schema '${schema}'`
      } else if (error.message?.toLowerCase().includes('cannot drop') ||
                 error.message?.toLowerCase().includes('still referenced')) {
        errorMessage = `Cannot drop table '${tableName}' because it is still referenced by other objects. Use cascade: true to force drop.`
      } else if (error.message?.toLowerCase().includes('permission')) {
        errorMessage = `Permission denied to drop table '${tableName}'`
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