import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getLimits } from "@/lib/stripe-config"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { operation, platform } = await request.json()

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
        canPerform: operation !== 'deploy' || platform === 'netlify',
        planStatus: {
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
        }
      })
    }

    const planLimits = getLimits(userSettings.subscription_plan || 'free')

    // Check deployment limits if this is a deployment operation
    if (operation === 'deploy') {
      // Check if platform is allowed
      const platformAllowed = platform === 'vercel' ? planLimits.canUseVercel :
                             platform === 'netlify' ? planLimits.canUseNetlify :
                             platform === 'github' ? planLimits.canUseGitHub : false

      if (!platformAllowed) {
        return NextResponse.json({
          canPerform: false,
          reason: `Your ${userSettings.subscription_plan || 'free'} plan does not support deployment to ${platform}. ${platform === 'vercel' ? 'Upgrade to Pro for Vercel access.' : ''}`,
          planStatus: {
            plan: userSettings.subscription_plan || 'free',
            canUseVercel: planLimits.canUseVercel,
            canUseNetlify: planLimits.canUseNetlify,
            canUseGitHub: planLimits.canUseGitHub,
            deploymentsThisMonth: userSettings.deployments_this_month || 0,
            deploymentsLimit: planLimits.deploymentsPerMonth,
            githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
            githubPushesLimit: planLimits.githubPushesPerMonth || 2,
            unlimitedPrompts: planLimits.unlimitedPrompts,
            status: 'upgrade_required'
          }
        })
      }

      // Special check for GitHub pushes
      if (platform === 'github') {
        const githubPushesThisMonth = userSettings.github_pushes_this_month || 0
        const githubPushesLimit = planLimits.githubPushesPerMonth || 2

        if (githubPushesThisMonth >= githubPushesLimit) {
          return NextResponse.json({
            canPerform: false,
            reason: `You have reached your GitHub push limit (${githubPushesLimit} per month). Upgrade to Pro for unlimited GitHub access.`,
            planStatus: {
              plan: userSettings.subscription_plan || 'free',
              canUseVercel: planLimits.canUseVercel,
              canUseNetlify: planLimits.canUseNetlify,
              canUseGitHub: planLimits.canUseGitHub,
              deploymentsThisMonth: userSettings.deployments_this_month || 0,
              deploymentsLimit: planLimits.deploymentsPerMonth,
              githubPushesThisMonth: githubPushesThisMonth,
              githubPushesLimit: githubPushesLimit,
              unlimitedPrompts: planLimits.unlimitedPrompts,
              status: 'github_limit_reached'
            }
          })
        }
      }

      // Check deployment count for non-GitHub platforms
      if (platform !== 'github') {
        const deploymentsThisMonth = userSettings.deployments_this_month || 0
        if (deploymentsThisMonth >= planLimits.deploymentsPerMonth) {
          return NextResponse.json({
            canPerform: false,
            reason: `You have reached your deployment limit (${planLimits.deploymentsPerMonth} per month). Upgrade to Pro for more deployments.`,
            planStatus: {
              plan: userSettings.subscription_plan || 'free',
              canUseVercel: planLimits.canUseVercel,
              canUseNetlify: planLimits.canUseNetlify,
              canUseGitHub: planLimits.canUseGitHub,
              deploymentsThisMonth: deploymentsThisMonth,
              deploymentsLimit: planLimits.deploymentsPerMonth,
              githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
              githubPushesLimit: planLimits.githubPushesPerMonth || 2,
              unlimitedPrompts: planLimits.unlimitedPrompts,
              status: 'deployment_limit_reached'
            }
          })
        }
      }
    }

    return NextResponse.json({
      canPerform: true,
      planStatus: {
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
      }
    })

  } catch (error) {
    console.error('Error checking limits:', error)
    return NextResponse.json(
      { error: 'Failed to check limits' },
      { status: 500 }
    )
  }
}
