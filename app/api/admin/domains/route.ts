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
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') // 'active', 'inactive', or 'all'

    // For now, we'll use the main Supabase client
    // In production, you'd configure a separate client for the hosting database
    const hostingSupabase = externalSupabase

    // Build query
    let query = hostingSupabase
      .from('sites')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if specified
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    const { data: sites, error: sitesError, count } = await query

    if (sitesError) {
      console.error('Error fetching sites:', sitesError)
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }

    // Get recent site views for analytics
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentViews, error: viewsError } = await hostingSupabase
      .from('site_views')
      .select('*')
      .gte('viewed_at', thirtyDaysAgo.toISOString())
      .order('viewed_at', { ascending: false })

    if (viewsError) {
      console.error('Error fetching site views:', viewsError)
    }

    // Calculate analytics
    const totalSites = count || 0
    const activeSites = sites?.filter(site => site.is_active).length || 0
    const totalViews = sites?.reduce((sum, site) => sum + (site.total_views || 0), 0) || 0
    const avgViewsPerSite = totalSites > 0 ? Math.round(totalViews / totalSites) : 0

    // Top performing sites
    const topPerformingSites = sites
      ?.sort((a, b) => (b.total_views || 0) - (a.total_views || 0))
      .slice(0, 10) || []

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentActivity = sites
      ?.filter(site => site.last_viewed_at && new Date(site.last_viewed_at) > sevenDaysAgo)
      .sort((a, b) => new Date(b.last_viewed_at).getTime() - new Date(a.last_viewed_at).getTime())
      .slice(0, 10) || []

    // Device and country breakdown from recent views
    const deviceBreakdown: { [key: string]: number } = {}
    const countryBreakdown: { [key: string]: number } = {}

    recentViews?.forEach(view => {
      // Device breakdown
      const device = view.device_type || 'unknown'
      deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1

      // Country breakdown
      const country = view.country || 'unknown'
      countryBreakdown[country] = (countryBreakdown[country] || 0) + 1
    })

    return NextResponse.json({
      sites: sites || [],
      totalCount: count || 0,
      analytics: {
        totalSites,
        activeSites,
        totalViews,
        avgViewsPerSite,
        topPerformingSites,
        recentActivity,
        deviceBreakdown,
        countryBreakdown
      }
    })

  } catch (error) {
    console.error('Error in domains API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint for site management actions (deactivate, activate, etc.)
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user || !checkAdminAccess(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, siteId } = body

    if (!action || !siteId) {
      return NextResponse.json({ error: 'Missing action or siteId' }, { status: 400 })
    }

    const hostingSupabase = externalSupabase

    switch (action) {
      case 'deactivate':
        const { error: deactivateError } = await hostingSupabase
          .from('sites')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', siteId)

        if (deactivateError) {
          console.error('Error deactivating site:', deactivateError)
          return NextResponse.json({ error: 'Failed to deactivate site' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Site deactivated' })

      case 'activate':
        const { error: activateError } = await hostingSupabase
          .from('sites')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', siteId)

        if (activateError) {
          console.error('Error activating site:', activateError)
          return NextResponse.json({ error: 'Failed to activate site' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Site activated' })

      case 'delete':
        // First delete associated views
        await hostingSupabase
          .from('site_views')
          .delete()
          .eq('site_id', siteId)

        // Then delete the site
        const { error: deleteError } = await hostingSupabase
          .from('sites')
          .delete()
          .eq('id', siteId)

        if (deleteError) {
          console.error('Error deleting site:', deleteError)
          return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Site deleted' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in domains POST API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}