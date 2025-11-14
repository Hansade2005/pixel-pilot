import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to list tables and RLS policies using Supabase REST API
 * Uses https://api.supabase.com/v1/projects/{project_id}/database/query
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, includeRlsPolicies = true, schema = 'public', tableName } = body

    if (!token || !projectId) {
      return NextResponse.json(
        { error: 'Token and projectId are required' },
        { status: 400 }
      )
    }

    const API_BASE_URL = 'https://api.supabase.com/v1'

    // Function to execute SQL via Supabase REST API
    async function executeRestApiQuery(sql: string) {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`REST API error: ${response.status} - ${errorData.message || 'Unknown error'}`)
      }

      return await response.json()
    }

    console.log('[SUPABASE API] Listing tables and RLS policies...')

    try {
      // Query 1: List all tables in the specified schema
      let tablesQuery = `
        SELECT schemaname, tablename, tableowner
        FROM pg_tables
        WHERE schemaname = '${schema}'
        ORDER BY tablename
      `

      if (tableName) {
        tablesQuery = `
          SELECT schemaname, tablename, tableowner
          FROM pg_tables
          WHERE schemaname = '${schema}' AND tablename = '${tableName}'
          ORDER BY tablename
        `
      }

      const tablesResult = await executeRestApiQuery(tablesQuery)

      // Query 2: Get RLS policies if requested
      let policiesResult = null
      if (includeRlsPolicies) {
        let policiesQuery = `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies
          WHERE schemaname = '${schema}'
          ORDER BY tablename, policyname
        `

        if (tableName) {
          policiesQuery = `
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies
            WHERE schemaname = '${schema}' AND tablename = '${tableName}'
            ORDER BY tablename, policyname
          `
        }

        policiesResult = await executeRestApiQuery(policiesQuery)
      }

      // Query 3: Check which tables have RLS enabled
      let rlsEnabledQuery = `
        SELECT schemaname, tablename,
               rowsecurity as rls_enabled
        FROM pg_tables t
        LEFT JOIN pg_class c ON c.relname = t.tablename
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
        WHERE t.schemaname = '${schema}'
        ORDER BY tablename
      `

      if (tableName) {
        rlsEnabledQuery = `
          SELECT schemaname, tablename,
                 rowsecurity as rls_enabled
          FROM pg_tables t
          LEFT JOIN pg_class c ON c.relname = t.tablename
          LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
          WHERE t.schemaname = '${schema}' AND t.tablename = '${tableName}'
          ORDER BY tablename
        `
      }

      const rlsStatusResult = await executeRestApiQuery(rlsEnabledQuery)

      console.log('[SUPABASE API] Successfully retrieved table and RLS information')

      // Process and combine the results
      const tables = tablesResult.map((row: any) => ({
        schema: row.schemaname,
        name: row.tablename,
        owner: row.tableowner
      }))

      const rlsStatus = rlsStatusResult.reduce((acc: any, row: any) => {
        acc[row.tablename] = {
          rls_enabled: row.rls_enabled || false
        }
        return acc
      }, {})

      let policies = []
      if (policiesResult) {
        policies = policiesResult.map((row: any) => ({
          schema: row.schemaname,
          table: row.tablename,
          name: row.policyname,
          permissive: row.permissive,
          roles: row.roles,
          command: row.cmd,
          using: row.qual,
          with_check: row.with_check
        }))
      }

      // Combine tables with RLS status
      const tablesWithRls = tables.map((table: any) => ({
        ...table,
        rls_enabled: rlsStatus[table.name]?.rls_enabled || false,
        policies: policies.filter((policy: any) => policy.table === table.name)
      }))

      return NextResponse.json({
        success: true,
        operation: 'list_tables_rls',
        schema: schema,
        tables: tablesWithRls,
        total_tables: tables.length,
        tables_with_rls: tablesWithRls.filter((t: any) => t.rls_enabled).length,
        total_policies: policies.length
      })

    } catch (error: any) {
      console.error('[SUPABASE API] Failed to list tables and RLS policies:', error)

      let errorMessage = 'Failed to list tables and RLS policies'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid')) {
        errorMessage = 'Invalid or expired Supabase API token'
      } else if (error.message?.toLowerCase().includes('not found')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while querying database'
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