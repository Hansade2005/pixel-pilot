import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe, PLAN_LIMITS } from "@/lib/stripe"
import Stripe from "stripe"

// Helper function to get Stripe instance safely
function getStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }
  return stripe as Stripe
}

// Helper function to check if webhooks are working
async function areWebhooksWorking(): Promise<boolean> {
  const supabase = await createClient()

  try {
    // Check recent webhook activity (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: recentWebhooks, error } = await supabase
      .from('webhook_logs')
      .select('id')
      .gte('processed_at', thirtyMinutesAgo)
      .limit(1)

    if (error) {
      console.warn('Error checking webhook status:', error)
      return false
    }

    return recentWebhooks && recentWebhooks.length > 0
  } catch (error) {
    console.warn('Error checking webhook health:', error)
    return false
  }
}

// Helper function to determine polling frequency
function shouldSkipPolling(userId: string, lastUpdate: Date): boolean {
  const now = Date.now()
  const timeSinceLastUpdate = now - lastUpdate.getTime()

  // Skip polling if updated very recently (webhooks likely working)
  const fiveMinutes = 5 * 60 * 1000
  if (timeSinceLastUpdate < fiveMinutes) {
    console.log(`⏭️ Skipping polling for user ${userId} (updated ${Math.round(timeSinceLastUpdate / 1000)}s ago)`)
    return true
  }

  return false
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({
        plan: 'free',
        status: 'active',
        deploymentsThisMonth: 0,
        githubPushesThisMonth: 0,
      })
    }

    // If user has a Stripe subscription ID, check its status
    if (userSettings.stripe_subscription_id) {
      try {
        // Check if webhooks are working
        const webhooksWorking = await areWebhooksWorking()

        // Check if we should skip polling (if updated recently)
        const lastUpdate = new Date(userSettings.updated_at || userSettings.created_at || 0)
        const shouldSkip = shouldSkipPolling(user.id, lastUpdate)

        let subscription: Stripe.Subscription | undefined
        let status: string

        if (webhooksWorking && shouldSkip) {
          console.log(`🎣 Webhooks active for user ${user.id}, using cached data`)
          status = userSettings.subscription_status
        } else {
          console.log(`🔄 Polling Stripe for user ${user.id} (${webhooksWorking ? 'webhooks may be down' : 'no webhook activity'})`)

          const stripeInstance = getStripe()
          subscription = await stripeInstance.subscriptions.retrieve(userSettings.stripe_subscription_id)

          // Update local status based on Stripe subscription
          status = subscription.status === 'active' ? 'active' :
                   subscription.status === 'canceled' ? 'canceled' :
                   subscription.status === 'past_due' ? 'past_due' :
                   subscription.status === 'trialing' ? 'trialing' : 'inactive'

          // Check if subscription is still active and update if needed
          if (status !== userSettings.subscription_status ||
              subscription.cancel_at_period_end !== userSettings.cancel_at_period_end) {
            await supabase
              .from('user_settings')
              .update({
                subscription_status: status,
                cancel_at_period_end: subscription.cancel_at_period_end,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', user.id)

            console.log(`✅ Updated subscription status for user ${user.id}: ${status}`)
          }
        }

        // Check if we need to reset deployment count (new billing period)
        // Only do this if we actually polled Stripe (not if we skipped polling)
        if (!webhooksWorking || !shouldSkip) {
          if (subscription) {
            const currentPeriodEnd = (subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000
            const lastPayment = new Date(userSettings.last_payment_date || 0).getTime()

            if (currentPeriodEnd > lastPayment) {
              console.log(`🔄 Resetting usage counters for user ${user.id} (new billing period)`)

              // New billing period, reset deployment count and GitHub pushes
              await supabase
                .from('user_settings')
                .update({
                  deployments_this_month: 0,
                  github_pushes_this_month: 0,
                  last_payment_date: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)

              userSettings.deployments_this_month = 0
              userSettings.github_pushes_this_month = 0
            }
          }
        }

        return NextResponse.json({
          plan: userSettings.subscription_plan,
          status: status,
          deploymentsThisMonth: userSettings.deployments_this_month || 0,
          githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
          subscriptionEndDate: subscription 
            ? new Date((subscription as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString() 
            : undefined,
          cancelAtPeriodEnd: subscription?.cancel_at_period_end,
        })

      } catch (stripeError) {
        console.error('Error checking Stripe subscription:', stripeError)
        // If Stripe API fails, return local data
        return NextResponse.json({
          plan: userSettings.subscription_plan,
          status: userSettings.subscription_status,
          deploymentsThisMonth: userSettings.deployments_this_month || 0,
          githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
        })
      }
    }

    // No Stripe subscription, return free plan
    return NextResponse.json({
      plan: 'free',
      status: 'active',
      deploymentsThisMonth: userSettings.deployments_this_month || 0,
      githubPushesThisMonth: userSettings.github_pushes_this_month || 0,
    })

  } catch (error) {
    console.error('Error checking subscription:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    )
  }
}
