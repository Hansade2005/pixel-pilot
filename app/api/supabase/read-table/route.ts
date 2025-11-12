import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to read data from a Supabase table
 * Includes safety limits and proper error handling
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      token,
      projectId,
      tableName,
      schema = 'public',
      limit = 100,
      offset = 0,
      orderBy,
      orderDirection = 'ASC',
      whereClause
    } = body

    if (!token || !projectId || !tableName) {
      return NextResponse.json(
        { error: 'Token, projectId, and tableName are required' },
        { status: 400 }
      )
    }

    // Safety limits
    const maxLimit = 1000
    const actualLimit = Math.min(parseInt(limit) || 100, maxLimit)

    if (actualLimit > maxLimit) {
      return NextResponse.json(
        { error: `Limit cannot exceed ${maxLimit} rows for safety` },
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

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      console.log('[SUPABASE API] Reading table:', tableName, 'project:', projectId)

      // Build the SELECT query with safety measures
      let selectSQL = `SELECT * FROM "${schema}"."${tableName}"`

      // Add WHERE clause if provided (with basic validation)
      if (whereClause && typeof whereClause === 'string') {
        // Basic validation - only allow simple WHERE clauses
        if (!/^[\w\s<>=!'"().-]+$/.test(whereClause)) {
          return NextResponse.json(
            { error: 'Invalid WHERE clause format' },
            { status: 400 }
          )
        }
        selectSQL += ` WHERE ${whereClause}`
      }

      // Add ORDER BY if provided
      if (orderBy && typeof orderBy === 'string') {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(orderBy)) {
          return NextResponse.json(
            { error: 'Invalid ORDER BY column name' },
            { status: 400 }
          )
        }
        const direction = orderDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
        selectSQL += ` ORDER BY "${orderBy}" ${direction}`
      }

      // Add LIMIT and OFFSET
      selectSQL += ` LIMIT ${actualLimit} OFFSET ${parseInt(offset) || 0}`

      console.log('[SUPABASE API] Executing query:', selectSQL)

      const result = await client.runQuery(projectId, selectSQL)

      // Also get table structure information
      const tableInfoSQL = `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = '${schema.replace(/'/g, "''")}' AND table_name = '${tableName.replace(/'/g, "''")}'
        ORDER BY ordinal_position;
      `

      const tableInfo = await client.runQuery(projectId, tableInfoSQL)

      // Get row count (with safety limit)
      const countSQL = `SELECT COUNT(*) as total_rows FROM "${schema}"."${tableName}"`
      const countResult = await client.runQuery(projectId, countSQL)
      const countResultArray: any[] = Array.isArray(countResult) ? countResult : []
      const totalRows = countResultArray && countResultArray[0] ? parseInt(countResultArray[0].total_rows) : 0

      console.log('[SUPABASE API] Successfully read table data')

      return NextResponse.json({
        success: true,
        tableName: tableName,
        schema: schema,
        data: result || [],
        columns: tableInfo || [],
        totalRows: totalRows,
        returnedRows: (result || []).length,
        limit: actualLimit,
        offset: parseInt(offset) || 0,
        hasMore: ((result || []).length === actualLimit) && (totalRows > actualLimit + (parseInt(offset) || 0))
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to read table:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to read table data'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('does not exist')) {
        errorMessage = `Table '${tableName}' does not exist in schema '${schema}'`
      } else if (error.message?.toLowerCase().includes('permission')) {
        errorMessage = `Permission denied to read table '${tableName}'`
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while reading table'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during table reading:', error)
    return NextResponse.json(
      { error: 'Internal server error during table reading' },
      { status: 500 }
    )
  }
}