import { NextRequest, NextResponse } from 'next/server'
import { executeManagementQuery } from '../../../../lib/supabase/management-api-utils'
import { getSupabaseAccessToken } from '@/lib/cloud-sync'

/**
 * Server-side API route to create tables in a Supabase project
 * Provides a safe interface for CREATE TABLE operations
 * Automatically retrieves and refreshes the user's Supabase Management API token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, tableName, schema = 'public', columns, options = {} } = body

    if (!projectId || !tableName || !columns) {
      return NextResponse.json(
        { error: 'projectId, tableName, and columns are required' },
        { status: 400 }
      )
    }

    // Get the valid Supabase Management API token automatically
    const token = await getSupabaseAccessToken()
    if (!token) {
      return NextResponse.json(
        { error: 'No valid Supabase Management API token found. Please authenticate with Supabase first.' },
        { status: 401 }
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
    const { executeManagementQuery } = await import('@/lib/supabase/management-api-utils')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      console.log('[SUPABASE API] Creating table:', tableName, 'in project:', projectId)

      // Build the CREATE TABLE statement
      let createTableSQL = `CREATE TABLE IF NOT EXISTS "${schema}"."${tableName}" (\n`

      // Process columns
      const columnDefinitions = []
      for (const column of columns) {
        if (!column.name || !column.type) {
          return NextResponse.json(
            { error: 'Each column must have a name and type' },
            { status: 400 }
          )
        }

        // Validate column name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column.name)) {
          return NextResponse.json(
            { error: `Invalid column name: ${column.name}` },
            { status: 400 }
          )
        }

        let columnDef = `  "${column.name}" ${column.type.toUpperCase()}`

        // Add constraints
        if (column.primaryKey) columnDef += ' PRIMARY KEY'
        if (column.notNull) columnDef += ' NOT NULL'
        if (column.unique) columnDef += ' UNIQUE'
        if (column.default !== undefined) {
          if (typeof column.default === 'string') {
            columnDef += ` DEFAULT '${column.default.replace(/'/g, "''")}'`
          } else {
            columnDef += ` DEFAULT ${column.default}`
          }
        }

        columnDefinitions.push(columnDef)
      }

      createTableSQL += columnDefinitions.join(',\n')
      createTableSQL += '\n)'

      // Add table options
      if (options.comment) {
        createTableSQL += `;\nCOMMENT ON TABLE "${schema}"."${tableName}" IS '${options.comment.replace(/'/g, "''")}'`
      }

      console.log('[SUPABASE API] Executing CREATE TABLE:', createTableSQL)

      const result = await executeManagementQuery(client, projectId, createTableSQL, 'CREATE TABLE')

      console.log('[SUPABASE API] Table created successfully')

      return NextResponse.json({
        success: true,
        tableName,
        schema,
        columns: columns.length,
        message: `Table '${tableName}' created successfully`
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to create table:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to create table'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('already exists')) {
        errorMessage = `Table '${tableName}' already exists`
      } else if (error.message?.toLowerCase().includes('syntax')) {
        errorMessage = `SQL syntax error: ${error.message}`
      } else if (error.message?.toLowerCase().includes('permission')) {
        errorMessage = `Permission denied to create table`
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while creating table'
      } else if (error.message) {
        errorMessage = `Database error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage, tableName },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during table creation:', error)
    return NextResponse.json(
      { error: 'Internal server error during table creation' },
      { status: 500 }
    )
  }
}