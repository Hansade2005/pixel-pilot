import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createExternalClient } from '@supabase/supabase-js'

// External Supabase configuration (where sites table is stored)
const EXTERNAL_SUPABASE_CONFIG = {
  URL: 'https://dlunpilhklsgvkegnnlp.supabase.co',
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo'
}

const externalSupabase = createExternalClient(
  EXTERNAL_SUPABASE_CONFIG.URL,
  EXTERNAL_SUPABASE_CONFIG.SERVICE_ROLE_KEY
)

/**
 * GET /api/projects/[projectId]/preview-slug
 * Get the reserved preview slug for a project from the sites table
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { projectId } = params

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Query the sites table for the project's preview slug
    const { data: site, error: siteError } = await externalSupabase
      .from('sites')
      .select('project_slug, url, site_type')
      .eq('project_id', projectId)
      .eq('site_type', 'preview')
      .eq('is_active', true)
      .maybeSingle()

    if (siteError) {
      console.error('Error fetching site:', siteError)
      return NextResponse.json(
        { error: 'Failed to fetch preview slug' },
        { status: 500 }
      )
    }

    if (!site) {
      return NextResponse.json(
        { previewSlug: null, previewUrl: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      previewSlug: site.project_slug,
      previewUrl: site.url || `https://${site.project_slug}.pipilot.dev/`
    })

  } catch (error) {
    console.error('Preview slug fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preview slug' },
      { status: 500 }
    )
  }
}
