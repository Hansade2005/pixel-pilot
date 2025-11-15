import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAccessToken } from '@/lib/cloud-sync'

/**
 * Server-side API route to read data from Supabase tables using REST API
 * Supports both full table reads and filtered/sectorial reads
 * Refactored to match the working test pattern
 * Automatically retrieves and refreshes the user's Supabase Management API token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      projectId,
      tableName,
      schema = 'public',
      select = '*',
      where,
      orderBy,
      limit,
      offset = 0,
      includeCount = false
    } = body

    if (!projectId || !tableName) {
      return NextResponse.json(
        { error: 'projectId and tableName are required' },
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

    console.log('[SUPABASE API] Reading data from:', tableName, 'select:', select)

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
        'apikey': serviceRoleKey
      }

      // Build query parameters - simplified to match test pattern
      const queryParams = new URLSearchParams()

      // Add select parameter
      if (select && select !== '*') {
        queryParams.append('select', select)
      }

      // Add WHERE conditions (same as test)
      if (where && typeof where === 'object') {
        for (const [column, condition] of Object.entries(where)) {
          if (typeof condition === 'object' && condition !== null) {
            // Handle operators like { eq: value }, { gt: value }, etc.
            for (const [operator, value] of Object.entries(condition)) {
              const paramName = `${column}.${operator}`
              queryParams.append(paramName, String(value))
            }
          } else {
            // Simple equality
            queryParams.append(column, `eq.${condition}`)
          }
        }
      }

      // Add ordering (simplified like test)
      if (orderBy && typeof orderBy === 'object') {
        for (const [column, direction] of Object.entries(orderBy)) {
          const orderValue = direction === 'desc' ? `${column}.desc` : column
          queryParams.append('order', orderValue)
        }
      } else if (orderBy && typeof orderBy === 'string') {
        queryParams.append('order', orderBy)
      }

      // Add limit
      if (limit && typeof limit === 'number' && limit > 0) {
        queryParams.append('limit', String(limit))
      }

      // Add offset
      if (offset && typeof offset === 'number' && offset > 0) {
        queryParams.append('offset', String(offset))
      }

      // Build final URL like the test
      const queryString = queryParams.toString()
      const finalUrl = queryString ? `${supabaseUrl}/rest/v1/${tableName}?${queryString}` : `${supabaseUrl}/rest/v1/${tableName}`

      console.log('[SUPABASE API] Executing GET request:', finalUrl)

      // Execute the GET request (same as test)
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SUPABASE API] Read failed:', response.status, errorText)

        let errorMessage = 'Failed to read data via REST API'
        if (response.status === 401) {
          errorMessage = 'Unauthorized: Invalid API key'
        } else if (response.status === 403) {
          errorMessage = 'Forbidden: Insufficient permissions'
        } else if (response.status === 404) {
          errorMessage = `Table '${tableName}' not found`
        } else if (errorText) {
          errorMessage = `Database error: ${errorText}`
        }

        return NextResponse.json({
          success: false,
          operation: 'read_table',
          tableName: tableName,
          schema: schema,
          data: [],
          count: 0,
          error: errorMessage
        }, { status: response.status })
      }

      // Parse the response (same as test)
      const data = await response.json()
      const dataArray = Array.isArray(data) ? data : [data]
      const count = dataArray.length

      // Get total count if requested (optional, like test)
      let totalCount = null
      if (includeCount && count > 0) {
        try {
          const headResponse = await fetch(finalUrl, {
            method: 'HEAD',
            headers
          })

          if (headResponse.ok) {
            const contentRange = headResponse.headers.get('content-range')
            if (contentRange) {
              // Parse "0-9/100" format
              const match = contentRange.match(/(\d+)-(\d+)\/(\d+)/)
              if (match) {
                totalCount = parseInt(match[3])
              }
            }
          }
        } catch (error) {
          console.warn('[SUPABASE API] Could not get total count:', error instanceof Error ? error.message : String(error))
        }
      }

      console.log('[SUPABASE API] Read operation completed successfully via REST API')

      return NextResponse.json({
        success: true,
        operation: 'read_table',
        tableName: tableName,
        schema: schema,
        data: dataArray,
        count: count,
        totalCount: totalCount,
        limit: limit,
        offset: offset,
        hasMore: totalCount ? (offset + count) < totalCount : false
      })

    } catch (error: any) {
      console.error('[SUPABASE API] Failed to read data via REST API:', error)

      let errorMessage = 'Failed to read data via REST API'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid')) {
        errorMessage = 'Invalid or expired Supabase API token'
      } else if (error.message?.toLowerCase().includes('not found')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while reading data'
      } else if (error.message) {
        errorMessage = `REST API error: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage, tableName },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during data reading:', error)
    return NextResponse.json(
      { error: 'Internal server error during data reading' },
      { status: 500 }
    )
  }
}