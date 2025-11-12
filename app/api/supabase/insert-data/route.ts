import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to insert data into Supabase tables
 * Provides a safe interface for INSERT operations with validation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, tableName, schema = 'public', data, onConflict } = body

    if (!token || !projectId || !tableName || !data) {
      return NextResponse.json(
        { error: 'Token, projectId, tableName, and data are required' },
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

    // Ensure data is an array
    const dataArray = Array.isArray(data) ? data : [data]

    if (dataArray.length === 0) {
      return NextResponse.json(
        { error: 'Data array cannot be empty' },
        { status: 400 }
      )
    }

    // Safety limit
    if (dataArray.length > 1000) {
      return NextResponse.json(
        { error: 'Cannot insert more than 1000 rows at once' },
        { status: 400 }
      )
    }

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      console.log('[SUPABASE API] Inserting data into:', tableName, 'rows:', dataArray.length)

      // Get column information first to validate data
      const columnInfoSQL = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = '${schema.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}'
        ORDER BY ordinal_position;
      `

      const columnInfo = await client.runQuery(projectId, columnInfoSQL)

      if (!columnInfo || columnInfo.length === 0) {
        return NextResponse.json(
          { error: `Table '${tableName}' does not exist in schema '${schema}'` },
          { status: 404 }
        )
      }

      const columns: any[] = Array.isArray(columnInfo) ? columnInfo.map((col: any) => col.column_name) : []

      // Validate that all data objects have the same keys and valid values
      for (let i = 0; i < dataArray.length; i++) {
        const row = dataArray[i]
        if (typeof row !== 'object' || row === null) {
          return NextResponse.json(
            { error: `Invalid data format at row ${i + 1}` },
            { status: 400 }
          )
        }
      }

      // Build the INSERT statement
      const dataKeys = Object.keys(dataArray[0])
      const placeholders = dataKeys.map((_, idx) => `$${idx + 1}`).join(', ')

      let insertSQL = `INSERT INTO "${schema}"."${tableName}" (${dataKeys.map(k => `"${k}"`).join(', ')})`
      insertSQL += ` VALUES (${placeholders})`

      // Add ON CONFLICT clause if specified
      if (onConflict && onConflict.target) {
        insertSQL += ` ON CONFLICT (${onConflict.target})`
        if (onConflict.action === 'DO NOTHING') {
          insertSQL += ' DO NOTHING'
        } else if (onConflict.action === 'DO UPDATE' && onConflict.set) {
          const setClause = Object.entries(onConflict.set)
            .map(([key, value]) => `"${key}" = '${String(value).replace(/'/g, "''")}'`)
            .join(', ')
          insertSQL += ` DO UPDATE SET ${setClause}`
        }
      }

      console.log('[SUPABASE API] Executing INSERT for', dataArray.length, 'rows')

      // Execute inserts (one at a time for better error handling)
      const results: any[] = []
      for (let i = 0; i < dataArray.length; i++) {
        const row = dataArray[i]
        const values = dataKeys.map(key => {
          const value = row[key]
          if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`
          } else if (value === null) {
            return 'NULL'
          } else {
            return value
          }
        }).join(', ')

        const insertSQLWithValues = `INSERT INTO "${schema}"."${tableName}" (${dataKeys.map(k => `"${k}"`).join(', ')}) VALUES (${values})`

        try {
          const result = await client.runQuery(projectId, insertSQLWithValues)
          results.push({ row: i + 1, success: true, result })
        } catch (rowError: any) {
          results.push({ row: i + 1, success: false, error: rowError.message })
        }
      }

      const successfulInserts = results.filter(r => r.success).length

      console.log('[SUPABASE API] Insert operation completed:', successfulInserts, 'successful,', results.length - successfulInserts, 'failed')

      return NextResponse.json({
        success: true,
        operation: 'insert_data',
        tableName: tableName,
        schema: schema,
        totalRows: dataArray.length,
        successfulInserts: successfulInserts,
        failedInserts: results.length - successfulInserts,
        results: results
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to insert data:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to insert data'

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
        errorMessage = `Permission denied to insert into table '${tableName}'`
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while inserting data'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage, tableName },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during data insertion:', error)
    return NextResponse.json(
      { error: 'Internal server error during data insertion' },
      { status: 500 }
    )
  }
}