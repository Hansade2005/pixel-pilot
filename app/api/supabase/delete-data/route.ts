import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to delete data from Supabase tables using REST API
 * Supports both single row and bulk delete operations
 * Refactored to match the working test pattern
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, projectId, tableName, schema = 'public', where, ids } = body

    if (!token || !projectId || !tableName) {
      return NextResponse.json(
        { error: 'Token, projectId and tableName are required' },
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

    console.log('[SUPABASE API] Deleting data from:', tableName)

    // Use Supabase REST API directly like the working test
    const supabaseUrl = `https://${projectId}.supabase.co`

    // Get the service_role key from the management API
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      // Get API keys to obtain service_role key
      const apiKeys = await client.getProjectApiKeys(projectId)

      // Find the service_role key
      const serviceRoleKeyObj = apiKeys?.find((key: any) => key.name === 'service_role')

      if (!serviceRoleKeyObj?.api_key) {
        return NextResponse.json(
          { error: 'Could not retrieve service_role key for REST API access' },
          { status: 400 }
        )
      }

      const serviceRoleKey = serviceRoleKeyObj.api_key

      // Prepare headers for REST API using service_role key (same as test)
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Prefer': 'return=representation'
      }

      let deleteResults = []
      let totalDeleted = 0

      // Handle different delete scenarios - simplified to match test pattern
      if (ids && Array.isArray(ids) && ids.length > 0) {
        // Bulk delete by IDs - delete one by one like the test approach
        console.log('[SUPABASE API] Deleting by IDs:', ids.length, 'records')

        for (const id of ids) {
          try {
            const deleteUrl = `${supabaseUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`
            const response = await fetch(deleteUrl, {
              method: 'DELETE',
              headers
            })

            if (response.ok) {
              const deletedData = await response.json()
              const deletedCount = Array.isArray(deletedData) ? deletedData.length : 1
              deleteResults.push({ id, success: true, data: deletedData, count: deletedCount })
              totalDeleted += deletedCount
            } else {
              const errorText = await response.text()
              console.error('[SUPABASE API] Delete failed for ID:', id, errorText)
              deleteResults.push({ id, success: false, error: errorText })
            }
          } catch (error: any) {
            console.error('[SUPABASE API] Delete error for ID:', id, error.message)
            deleteResults.push({ id, success: false, error: error.message })
          }
        }
      } else if (where && typeof where === 'object') {
        // Delete based on WHERE conditions - build query like the test
        console.log('[SUPABASE API] Deleting with WHERE conditions:', where)

        // Build query parameters from where conditions (same as test)
        const queryParams = new URLSearchParams()

        for (const [column, condition] of Object.entries(where)) {
          if (typeof condition === 'object' && condition !== null) {
            // Handle operators like { eq: value }, { gt: value }, etc.
            for (const [operator, value] of Object.entries(condition)) {
              const paramName = `${column}.${operator}`
              queryParams.append(paramName, String(value))
            }
          } else {
            // Simple equality
            queryParams.append(`${column}`, `eq.${condition}`)
          }
        }

        const deleteUrl = `${supabaseUrl}/rest/v1/${tableName}?${queryParams.toString()}`
        console.log('[SUPABASE API] DELETE URL:', deleteUrl)

        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers
        })

        if (response.ok) {
          const deletedData = await response.json()
          const deletedCount = Array.isArray(deletedData) ? deletedData.length : 0
          totalDeleted = deletedCount
          deleteResults.push({ condition: where, success: true, data: deletedData, count: deletedCount })
        } else {
          const errorText = await response.text()
          console.error('[SUPABASE API] Delete failed:', errorText)
          return NextResponse.json({
            success: false,
            operation: 'delete_data',
            tableName: tableName,
            schema: schema,
            totalDeleted: 0,
            results: [{ condition: where, success: false, error: errorText }]
          }, { status: response.status })
        }
      } else {
        return NextResponse.json(
          { error: 'Either "ids" array or "where" conditions must be provided for delete operation' },
          { status: 400 }
        )
      }

      console.log('[SUPABASE API] Delete operation completed successfully via REST API')

      return NextResponse.json({
        success: true,
        operation: 'delete_data',
        tableName: tableName,
        schema: schema,
        totalDeleted: totalDeleted,
        results: deleteResults
      })

    } catch (error: any) {
      console.error('[SUPABASE API] Failed to delete data via REST API:', error)

      let errorMessage = 'Failed to delete data via REST API'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid')) {
        errorMessage = 'Invalid or expired Supabase API token'
      } else if (error.message?.toLowerCase().includes('not found')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while deleting data'
      } else if (error.message) {
        errorMessage = `REST API error: ${error.message}`
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