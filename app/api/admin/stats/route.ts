import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkAdminAccess } from "@/lib/admin-utils"

async function isSubscriptionSystemEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: setting, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'subscription_system_enabled')
      .single()

    if (error || !setting) {
      return true // Default to enabled if no setting exists
    }

    return setting.value?.enabled === true
  } catch (error) {
    console.error('Error checking subscription system status:', error)
    return true // Default to enabled on error
  }
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
        .select('subscription_status, subscription_plan, deployments_this_month'),

      // User settings for revenue calculation
      supabase
        .from('user_settings')
        .select('subscription_plan, deployments_this_month, github_pushes_this_month')
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

    // Check if subscription system is enabled
    const subscriptionEnabled = await isSubscriptionSystemEnabled()

    // Calculate revenue (simplified - in real app you'd track actual payments)
    let totalRevenue = 0
    let monthlyRevenue = 0

    if (subscriptionEnabled) {
      const paidUsers = subscriptions?.filter(sub =>
        sub.subscription_plan !== 'free' &&
        (sub.subscription_status === 'active' || sub.subscription_status === 'trialing')
      ) || []

      paidUsers.forEach(user => {
        const planMultiplier = user.subscription_plan === 'pro' ? 29 :
                              user.subscription_plan === 'teams' ? 30 :
                              user.subscription_plan === 'enterprise' ? 60 : 0
        totalRevenue += planMultiplier
        monthlyRevenue += planMultiplier
      })
    } else {
      // In free mode, revenue is $0
      totalRevenue = 0
      monthlyRevenue = 0
    }

    // Calculate usage metrics
    const totalDeployments = userSettings?.reduce((sum, user) =>
      sum + (user.deployments_this_month || 0), 0
    ) || 0

    const totalGitHubPushes = userSettings?.reduce((sum, user) =>
      sum + (user.github_pushes_this_month || 0), 0
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
      deploymentCount: totalDeployments,
      githubPushCount: totalGitHubPushes,
      systemHealth,
      subscriptionSystemEnabled: subscriptionEnabled
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
