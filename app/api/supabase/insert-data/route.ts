import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAccessToken } from '@/lib/cloud-sync'

/**
 * Server-side API route to insert data into Supabase tables using REST API
 * Provides a safe interface for INSERT operations with validation
 * Automatically retrieves and refreshes the user's Supabase Management API token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, tableName, schema = 'public', data, onConflict } = body

    if (!projectId || !tableName || !data) {
      return NextResponse.json(
        { error: 'projectId, tableName, and data are required' },
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

    console.log('[SUPABASE API] Inserting data into:', tableName, 'rows:', dataArray.length)

    // Use Supabase REST API instead of Management API
    const supabaseUrl = `https://${projectId}.supabase.co`
    let restApiUrl = `${supabaseUrl}/rest/v1/${tableName}`

    // First, get the anon key from the management API
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      // Get API keys to obtain service_role key (needed for server-side operations)
      const apiKeys = await client.getProjectApiKeys(projectId)

      // Find the service_role key (has elevated permissions, bypasses RLS)
      const serviceRoleKeyObj = apiKeys?.find((key: any) => key.name === 'service_role')

      if (!serviceRoleKeyObj?.api_key) {
        return NextResponse.json(
          { error: 'Could not retrieve service_role key for REST API access' },
          { status: 400 }
        )
      }

      const serviceRoleKey = serviceRoleKeyObj.api_key

      // Prepare headers for REST API using service_role key
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Prefer': 'return=representation'
      }

      // Add upsert preference if onConflict is specified
      if (onConflict && onConflict.target) {
        if (onConflict.action === 'DO NOTHING') {
          headers['Prefer'] += ',resolution=ignore-duplicates'
        } else if (onConflict.action === 'DO UPDATE') {
          headers['Prefer'] += ',resolution=merge-duplicates'
        }

        // Add on_conflict query parameter
        const conflictTarget = Array.isArray(onConflict.target)
          ? onConflict.target.join(',')
          : onConflict.target
        restApiUrl += `?on_conflict=${encodeURIComponent(conflictTarget)}`
      }

      console.log('[SUPABASE API] Executing REST API INSERT for', dataArray.length, 'rows')

      // Execute the REST API request
      const response = await fetch(restApiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(dataArray.length === 1 ? dataArray[0] : dataArray)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SUPABASE API] REST API insert failed:', response.status, errorText)

        let errorMessage = 'Failed to insert data via REST API'
        if (response.status === 401) {
          errorMessage = 'Unauthorized: Invalid API key'
        } else if (response.status === 403) {
          errorMessage = 'Forbidden: Insufficient permissions'
        } else if (response.status === 404) {
          errorMessage = `Table '${tableName}' not found`
        } else if (response.status === 409) {
          errorMessage = 'Conflict: Data constraint violation'
        } else if (errorText) {
          errorMessage = `Database error: ${errorText}`
        }

        return NextResponse.json({
          success: false,
          operation: 'insert_data',
          tableName: tableName,
          schema: schema,
          totalRows: dataArray.length,
          successfulInserts: 0,
          failedInserts: dataArray.length,
          results: [{ row: 'all', success: false, error: errorMessage }]
        }, { status: response.status })
      }

      // Parse the response
      const insertedData = await response.json()
      const insertedCount = Array.isArray(insertedData) ? insertedData.length : 1

      console.log('[SUPABASE API] Insert operation completed successfully via REST API')

      return NextResponse.json({
        success: true,
        operation: 'insert_data',
        tableName: tableName,
        schema: schema,
        totalRows: dataArray.length,
        successfulInserts: insertedCount,
        failedInserts: 0,
        results: [{ row: 'all', success: true, data: insertedData }]
      })

    } catch (error: any) {
      console.error('[SUPABASE API] Failed to insert data via REST API:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to insert data via REST API'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('401')) {
        errorMessage = 'Invalid or expired Supabase API token'
      } else if (error.message?.toLowerCase().includes('not found') ||
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while inserting data'
      } else if (error.message) {
        errorMessage = `REST API error: ${error.message}`
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