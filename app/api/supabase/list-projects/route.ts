import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAccessToken } from '@/lib/cloud-sync'

/**
 * Server-side API route to list available Supabase projects for the authenticated user
 * This allows users to select which Supabase project to connect to their PixelPilot project
 * Automatically retrieves and refreshes the user's Supabase Management API token
 */
export async function POST(req: NextRequest) {
  try {
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
      console.log('[SUPABASE API] Fetching available projects...')
      const projects = await client.getProjects()

      console.log(`[SUPABASE API] Found ${projects?.length || 0} projects`)

      // Transform the projects to a more user-friendly format
      const formattedProjects = (projects || []).map(project => ({
        id: project.id,
        name: project.name,
        region: project.region,
        status: project.status,
        database: {
          host: project.database?.host,
          version: project.database?.version
        },
        createdAt: project.created_at,
        // Add the full project URL
        url: `https://${project.id}.supabase.co`
      }))

      return NextResponse.json({
        success: true,
        projects: formattedProjects,
        count: formattedProjects.length
      })

    } catch (error: any) {
      console.error('[SUPABASE API] Failed to fetch projects:', error)

      // Provide specific error messages based on the error type
      let errorMessage = 'Failed to fetch Supabase projects'

      if (error.message?.toLowerCase().includes('unauthorized') ||
          error.message?.toLowerCase().includes('invalid') ||
          error.message?.toLowerCase().includes('403')) {
        errorMessage = 'Invalid or expired Supabase Management API token'
      } else if (error.message?.toLowerCase().includes('network') ||
                 error.message?.toLowerCase().includes('fetch')) {
        errorMessage = 'Network error while fetching projects'
      } else if (error.message) {
        errorMessage = `Failed to fetch projects: ${error.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('[SUPABASE API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}