import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Helper function to check admin access
function checkAdminAccess(user: any): boolean {
  // Check if user has admin role or specific email
  return user?.email?.endsWith('@yourdomain.com') ||
         user?.user_metadata?.role === 'admin' ||
         user?.email === 'admin@pipilot.dev'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get webhook statistics
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Get recent webhook activity
    const [
      { data: lastHour, error: hourError },
      { data: lastDay, error: dayError },
      { data: lastWeek, error: weekError },
      { data: failedWebhooks, error: failedError },
      { data: recentEvents, error: recentError }
    ] = await Promise.all([
      // Last hour activity
      supabase
        .from('webhook_logs')
        .select('id', { count: 'exact' })
        .gte('processed_at', oneHourAgo),

      // Last 24 hours activity
      supabase
        .from('webhook_logs')
        .select('id', { count: 'exact' })
        .gte('processed_at', oneDayAgo),

      // Last 7 days activity
      supabase
        .from('webhook_logs')
        .select('id', { count: 'exact' })
        .gte('processed_at', sevenDaysAgo),

      // Failed webhooks
      supabase
        .from('webhook_logs')
        .select('id', { count: 'exact' })
        .eq('status', 'failed')
        .gte('processed_at', sevenDaysAgo),

      // Recent webhook events
      supabase
        .from('webhook_logs')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(10)
    ])

    if (hourError || dayError || weekError || failedError || recentError) {
      console.error('Error fetching webhook stats:', {
        hourError, dayError, weekError, failedError, recentError
      })
      return NextResponse.json({ error: "Failed to fetch webhook statistics" }, { status: 500 })
    }

    // Calculate webhook health metrics
    const totalWebhooks = lastWeek?.length || 0
    const failedCount = failedWebhooks?.length || 0
    const successRate = totalWebhooks > 0 ? ((totalWebhooks - failedCount) / totalWebhooks) * 100 : 0

    // Determine webhook health status
    let healthStatus = 'unknown'
    if (lastHour && lastHour.length > 0) {
      healthStatus = successRate > 95 ? 'healthy' : successRate > 80 ? 'warning' : 'critical'
    } else if (lastDay && lastDay.length > 0) {
      healthStatus = 'warning' // No recent activity but some in last 24h
    } else {
      healthStatus = 'critical' // No recent activity
    }

    const webhookStatus = {
      health: {
        status: healthStatus,
        successRate: Math.round(successRate * 100) / 100,
        lastActivity: recentEvents?.[0]?.processed_at || null
      },
      statistics: {
        lastHour: lastHour?.length || 0,
        last24Hours: lastDay?.length || 0,
        last7Days: lastWeek?.length || 0,
        failedWebhooks: failedCount
      },
      recentEvents: recentEvents?.map(event => ({
        id: event.id,
        eventType: event.event_type,
        eventId: event.event_id,
        userId: event.user_id,
        status: event.status,
        error: event.error,
        processedAt: event.processed_at
      })) || []
    }

    return NextResponse.json(webhookStatus)

  } catch (error) {
    console.error('Webhook status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook status' },
      { status: 500 }
    )
  }
}
