import { createClient } from '@/lib/supabase/server'
import { createClient as createExternalClient } from '@supabase/supabase-js'

// External Supabase configuration (same as preview route)
const EXTERNAL_SUPABASE_CONFIG = {
  URL: 'https://dlunpilhklsgvkegnnlp.supabase.co',
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo'
}

const externalSupabase = createExternalClient(
  EXTERNAL_SUPABASE_CONFIG.URL,
  EXTERNAL_SUPABASE_CONFIG.SERVICE_ROLE_KEY
)

export async function POST(request: Request) {
  try {
    const { slug, projectId } = await request.json()

    if (!slug) {
      return Response.json({ error: 'Slug is required' }, { status: 400 })
    }

    // Normalize slug
    const normalizedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    if (normalizedSlug.length < 3) {
      return Response.json({
        available: false,
        reason: 'Slug must be at least 3 characters',
        normalizedSlug
      })
    }

    if (normalizedSlug.length > 50) {
      return Response.json({
        available: false,
        reason: 'Slug must be 50 characters or less',
        normalizedSlug
      })
    }

    // Check reserved slugs
    const reservedSlugs = ['admin', 'api', 'www', 'app', 'dashboard', 'support', 'docs', 'help', 'settings', 'account', 'login', 'signup', 'register', 'pipilot', 'preview']
    if (reservedSlugs.includes(normalizedSlug)) {
      return Response.json({
        available: false,
        reason: 'This slug is reserved',
        normalizedSlug
      })
    }

    // Check if the slug is already in use in the external sites table
    const { data: existingSite } = await externalSupabase
      .from('sites')
      .select('project_slug, project_id')
      .eq('project_slug', normalizedSlug)
      .eq('is_active', true)
      .maybeSingle()

    if (existingSite) {
      // If it's the same project, it's available (reuse)
      if (projectId && existingSite.project_id === projectId) {
        return Response.json({
          available: true,
          reason: 'This is your current project slug',
          normalizedSlug,
          isCurrentProject: true
        })
      }

      return Response.json({
        available: false,
        reason: 'This slug is already taken',
        normalizedSlug
      })
    }

    // Slug is available
    return Response.json({
      available: true,
      normalizedSlug
    })

  } catch (error) {
    console.error('[Check Slug] Error:', error)
    return Response.json({ error: 'Failed to check slug availability' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const projectId = searchParams.get('projectId')

  if (!slug) {
    return Response.json({ error: 'Slug is required' }, { status: 400 })
  }

  // Reuse POST logic
  const fakeRequest = {
    json: async () => ({ slug, projectId })
  } as Request

  return POST(fakeRequest)
}
