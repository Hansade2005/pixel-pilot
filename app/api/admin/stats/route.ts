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

    // Get system statistics
    const [
      { count: totalUsers, error: usersError },
      { data: subscriptions, error: subsError },
      { data: userSettings, error: settingsError }
    ] = await Promise.all([
      // Total users
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      // Subscription data
      supabase
        .from('user_settings')
        .select('subscription_status, subscription_plan, credits_used_this_month'),

      // User settings for revenue calculation
      supabase
        .from('user_settings')
        .select('subscription_plan, credits_used_this_month')
    ])

    if (usersError || subsError || settingsError) {
      console.error('Error fetching admin stats:', { usersError, subsError, settingsError })
      return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 })
    }

    // Calculate statistics
    const activeSubscriptions = subscriptions?.filter(sub =>
      sub.subscription_status === 'active' || sub.subscription_status === 'trialing'
    ).length || 0

    const totalSubscriptions = subscriptions?.length || 0

    // Calculate revenue (simplified - in real app you'd track actual payments)
    const paidUsers = subscriptions?.filter(sub =>
      sub.subscription_plan !== 'free' &&
      (sub.subscription_status === 'active' || sub.subscription_status === 'trialing')
    ) || []

    let totalRevenue = 0
    let monthlyRevenue = 0

    paidUsers.forEach(user => {
      const planMultiplier = user.subscription_plan === 'pro' ? 15 :
                            user.subscription_plan === 'teams' ? 30 :
                            user.subscription_plan === 'enterprise' ? 60 : 0
      totalRevenue += planMultiplier
      monthlyRevenue += planMultiplier
    })

    // Calculate credit usage
    const totalCreditUsage = userSettings?.reduce((sum, user) =>
      sum + (user.credits_used_this_month || 0), 0
    ) || 0

    // System health check (simplified)
    const systemHealth = activeSubscriptions > 0 ? 'healthy' :
                        totalUsers && totalUsers > 0 ? 'warning' : 'critical'

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: Math.floor((totalUsers || 0) * 0.7), // Estimate active users
      totalRevenue,
      monthlyRevenue,
      totalSubscriptions,
      activeSubscriptions,
      creditUsage: totalCreditUsage,
      systemHealth
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error in admin stats API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
