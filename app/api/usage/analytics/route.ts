import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ).auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Run all queries in parallel
    const [
      walletResult,
      usageLogsResult,
      transactionsResult,
      dailyUsageResult,
    ] = await Promise.all([
      // Wallet balance & plan info
      supabase
        .from('wallet')
        .select('credits_balance, credits_used_this_month, credits_used_total, requests_this_month, current_plan, subscription_status, last_reset_date, created_at')
        .eq('user_id', userId)
        .single(),

      // Usage logs for the period
      supabase
        .from('usage_logs')
        .select('model, credits_used, tokens_used, prompt_tokens, completion_tokens, steps_count, response_time_ms, status, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      // Credit transactions for the period
      supabase
        .from('transactions')
        .select('amount, type, description, credits_before, credits_after, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false }),

      // Daily aggregated usage (last N days)
      supabase
        .from('usage_logs')
        .select('credits_used, created_at, model')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }),
    ])

    // Process wallet data
    const wallet = walletResult.data || {
      credits_balance: 0,
      credits_used_this_month: 0,
      credits_used_total: 0,
      requests_this_month: 0,
      current_plan: 'free',
      subscription_status: 'inactive',
      last_reset_date: null,
      created_at: new Date().toISOString(),
    }

    // Process usage logs
    const logs = usageLogsResult.data || []
    const totalCreditsUsed = logs.reduce((sum: number, l: any) => sum + parseFloat(l.credits_used || '0'), 0)
    const totalRequests = logs.length
    const avgCreditsPerRequest = totalRequests > 0 ? Math.round((totalCreditsUsed / totalRequests) * 10) / 10 : 0
    const totalTokens = logs.reduce((sum: number, l: any) => sum + (l.tokens_used || 0), 0)
    const avgResponseTime = totalRequests > 0
      ? Math.round(logs.reduce((sum: number, l: any) => sum + (l.response_time_ms || 0), 0) / totalRequests)
      : 0
    const successRate = totalRequests > 0
      ? Math.round((logs.filter((l: any) => l.status === 'success').length / totalRequests) * 100)
      : 100

    // Model breakdown
    const modelBreakdown: Record<string, { credits: number; requests: number; tokens: number }> = {}
    logs.forEach((log: any) => {
      const model = log.model || 'unknown'
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = { credits: 0, requests: 0, tokens: 0 }
      }
      modelBreakdown[model].credits += parseFloat(log.credits_used || '0')
      modelBreakdown[model].requests += 1
      modelBreakdown[model].tokens += (log.tokens_used || 0)
    })

    // Sort by credits descending
    const modelBreakdownSorted = Object.entries(modelBreakdown)
      .sort(([, a], [, b]) => b.credits - a.credits)
      .map(([model, data]) => ({
        model,
        credits: Math.round(data.credits * 10) / 10,
        requests: data.requests,
        tokens: data.tokens,
        percentage: totalCreditsUsed > 0 ? Math.round((data.credits / totalCreditsUsed) * 100) : 0,
      }))

    // Daily usage aggregation
    const dailyMap: Record<string, { credits: number; requests: number }> = {}
    const dailyLogs = dailyUsageResult.data || []
    dailyLogs.forEach((log: any) => {
      const day = log.created_at.split('T')[0]
      if (!dailyMap[day]) {
        dailyMap[day] = { credits: 0, requests: 0 }
      }
      dailyMap[day].credits += parseFloat(log.credits_used || '0')
      dailyMap[day].requests += 1
    })

    // Fill in missing days
    const dailyUsage: Array<{ date: string; credits: number; requests: number }> = []
    const cursor = new Date(startDate)
    const today = new Date()
    while (cursor <= today) {
      const dateStr = cursor.toISOString().split('T')[0]
      dailyUsage.push({
        date: dateStr,
        credits: Math.round((dailyMap[dateStr]?.credits || 0) * 10) / 10,
        requests: dailyMap[dateStr]?.requests || 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    // Projected monthly spend
    const daysInPeriod = parseInt(period)
    const dailyAvgCredits = totalCreditsUsed / Math.max(daysInPeriod, 1)
    const projectedMonthlyCredits = Math.round(dailyAvgCredits * 30)
    const projectedMonthlyCost = Math.round(projectedMonthlyCredits * 0.01 * 100) / 100

    // Peak usage hours
    const hourlyMap: Record<number, number> = {}
    logs.forEach((log: any) => {
      const hour = new Date(log.created_at).getHours()
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1
    })
    const peakHour = Object.entries(hourlyMap).sort(([, a], [, b]) => b - a)[0]

    // Transaction summary
    const transactions = transactionsResult.data || []
    const creditsAdded = transactions
      .filter((t: any) => parseFloat(t.amount) > 0)
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
    const creditsSpent = Math.abs(
      transactions
        .filter((t: any) => parseFloat(t.amount) < 0)
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0)
    )

    return NextResponse.json({
      wallet: {
        balance: parseFloat(wallet.credits_balance?.toString() || '0'),
        usedThisMonth: parseFloat(wallet.credits_used_this_month?.toString() || '0'),
        usedTotal: parseFloat(wallet.credits_used_total?.toString() || '0'),
        requestsThisMonth: wallet.requests_this_month || 0,
        plan: wallet.current_plan,
        subscriptionStatus: wallet.subscription_status,
        lastResetDate: wallet.last_reset_date,
        memberSince: wallet.created_at,
      },
      usage: {
        totalCreditsUsed: Math.round(totalCreditsUsed * 10) / 10,
        totalRequests,
        avgCreditsPerRequest,
        totalTokens,
        avgResponseTime,
        successRate,
      },
      modelBreakdown: modelBreakdownSorted,
      dailyUsage,
      projections: {
        dailyAvgCredits: Math.round(dailyAvgCredits * 10) / 10,
        projectedMonthlyCredits,
        projectedMonthlyCost,
      },
      peakUsage: {
        hour: peakHour ? parseInt(peakHour[0]) : null,
        requests: peakHour ? peakHour[1] : 0,
      },
      transactions: {
        creditsAdded: Math.round(creditsAdded * 10) / 10,
        creditsSpent: Math.round(creditsSpent * 10) / 10,
        recentTransactions: transactions.slice(0, 20).map((t: any) => ({
          amount: parseFloat(t.amount),
          type: t.type,
          description: t.description,
          creditsBefore: parseFloat(t.credits_before || '0'),
          creditsAfter: parseFloat(t.credits_after || '0'),
          date: t.created_at,
        })),
      },
      period: parseInt(period),
    })
  } catch (error) {
    console.error('[UsageAnalytics] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
