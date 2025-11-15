import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAccessToken } from '@/lib/cloud-sync'

/**
 * Server-side API route to fetch Supabase project API keys
 * This avoids CORS issues that occur when calling the Management API directly from the browser
 * Automatically retrieves and refreshes the user's Supabase Management API token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
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

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      // Fetch API keys for the specified project
      console.log('[SUPABASE API] Fetching API keys for project:', projectId)
      const apiKeys = await client.getProjectApiKeys(projectId)

      // Find the anon and service_role keys
      const anonKeyObj = apiKeys?.find((key: any) => key.name === 'anon')
      const serviceRoleKeyObj = apiKeys?.find((key: any) => key.name === 'service_role')

      if (!anonKeyObj?.api_key || !serviceRoleKeyObj?.api_key) {
        throw new Error('Could not retrieve API keys from Supabase Management API')
      }

      console.log('[SUPABASE API] Successfully fetched API keys')

      return NextResponse.json({
        success: true,
        anonKey: anonKeyObj.api_key,
        serviceRoleKey: serviceRoleKeyObj.api_key,
        projectUrl: `https://${projectId}.supabase.co`
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Failed to fetch API keys:', error)
      
      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to fetch API keys from Supabase'
      
      if (error.message?.toLowerCase().includes('unauthorized') || 
          error.message?.toLowerCase().includes('invalid') || 
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('not found') || 
                 error.message?.toLowerCase().includes('404')) {
        errorMessage = 'Project not found or access denied'
      } else if (error.message?.toLowerCase().includes('network') || 
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while fetching API keys'
      } else if (error.message) {
        errorMessage = `API key fetch failed: ${error.message}`
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage
        },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during API key fetch:', error)
    return NextResponse.json(
      { error: 'Internal server error during API key fetch' },
      { status: 500 }
    )
  }
}