import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to update data in Supabase tables
 * Provides a safe interface for UPDATE operations with validation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, tableName, schema = 'public', set, where } = body

    if (!token || !projectId || !tableName || !set || !where) {
      return NextResponse.json(
        { error: 'Token, projectId, tableName, set, and where are required' },
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

    // Validate set object
    if (typeof set !== 'object' || set === null || Object.keys(set).length === 0) {
      return NextResponse.json(
        { error: 'Set must be a non-empty object' },
        { status: 400 }
      )
    }

    // Validate where object
    if (typeof where !== 'object' || where === null || Object.keys(where).length === 0) {
      return NextResponse.json(
        { error: 'Where must be a non-empty object' },
        { status: 400 }
      )
    }

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      console.log('[SUPABASE API] Updating data in:', tableName)

      // Verify table exists
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

      // Build the UPDATE statement
      let updateSQL = `UPDATE "${schema}"."${tableName}" SET `

      // Build SET clause
      const setEntries = Object.entries(set)
      const setClause = setEntries.map(([key, value]) => {
        // Validate column name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          throw new Error(`Invalid column name: ${key}`)
        }

        if (typeof value === 'string') {
          return `"${key}" = '${value.replace(/'/g, "''")}'`
        } else if (value === null) {
          return `"${key}" = NULL`
        } else if (typeof value === 'boolean') {
          return `"${key}" = ${value}`
        } else {
          return `"${key}" = ${value}`
        }
      }).join(', ')

      updateSQL += setClause

      // Build WHERE clause
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
        } else if (typeof value === 'boolean') {
          return `"${key}" = ${value}`
        } else {
          return `"${key}" = ${value}`
        }
      }).join(' AND ')

      updateSQL += ` WHERE ${whereClause}`

      console.log('[SUPABASE API] Executing UPDATE:', updateSQL)

      const result = await client.runQuery(projectId, updateSQL)

      // Get affected row count (PostgreSQL specific)
      const affectedRowsSQL = `SELECT COUNT(*) as affected FROM "${schema}"."${tableName}" WHERE ${whereClause}`
      const affectedResult = await client.runQuery(projectId, affectedRowsSQL)
      const affectedRowsResult: any[] = Array.isArray(affectedResult) ? affectedResult : []
      const affectedRows = affectedRowsResult && affectedRowsResult[0] ? parseInt(affectedRowsResult[0].affected) : 0

      console.log('[SUPABASE API] Update completed, affected rows:', affectedRows)

      return NextResponse.json({
        success: true,
        operation: 'update_data',
        tableName: tableName,
        schema: schema,
        affectedRows: affectedRows,
        set: set,
        where: where,
        sql: updateSQL,
        result: result
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to update data:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to update data'

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
        errorMessage = `Permission denied to update table '${tableName}'`
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while updating data'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage, tableName },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during data update:', error)
    return NextResponse.json(
      { error: 'Internal server error during data update' },
      { status: 500 }
    )
  }
}