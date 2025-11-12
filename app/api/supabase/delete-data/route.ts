import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to delete data from Supabase tables
 * Provides a safe interface for DELETE operations with validation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, tableName, schema = 'public', where } = body

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

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      console.log('[SUPABASE API] Deleting data from:', tableName)

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

      // Build the DELETE statement
      let deleteSQL = `DELETE FROM "${schema}"."${tableName}"`

      // Add WHERE clause if provided
      if (where && typeof where === 'object' && Object.keys(where).length > 0) {
        const whereEntries = Object.entries(where)
        const whereClause = whereEntries.map(([key, value]) => {
          // Validate column name
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
            throw new Error(`Invalid column name: ${key}`)
          }

          if (value === null) {
            return `"${key}" IS NULL`
          } else if (typeof value === 'string') {
            return `"${key}" = '${value.replace(/'/g, "''")}'`
          } else {
            return `"${key}" = ${value}`
          }
        }).join(' AND ')

        deleteSQL += ` WHERE ${whereClause}`
      } else {
        // If no WHERE clause, this would delete all rows - require explicit confirmation
        return NextResponse.json(
          { error: 'WHERE clause is required for DELETE operations to prevent accidental data loss. Use an empty object {} to confirm deletion of all rows.' },
          { status: 400 }
        )
      }

      console.log('[SUPABASE API] Executing DELETE:', deleteSQL)

      // Get count before deletion for reporting
      const countBeforeSQL = `SELECT COUNT(*) as count_before FROM "${schema}"."${tableName}" WHERE ${Object.entries(where).map(([key, value]) => {
        if (value === null) return `"${key}" IS NULL`
        return `"${key}" = '${String(value).replace(/'/g, "''")}'`
      }).join(' AND ')}`

      const countBefore = await client.runQuery(projectId, countBeforeSQL)
      const countBeforeResult: any[] = Array.isArray(countBefore) ? countBefore : []
      const rowsToDelete = countBeforeResult && countBeforeResult[0] ? parseInt(countBeforeResult[0].count_before) : 0

      // Safety check - don't allow deletion of more than 1000 rows at once
      if (rowsToDelete > 1000) {
        return NextResponse.json(
          { error: `DELETE operation would affect ${rowsToDelete} rows, which exceeds the safety limit of 1000 rows. Use smaller batches or contact support.` },
          { status: 400 }
        )
      }

      const result = await client.runQuery(projectId, deleteSQL)

      console.log('[SUPABASE API] Delete completed, affected rows:', rowsToDelete)

      return NextResponse.json({
        success: true,
        operation: 'delete_data',
        tableName: tableName,
        schema: schema,
        deletedRows: rowsToDelete,
        where: where,
        sql: deleteSQL,
        result: result
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to delete data:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to delete data'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('does not exist')) {
        errorMessage = `Table '${tableName}' does not exist in schema '${schema}'`
      } else if (error.message?.toLowerCase().includes('violates')) {
        errorMessage = `Data constraint violation: ${error.message}`
      } else if (error.message?.toLowerCase().includes('permission')) {
        errorMessage = `Permission denied to delete from table '${tableName}'`
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while deleting data'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage, tableName },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during data deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error during data deletion' },
      { status: 500 }
    )
  }
}