import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAccess } from '@/lib/admin-utils'
import { createClient as createExternalClient } from '@supabase/supabase-js'

// External Supabase configuration for domain tracking (same as preview route)
const EXTERNAL_SUPABASE_CONFIG = {
  URL: 'https://dlunpilhklsgvkegnnlp.supabase.co',
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsdW5waWxoa2xzZ3ZrZWdubmxwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1MDQxOSwiZXhwIjoyMDcwNjI2NDE5fQ.k-2OJ4p3hr9feR4ks54OQM2HhOhaVJ3pUK-20tGJwpo'
}

// Create external Supabase client for domain tracking
const externalSupabase = createExternalClient(
  EXTERNAL_SUPABASE_CONFIG.URL,
  EXTERNAL_SUPABASE_CONFIG.SERVICE_ROLE_KEY
)

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user || !checkAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '1000')
    const siteId = searchParams.get('siteId')
    const days = parseInt(searchParams.get('days') || '30')

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Build query
    let query = externalSupabase
      .from('site_views')
      .select('*')
      .gte('viewed_at', startDate.toISOString())
      .order('viewed_at', { ascending: false })
      .limit(limit)

    // Filter by site if specified
    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data: views, error: viewsError } = await query

    if (viewsError) {
      console.error('Error fetching site views:', viewsError)
      return NextResponse.json({ error: 'Failed to fetch site views' }, { status: 500 })
    }

    return NextResponse.json({
      views: views || [],
      totalCount: views?.length || 0
    })

  } catch (error) {
    console.error('Error in views API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}