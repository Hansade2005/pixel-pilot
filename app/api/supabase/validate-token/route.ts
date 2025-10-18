import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to validate Supabase Management API tokens
 * This avoids CORS issues that occur when calling the Management API directly from the browser
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Import the Supabase Management API on the server side
    const { SupabaseManagementAPI } = await import('@dyad-sh/supabase-management-js')
    const client = new SupabaseManagementAPI({ accessToken: token })

    try {
      // Validate the token by fetching projects
      console.log('[SUPABASE API] Validating token on server side...')
      const projects = await client.getProjects()
      console.log('[SUPABASE API] Token validation successful, found', projects?.length || 0, 'projects')

      return NextResponse.json({
        valid: true,
        projects: projects || [],
        projectCount: projects?.length || 0
      })
    } catch (error: any) {
      console.error('[SUPABASE API] Token validation failed:', error)
      
      // Provide specific error messages based on the error type
      let errorMessage = 'Invalid Supabase Management API token'
      
      if (error.message?.toLowerCase().includes('unauthorized') || 
          error.message?.toLowerCase().includes('invalid') || 
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token. Please ensure you\'re using a valid Management API token from https://supabase.com/dashboard/account/tokens'
      } else if (error.message?.toLowerCase().includes('network') || 
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while validating token. Please check your connection and try again.'
      } else if (error.message) {
        errorMessage = `Token validation failed: ${error.message}`
      }

      return NextResponse.json(
        { 
          valid: false, 
          error: errorMessage,
          projects: [],
          projectCount: 0
        },
        { status: 401 }
      )
    }
  } catch (error: any) {
    console.error('[SUPABASE API] Server error during token validation:', error)
    return NextResponse.json(
      { error: 'Internal server error during token validation' },
      { status: 500 }
    )
  }
}