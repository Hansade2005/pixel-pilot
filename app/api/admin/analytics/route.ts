import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from "@/lib/admin-utils"

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

    // Get detailed analytics data
    const [
      { data: userGrowth, error: growthError },
      { data: usageStats, error: usageError },
      { data: engagementScores, error: engagementError },
      { data: apiUsage, error: apiError },
      { data: webhookLogs, error: webhookError }
    ] = await Promise.all([
      // User growth over time (last 30 days)
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at'),

      // Usage statistics
      supabase
        .from('usage_records')
        .select('operation, platform, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // User engagement scores
      supabase
        .from('user_engagement_scores')
        .select('overall_score, activity_score, notification_interaction_score, project_completion_score'),

      // API usage stats
      supabase
        .from('api_usage')
        .select('endpoint, method, status_code, response_time_ms, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

      // Webhook activity
      supabase
        .from('webhook_logs')
        .select('event_type, status, processed_at')
        .gte('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ])

    if (growthError || usageError || engagementError || apiError || webhookError) {
      console.error('Error fetching analytics data:', {
        growthError, usageError, engagementError, apiError, webhookError
      })
    }

    // Process user growth data
    const userGrowthByDay = userGrowth?.reduce((acc: any, user) => {
      const date = new Date(user.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {}) || {}

    // Process usage statistics
    const usageByOperation = usageStats?.reduce((acc: any, record) => {
      acc[record.operation] = (acc[record.operation] || 0) + 1
      return acc
    }, {}) || {}

    // Calculate average engagement score
    const avgEngagementScore = engagementScores?.length
      ? Math.round(engagementScores.reduce((sum, score) => sum + score.overall_score, 0) / engagementScores.length)
      : 0

    // API performance metrics
    const apiMetrics = apiUsage?.reduce((acc: any, call) => {
      acc.totalCalls = (acc.totalCalls || 0) + 1
      acc.avgResponseTime = acc.avgResponseTime || 0
      acc.avgResponseTime = (acc.avgResponseTime + (call.response_time_ms || 0)) / 2
      if (call.status_code >= 400) {
        acc.errors = (acc.errors || 0) + 1
      }
      return acc
    }, { totalCalls: 0, avgResponseTime: 0, errors: 0 }) || { totalCalls: 0, avgResponseTime: 0, errors: 0 }

    // Webhook success rate
    const webhookMetrics = webhookLogs?.reduce((acc: any, log) => {
      acc.total = (acc.total || 0) + 1
      if (log.status === 'success') {
        acc.success = (acc.success || 0) + 1
      }
      return acc
    }, { total: 0, success: 0 }) || { total: 0, success: 0 }

    const webhookSuccessRate = webhookMetrics.total > 0
      ? Math.round((webhookMetrics.success / webhookMetrics.total) * 100)
      : 0

    const analytics = {
      userGrowth: {
        daily: userGrowthByDay,
        totalNewUsers: userGrowth?.length || 0
      },
      usage: {
        byOperation: usageByOperation,
        totalOperations: usageStats?.length || 0
      },
      engagement: {
        averageScore: avgEngagementScore,
        totalScoredUsers: engagementScores?.length || 0
      },
      api: {
        totalCalls: apiMetrics.totalCalls,
        averageResponseTime: Math.round(apiMetrics.avgResponseTime),
        errorRate: apiMetrics.totalCalls > 0 ? Math.round((apiMetrics.errors / apiMetrics.totalCalls) * 100) : 0
      },
      webhooks: {
        totalEvents: webhookMetrics.total,
        successRate: webhookSuccessRate
      },
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error in analytics API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}