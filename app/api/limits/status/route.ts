import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getLimits } from "@/lib/stripe-config"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !userSettings) {
      // Default to free plan
      const freeLimits = getLimits('free')
      return NextResponse.json({
        plan: 'free',
        canUseVercel: freeLimits.canUseVercel,
        canUseNetlify: freeLimits.canUseNetlify,
        canUseGitHub: freeLimits.canUseGitHub,
        deploymentsThisMonth: 0,
        deploymentsLimit: freeLimits.deploymentsPerMonth,
        githubPushesThisMonth: 0,
        githubPushesLimit: freeLimits.githubPushesPerMonth || 2,
        unlimitedPrompts: freeLimits.unlimitedPrompts,
        status: 'ok'
      })
    }

    const planLimits = getLimits(userSettings.subscription_plan || 'free')

    return NextResponse.json({
      plan: userSettings.subscription_plan || 'free',
      canUseVercel: planLimits.canUseVercel,
      canUseNetlify: planLimits.canUseNetlify,
      canUseGitHub: planLimits.canUseGitHub,
      deploymentsThisMonth: userSettings.deployments_this_month || 0,
      deploymentsLimit: planLimits.deploymentsPerMonth,
      githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
      githubPushesLimit: planLimits.githubPushesPerMonth || 2,
      unlimitedPrompts: planLimits.unlimitedPrompts,
      status: 'ok'
    })

  } catch (error) {
    console.error('Error getting plan status:', error)
    return NextResponse.json(
      { error: 'Failed to get plan status' },
      { status: 500 }
    )
  }
}
