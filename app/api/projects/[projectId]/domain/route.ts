import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createExternalClient } from '@supabase/supabase-js'

// External Supabase configuration
const EXTERNAL_SUPABASE_CONFIG = {
  URL: 'https://dlunpilhklsgvkegnnlp.supabase.co',
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo'
}

const externalSupabase = createExternalClient(
  EXTERNAL_SUPABASE_CONFIG.URL, 
  EXTERNAL_SUPABASE_CONFIG.SERVICE_ROLE_KEY
)

/**
 * DELETE /api/projects/[projectId]/domain
 * Disconnect/delete custom domain from a PixelPilot project
 */
export async function DELETE(
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

    // Get the project's Supabase connection to find custom domain
    const { data: supabaseProject, error: projectError } = await supabase
      .from('supabase_projects')
      .select('*')
      .eq('pixelpilot_project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !supabaseProject) {
      return NextResponse.json(
        { error: 'Project not found or no custom domain connected' },
        { status: 404 }
      )
    }

    const customDomain = supabaseProject.custom_domain

    if (!customDomain) {
      return NextResponse.json(
        { error: 'No custom domain connected to this project' },
        { status: 404 }
      )
    }

    // Remove custom domain from supabase_projects
    const { error: updateError } = await supabase
      .from('supabase_projects')
      .update({
        custom_domain: null,
        custom_domain_verified: false,
        custom_domain_added_at: null
      })
      .eq('pixelpilot_project_id', projectId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error removing custom domain:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove custom domain' },
        { status: 500 }
      )
    }

    // Also remove from custom_domains table if exists
    const { error: domainDeleteError } = await externalSupabase
      .from('custom_domains')
      .delete()
      .eq('domain', customDomain)
      .eq('user_id', user.id)

    if (domainDeleteError) {
      console.error('Error deleting from custom_domains table:', domainDeleteError)
      // Don't fail the request, as the main update succeeded
    }

    // Optional: Remove domain from Vercel if VERCEL_TOKEN is configured
    if (process.env.VERCEL_TOKEN) {
      try {
        const vercelResponse = await fetch(`https://api.vercel.com/v9/projects/prj_JFqriEOhgPe8TVrwSk5kjhgTdS9g/domains/${customDomain}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
          },
        })

        if (!vercelResponse.ok) {
          console.warn('Failed to remove domain from Vercel:', await vercelResponse.text())
        }
      } catch (vercelError) {
        console.error('Error removing domain from Vercel:', vercelError)
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      message: `Custom domain ${customDomain} removed successfully`,
      removedDomain: customDomain
    })

  } catch (error) {
    console.error('Domain deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete custom domain' },
      { status: 500 }
    )
  }
}
