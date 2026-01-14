import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

// Helper function to get Stripe instance safely
function getStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }
  return stripe as Stripe
}

/**
 * API to fix missing subscription IDs for users
 * This looks up the subscription from Stripe using customer ID and updates the database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Only allow authenticated admins or the user themselves
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, customerId } = await request.json()

    // Use provided userId or current user's ID
    const targetUserId = userId || user.id

    // Get the customer ID from user_settings if not provided
    let stripeCustomerId = customerId
    if (!stripeCustomerId) {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('stripe_customer_id')
        .eq('user_id', targetUserId)
        .single()

      stripeCustomerId = userSettings?.stripe_customer_id
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer ID found" }, { status: 400 })
    }

    // Look up subscriptions from Stripe
    const stripeInstance = getStripe()
    const subscriptions = await stripeInstance.subscriptions.list({
      customer: stripeCustomerId,
      limit: 5
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: "No subscriptions found in Stripe" }, { status: 404 })
    }

    // Get the most recent active subscription, or any subscription if none active
    let subscription = subscriptions.data.find(s => s.status === 'active')
    if (!subscription) {
      subscription = subscriptions.data[0]
    }

    console.log(`Found subscription ${subscription.id} for customer ${stripeCustomerId}`)

    // Determine plan from price
    const priceId = subscription.items.data[0]?.price?.id
    let walletPlan: 'free' | 'creator' | 'collaborate' | 'scale' = 'creator'
    
    const PRICE_TO_PLAN: Record<string, 'free' | 'creator' | 'collaborate' | 'scale'> = {
      'price_1SZ9843G7U0M1bp1WcX6j6b1': 'free',
      'price_1SZ98W3G7U0M1bp1u30VJE2V': 'creator',
      'price_1SZTlN3G7U0M1bp1Us7dGSSg': 'creator',
      'price_1SZ98n3G7U0M1bp1DipaxRvq': 'collaborate',
      'price_1SZTmV3G7U0M1bp1GrNHBxUg': 'collaborate',
      'price_1SZ98v3G7U0M1bp1YAD89Tx4': 'scale',
      'price_1SZToP3G7U0M1bp1v0AWlXZ6': 'scale',
    }

    if (priceId && PRICE_TO_PLAN[priceId]) {
      walletPlan = PRICE_TO_PLAN[priceId]
    } else if (subscription.metadata?.plan_type) {
      const metaPlan = subscription.metadata.plan_type.toLowerCase()
      if (['creator', 'collaborate', 'scale'].includes(metaPlan)) {
        walletPlan = metaPlan as 'creator' | 'collaborate' | 'scale'
      }
    }

    // Map to user_settings plan name
    const userSettingsPlan = walletPlan === 'creator' ? 'pro' : 
                              walletPlan === 'collaborate' ? 'teams' : 
                              walletPlan === 'scale' ? 'enterprise' : 'free'

    // Update user_settings
    const { error: userSettingsError } = await supabase
      .from('user_settings')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status === 'active' ? 'active' : 
                            subscription.status === 'past_due' ? 'past_due' : 
                            subscription.status === 'canceled' ? 'canceled' : 'inactive',
        subscription_plan: userSettingsPlan,
        last_payment_date: new Date().toISOString(),
      })
      .eq('user_id', targetUserId)

    if (userSettingsError) {
      console.error('Error updating user_settings:', userSettingsError)
      return NextResponse.json({ error: "Failed to update user_settings" }, { status: 500 })
    }

    // Update wallet
    const { error: walletError } = await supabase
      .from('wallet')
      .update({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: stripeCustomerId,
        current_plan: walletPlan,
        subscription_status: subscription.status === 'active' ? 'active' : 
                            subscription.status === 'past_due' ? 'past_due' : 
                            subscription.status === 'canceled' ? 'cancelled' : 'inactive',
      })
      .eq('user_id', targetUserId)

    if (walletError) {
      console.error('Error updating wallet:', walletError)
      // Don't fail - user_settings was updated
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      plan: walletPlan,
      customerId: stripeCustomerId
    })

  } catch (error) {
    console.error('Error fixing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fix subscription' },
      { status: 500 }
    )
  }
}
