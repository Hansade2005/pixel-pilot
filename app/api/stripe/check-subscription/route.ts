import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe, PLAN_LIMITS } from "@/lib/stripe"

// Helper function to get Stripe instance safely
function getStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }
  return stripe
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
        creditsRemaining: 25,
      })
    }

    // If user has a Stripe subscription ID, check its status
    if (userSettings.stripe_subscription_id) {
      try {
        const stripeInstance = getStripe()
        const subscription = await stripeInstance.subscriptions.retrieve(userSettings.stripe_subscription_id)

        // Update local status based on Stripe subscription
        const status = subscription.status === 'active' ? 'active' :
                      subscription.status === 'canceled' ? 'canceled' :
                      subscription.status === 'past_due' ? 'past_due' :
                      subscription.status === 'trialing' ? 'trialing' : 'inactive'

        // Check if subscription is still active and update if needed
        if (status !== userSettings.subscription_status) {
          await supabase
            .from('user_settings')
            .update({
              subscription_status: status,
              cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('user_id', user.id)
        }

        // Check if we need to reset credits (new billing period)
        const currentPeriodEnd = (subscription as any).current_period_end * 1000
        const lastPayment = new Date(userSettings.last_payment_date || 0).getTime()

        if (currentPeriodEnd > lastPayment) {
          // New billing period, reset credits
          let credits = PLAN_LIMITS.FREE.credits

          if (userSettings.subscription_plan === 'pro') {
            credits = PLAN_LIMITS.PRO.credits
          } else if (userSettings.subscription_plan === 'teams') {
            credits = PLAN_LIMITS.TEAMS.credits
          } else if (userSettings.subscription_plan === 'enterprise') {
            credits = PLAN_LIMITS.ENTERPRISE.credits
          }

          await supabase
            .from('user_settings')
            .update({
              credits_remaining: credits,
              credits_used_this_month: 0,
              last_payment_date: new Date().toISOString(),
            })
            .eq('user_id', user.id)

          userSettings.credits_remaining = credits
        }

        return NextResponse.json({
          plan: userSettings.subscription_plan,
          status: status,
          creditsRemaining: userSettings.credits_remaining,
          subscriptionEndDate: new Date((subscription as any).current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        })

      } catch (stripeError) {
        console.error('Error checking Stripe subscription:', stripeError)
        // If Stripe API fails, return local data
        return NextResponse.json({
          plan: userSettings.subscription_plan,
          status: userSettings.subscription_status,
          creditsRemaining: userSettings.credits_remaining,
        })
      }
    }

    // No Stripe subscription, return free plan
    return NextResponse.json({
      plan: 'free',
      status: 'active',
      creditsRemaining: userSettings.credits_remaining || 25,
    })

  } catch (error) {
    console.error('Error checking subscription:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    )
  }
}
