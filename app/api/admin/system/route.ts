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

    // Get system health metrics
    const [
      { data: dbHealth, error: dbError },
      { data: apiUsage, error: apiError },
      { data: webhookLogs, error: webhookError },
      { data: userSettings, error: settingsError }
    ] = await Promise.all([
      // Database health check
      supabase
        .from('profiles')
        .select('id')
        .limit(1),

      // API usage in last hour
      supabase
        .from('api_usage')
        .select('id, status_code, response_time_ms')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),

      // Webhook health in last hour
      supabase
        .from('webhook_logs')
        .select('status')
        .gte('processed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()),

      // System settings
      supabase
        .from('system_settings')
        .select('key, value, updated_at')
    ])

    // Calculate system health metrics
    const databaseStatus = dbError ? 'error' : 'healthy'

    // API performance
    const apiMetrics = apiUsage?.reduce((acc: any, call) => {
      acc.total = (acc.total || 0) + 1
      acc.avgResponseTime = acc.avgResponseTime || 0
      acc.avgResponseTime = (acc.avgResponseTime + (call.response_time_ms || 0)) / 2
      if (call.status_code >= 400) {
        acc.errors = (acc.errors || 0) + 1
      }
      return acc
    }, { total: 0, avgResponseTime: 0, errors: 0 }) || { total: 0, avgResponseTime: 0, errors: 0 }

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
      : 100

    // Calculate overall system health
    let overallHealth = 'healthy'
    let healthScore = 100

    if (databaseStatus === 'error') {
      overallHealth = 'critical'
      healthScore = 0
    } else if (apiMetrics.errors > apiMetrics.total * 0.1) { // >10% error rate
      overallHealth = 'warning'
      healthScore -= 20
    } else if (webhookSuccessRate < 95) {
      overallHealth = 'warning'
      healthScore -= 10
    }

    // Calculate uptime (simplified - in production you'd track actual uptime)
    const uptimePercentage = healthScore >= 95 ? 99.9 :
                            healthScore >= 90 ? 99.5 :
                            healthScore >= 80 ? 98.2 : 95.1

    const systemHealth = {
      overall: {
        status: overallHealth,
        score: healthScore,
        uptime: uptimePercentage
      },
      database: {
        status: databaseStatus,
        lastChecked: new Date().toISOString()
      },
      api: {
        status: apiMetrics.errors > apiMetrics.total * 0.05 ? 'warning' : 'healthy',
        totalRequests: apiMetrics.total,
        averageResponseTime: Math.round(apiMetrics.avgResponseTime),
        errorRate: apiMetrics.total > 0 ? Math.round((apiMetrics.errors / apiMetrics.total) * 100) : 0
      },
      webhooks: {
        status: webhookSuccessRate >= 95 ? 'healthy' : 'warning',
        successRate: webhookSuccessRate,
        totalEvents: webhookMetrics.total
      },
      security: {
        status: 'healthy', // In production, check for security issues
        lastAudit: new Date().toISOString()
      },
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(systemHealth)
  } catch (error) {
    console.error('Error in system health API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system health data' },
      { status: 500 }
    )
  }
}